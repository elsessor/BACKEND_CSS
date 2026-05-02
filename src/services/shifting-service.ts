import { env } from "../config/env.js";
import { io } from "../server.js";
import type {
  ApplicationStatus,
  AuditLogEntry,
  EligibilityCheckInput,
  ReviewDecisionInput,
  ShiftApplication,
  ShiftApplicationInput,
  UserRole
} from "../domain/models.js";
import { AppError, DependencyError } from "../errors/app-error.js";
import type { SubsystemClients } from "../integrations/subsystem-clients.js";
import type { ApplicationRepository } from "../repositories/application-repository.js";
import type { AuditRepository } from "../repositories/audit-repository.js";
import { createApplicationId, createAuditId } from "../utils/ids.js";
import { hoursBetween, nowIso } from "../utils/time.js";
import { EquivalencyService } from "./equivalency-service.js";

const ACTIVE_APPLICATION_STATUSES: ApplicationStatus[] = [
  "pending",
  "under_review",
  "waitlisted",
  "awaiting_data",
  "pending_cms_update"
];

export class ShiftingService {
  constructor(
    private readonly applications: ApplicationRepository,
    private readonly audits: AuditRepository,
    private readonly subsystems: SubsystemClients,
    private readonly equivalencyService: EquivalencyService
  ) {}

  async submitApplication(input: ShiftApplicationInput, actorId: string) {
    const currentCount = await this.applications.countSubmittedThisSemester(input.student_id);
    if (currentCount >= env.maxApplicationsPerSemester) {
      throw new AppError(429, "RATE_LIMIT_EXCEEDED", "Submission blocked: maximum application attempts reached for the semester.", {
        max_allowed: env.maxApplicationsPerSemester
      });
    }

    const existing = await this.applications.getByStudentAndTarget(input.student_id, input.target_program);
    const active = existing.find((application) => ACTIVE_APPLICATION_STATUSES.includes(application.status));
    if (active) {
      throw new AppError(409, "DUPLICATE_APPLICATION", "A shifting application is already active for this student and target program.", {
        existing_application_id: active.application_id,
        current_status: active.status,
        submitted_at: active.submitted_at,
        action: "Please wait for the existing application to be resolved before reapplying."
      });
    }

    const application = this.createBaseApplication(input);

    let profile;
    let alerts;
    let slots;
    let curriculum;
    let finance;

    // After successful creation, emit event
    // (actual DB write is likely in repository, but we emit here after logic)
    setTimeout(() => {
      io.emit("applications_updated");
    }, 0);


    try {
      [profile, alerts, slots, curriculum, finance] = await Promise.all([
        this.subsystems.getStudentAcademicProfile(input.student_id),
        this.subsystems.getAcademicAlerts(input.student_id),
        this.subsystems.getProgramSlots(input.target_program),
        this.subsystems.getCurriculum(input.target_program),
        this.subsystems.getFinancialHold(input.student_id)
      ]);
    } catch (error) {
      if (error instanceof DependencyError) {
        application.status = "awaiting_data";
        await this.applications.create(application);
        await this.log(application.application_id, actorId, "student", "APPLICATION_QUEUED_DEPENDENCY_FAILURE", {
          failed_dependency: error.dependency,
          endpoint_attempted: error.endpoint,
          retry_attempts: 3
        });
        await this.subsystems.notifyAdministrator({
          application_id: application.application_id,
          failed_dependency: error.dependency,
          endpoint_attempted: error.endpoint
        });

        throw new AppError(503, "DEPENDENCY_UNAVAILABLE", "CSS could not retrieve required data. Application saved and queued for retry.", {
          failed_dependency: error.dependency,
          endpoint_attempted: error.endpoint,
          retry_attempts: 3,
          retry_strategy: "exponential_backoff",
          application_status: application.status,
          application_id: application.application_id,
          admin_notified: true
        });
      }

      throw error;
    }

    application.gwa = profile.gwa;
    application.units_completed = profile.units_completed;
    application.has_failing_major = profile.subjects.some(
      (subject) => subject.category === "major" && (subject.grade === 5 || subject.grade === "INC")
    );
    application.has_financial_hold = finance.has_financial_hold;
    application.has_academic_alert = alerts.has_alert;
    application.slot_available = slots.slot_available;

    if (finance.has_financial_hold) {
      await this.log(application.application_id, actorId, "student", "APPLICATION_BLOCKED_FINANCIAL_HOLD", {
        hold_type: finance.hold_type ?? "UNPAID_BALANCE"
      });
      throw new AppError(403, "FINANCIAL_HOLD_ACTIVE", "Application blocked: student has an outstanding financial balance.", {
        hold_type: finance.hold_type ?? "UNPAID_BALANCE",
        action_required: "Please settle your outstanding balance through the Finance Wallet before reapplying.",
        finance_wallet_url: finance.finance_wallet_url,
        reapplication_allowed: true,
        note: "Application may be resubmitted after financial clearance is confirmed."
      });
    }

    if (!curriculum.length) {
      application.status = "pending_cms_update";
      await this.applications.create(application);
      await this.log(application.application_id, actorId, "student", "APPLICATION_PAUSED_MISSING_CURRICULUM", {
        target_program: input.target_program
      });
      await this.subsystems.notifyAdministrator({
        application_id: application.application_id,
        target_program: input.target_program,
        action_required: "Add or update curriculum map in CMS."
      });

      throw new AppError(404, "CURRICULUM_MAP_NOT_FOUND", "Equivalency mapping paused: curriculum map for the target program was not found in CMS.", {
        target_program: input.target_program,
        cms_endpoint: `GET /api/cms/curriculum/${input.target_program}`,
        application_status: application.status,
        application_id: application.application_id,
        admin_notified: true,
        action_required: `Administrator must add or update the ${input.target_program} curriculum map in CMS before processing can continue.`
      });
    }

    if (alerts.has_alert) {
      application.status = "rejected";
      application.rejection_reason_code = "ACADEMIC_ALERT_ACTIVE";
      await this.applications.create(application);
      await this.log(application.application_id, actorId, "student", "APPLICATION_REJECTED_ALERT", {
        alerts: alerts.alerts
      });
      await this.subsystems.sendDecisionNotice(application);
      throw new AppError(422, "ELIGIBILITY_FAILED", "Application auto-rejected: active academic alerts prevent shifting.", {
        rule_violated: "ACADEMIC_ALERT_ACTIVE",
        alerts: alerts.alerts,
        action_taken: "Application status set to rejected. Rejection notice sent via U-ANAS."
      });
    }

    if (profile.gwa > env.minimumGwa) {
      application.status = "rejected";
      application.rejection_reason_code = "GWA_BELOW_MINIMUM";
      await this.applications.create(application);
      await this.log(application.application_id, actorId, "student", "APPLICATION_REJECTED_GWA", {
        student_gwa: profile.gwa,
        minimum_required_gwa: env.minimumGwa
      });
      await this.subsystems.sendDecisionNotice(application);
      throw new AppError(422, "ELIGIBILITY_FAILED", "Application auto-rejected: GWA does not meet the minimum requirement.", {
        rule_violated: "GWA_BELOW_MINIMUM",
        student_gwa: profile.gwa,
        minimum_required_gwa: env.minimumGwa,
        action_taken: "Application status set to rejected. Rejection notice sent via U-ANAS.",
        reapplication_note: "Student may reapply once GWA meets the minimum threshold."
      });
    }

    if (application.has_failing_major) {
      application.status = "rejected";
      application.rejection_reason_code = "FAILING_MAJOR_SUBJECT";
      await this.applications.create(application);
      const failingSubjects = profile.subjects.filter(
        (subject) => subject.category === "major" && (subject.grade === 5 || subject.grade === "INC")
      );
      await this.log(application.application_id, actorId, "student", "APPLICATION_REJECTED_FAILING_MAJOR", {
        failing_subjects: failingSubjects
      });
      await this.subsystems.sendDecisionNotice(application);
      throw new AppError(422, "ELIGIBILITY_FAILED", "Application auto-rejected: failing grade in one or more major subjects.", {
        rule_violated: "FAILING_MAJOR_SUBJECT",
        failing_subjects: failingSubjects,
        action_taken: "Application status set to rejected. Rejection notice with subject details sent via U-ANAS."
      });
    }

    const equivalency = this.equivalencyService.generate(application, profile, curriculum);
    await this.applications.saveEquivalency(equivalency);

    if (!slots.slot_available) {
      application.status = "waitlisted";
      application.waitlist_position = (await this.applications.list({ targetProgram: input.target_program, status: "waitlisted" })).length + 1;
      await this.applications.create(application);
      await this.log(application.application_id, actorId, "student", "APPLICATION_WAITLISTED", {
        target_program: input.target_program,
        waitlist_position: application.waitlist_position
      });
      await this.subsystems.sendWaitlistNotice(application);
      throw new AppError(200, "NO_SLOTS_AVAILABLE", "Application accepted but placed on the waitlist: no slots currently available in the target program.", {
        application_id: application.application_id,
        application_status: application.status,
        target_program: input.target_program,
        current_slots_available: slots.available_slots,
        waitlist_position: application.waitlist_position,
        auto_advance: true,
        note: "You will be notified automatically via U-ANAS when a slot becomes available."
      });
    }

    application.status = "under_review";
    await this.applications.create(application);
    await this.log(application.application_id, actorId, "student", "APPLICATION_SUBMITTED", {
      status: application.status
    });

    return {
      application,
      equivalency
    };
  }

  async checkEligibility(input: EligibilityCheckInput) {
    try {
      const [profile, alerts, slots, curriculum, finance] = await Promise.all([
        this.subsystems.getStudentAcademicProfile(input.student_id),
        this.subsystems.getAcademicAlerts(input.student_id),
        this.subsystems.getProgramSlots(input.target_program),
        this.subsystems.getCurriculum(input.target_program),
        this.subsystems.getFinancialHold(input.student_id)
      ]);

      const failingMajorSubjects = profile.subjects.filter(
        (subject) => subject.category === "major" && (subject.grade === 5 || subject.grade === "INC")
      );

      return {
        student_id: input.student_id,
        current_program: input.current_program,
        target_program: input.target_program,
        checks: {
          minimum_gwa_required: env.minimumGwa,
          student_gwa: profile.gwa,
          gwa_eligible: profile.gwa <= env.minimumGwa,
          no_failing_major: failingMajorSubjects.length === 0,
          no_financial_hold: !finance.has_financial_hold,
          no_academic_alert: !alerts.has_alert,
          slot_available: slots.slot_available,
          available_slots: slots.available_slots,
          curriculum_found: curriculum.length > 0
        },
        failing_subjects: failingMajorSubjects,
        alerts: alerts.alerts,
        hold_type: finance.hold_type ?? null,
        overall_eligible:
          profile.gwa <= env.minimumGwa &&
          failingMajorSubjects.length === 0 &&
          !finance.has_financial_hold &&
          !alerts.has_alert &&
          curriculum.length > 0
      };
    } catch (error) {
      if (error instanceof DependencyError) {
        throw new AppError(503, "DEPENDENCY_UNAVAILABLE", "CSS could not retrieve required data for eligibility checking.", {
          failed_dependency: error.dependency,
          endpoint_attempted: error.endpoint
        });
      }

      throw error;
    }
  }

  async getAuditLogs(applicationId: string) {
    await this.getApplication(applicationId);
    return this.audits.listByApplication(applicationId);
  }

  async getAllAuditLogs() {
    return this.audits.listAll();
  }

  async getApplication(applicationId: string) {
    const application = await this.applications.getById(applicationId);
    if (!application) {
      throw new AppError(404, "APPLICATION_NOT_FOUND", "The requested shifting application does not exist.");
    }
    return application;
  }

  async listApplications(filters?: { studentId?: string; status?: string; targetProgram?: string }) {
    return this.applications.list(filters);
  }

  async getEquivalency(applicationId: string) {
    const record = await this.applications.getEquivalency(applicationId);
    if (!record) {
      throw new AppError(404, "EQUIVALENCY_NOT_FOUND", "No equivalency record was found for this application.");
    }
    return record;
  }

  async reviewApplication(applicationId: string, review: ReviewDecisionInput, actorId: string, actorRole: UserRole) {
    const application = await this.getApplication(applicationId);

    if (!["under_review", "pending"].includes(application.status)) {
      throw new AppError(409, "INVALID_APPLICATION_STATE", "Application cannot be reviewed in its current state.", {
        current_status: application.status
      });
    }

    application.status = review.decision;
    application.reviewed_by = actorId;
    application.decision_at = nowIso();
    application.remarks = review.remarks ?? null;
    await this.applications.update(application);

    const equivalency = await this.applications.getEquivalency(applicationId);

    if (review.decision === "approved") {
      await Promise.all([
        this.subsystems.updateEnrollment(application, equivalency),
        this.subsystems.deductSlot(application.target_program),
        this.subsystems.adjustFinance(application),
        this.subsystems.sendDecisionNotice(application)
      ]);
    } else {
      await this.subsystems.sendDecisionNotice(application);
    }

    await this.log(applicationId, actorId, actorRole, "APPLICATION_REVIEWED", {
      decision: review.decision,
      remarks: review.remarks ?? null
    });

    // Emit real-time update event
    setTimeout(() => {
      io.emit("applications_updated");
    }, 0);
    return application;
  }

  async advanceWaitlist(targetProgram: string, actorId = "system") {
    const application = await this.applications.getNextWaitlisted(targetProgram);
    if (!application) {
      return null;
    }

    application.status = "under_review";
    application.slot_available = true;
    application.waitlist_position = null;
    await this.applications.update(application);
    await this.subsystems.sendDecisionNotice(application);
    await this.log(application.application_id, actorId, "system", "WAITLIST_ADVANCED", {
      target_program: targetProgram
    });

    return application;
  }

  async runSlaChecks(actorId = "system") {
    const applications = await this.applications.list({ status: "under_review" });
    const triggered: Array<{ application_id: string; stage: "48h" | "72h" }> = [];

    for (const application of applications) {
      const hoursOpen = hoursBetween(application.submitted_at);
      if (hoursOpen >= 72) {
        await this.subsystems.sendSlaReminder(application, "72h");
        await this.log(application.application_id, actorId, "system", "WORKFLOW_SLA_ESCALATED", {
          hours_since_assignment: hoursOpen,
          escalation_target: "registrar_admin"
        });
        triggered.push({ application_id: application.application_id, stage: "72h" });
      } else if (hoursOpen >= 48) {
        await this.subsystems.sendSlaReminder(application, "48h");
        await this.log(application.application_id, actorId, "system", "WORKFLOW_SLA_REMINDER", {
          hours_since_assignment: hoursOpen,
          escalation_at_hours: 72
        });
        triggered.push({ application_id: application.application_id, stage: "48h" });
      }
    }

    return triggered;
  }

  private createBaseApplication(input: ShiftApplicationInput): ShiftApplication {
    return {
      application_id: createApplicationId(),
      student_id: input.student_id,
      student_name: input.student_name,
      current_program: input.current_program,
      target_program: input.target_program,
      reason_for_shifting: input.reason_for_shifting,
      gwa: null,
      units_completed: null,
      has_failing_major: false,
      has_financial_hold: false,
      has_academic_alert: false,
      slot_available: false,
      status: "pending",
      submitted_at: nowIso(),
      reviewed_by: null,
      decision_at: null,
      remarks: null,
      waitlist_position: null,
      rejection_reason_code: null
    };
  }

  private async log(applicationId: string, actorId: string, actorRole: UserRole, action: string, details: Record<string, unknown>) {
    const entry: AuditLogEntry = {
      id: createAuditId(),
      application_id: applicationId,
      actor_id: actorId,
      actor_role: actorRole,
      action,
      details,
      timestamp: nowIso()
    };

    await this.audits.log(entry);
  }
}
