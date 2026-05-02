import type {
  AcademicAlertPayload,
  CurriculumSubject,
  FinancialHoldPayload,
  ShiftApplication,
  SlotPayload,
  StudentAcademicProfile,
  SubjectEquivalencyRecord
} from "../domain/models.js";
import type { SubsystemClients } from "./subsystem-clients.js";

export class MockSubsystemClients implements SubsystemClients {
  async getStudentAcademicProfile(studentId: string): Promise<StudentAcademicProfile> {
    return {
      gwa: 1.75,
      units_completed: 72,
      academic_standing: "good",
      subjects: [
        { subject_code: "IT101", subject_name: "Intro to Computing", units: 3, grade: 1.5, category: "major" },
        { subject_code: "IT201", subject_name: "Programming 2", units: 3, grade: 1.75, category: "major" },
        { subject_code: "GE101", subject_name: "Understanding the Self", units: 3, grade: 1.25, category: "general" }
      ]
    };
  }

  async getCurriculum(programId: string): Promise<CurriculumSubject[]> {
    return [
      { subject_code: "CS101", subject_name: "Intro to Computing", units: 3, equivalents: ["IT101"] },
      { subject_code: "CS201", subject_name: "Discrete Structures", units: 3, equivalents: [] },
      { subject_code: "CS301", subject_name: "Algorithms", units: 3, equivalents: [] }
    ];
  }

  async getAcademicAlerts(studentId: string): Promise<AcademicAlertPayload> {
    return { has_alert: false, alerts: [] };
  }

  async getProgramSlots(programId: string): Promise<SlotPayload> {
    return { program_id: programId, slot_available: true, available_slots: 5 };
  }

  async getFinancialHold(studentId: string): Promise<FinancialHoldPayload> {
    return {
      has_financial_hold: false,
      hold_type: undefined,
      finance_wallet_url: `https://iae.edu/finance/wallet/${studentId}`
    };
  }

  async sendDecisionNotice(application: ShiftApplication): Promise<void> {}

  async sendWaitlistNotice(application: ShiftApplication): Promise<void> {}

  async sendSlaReminder(application: ShiftApplication, stage: "48h" | "72h"): Promise<void> {}

  async updateEnrollment(application: ShiftApplication, equivalency: SubjectEquivalencyRecord | null): Promise<void> {}

  async deductSlot(programId: string): Promise<void> {}

  async adjustFinance(application: ShiftApplication): Promise<void> {}

  async notifyAdministrator(payload: Record<string, unknown>): Promise<void> {}
}
