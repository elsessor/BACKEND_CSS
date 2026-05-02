import { Router } from "express";
import { validateApplicationPayload, validateEligibilityPayload, validateReviewPayload } from "../validation/application-validation.js";
import { authenticate } from "../middleware/auth.js";
import { allowRoles } from "../middleware/rbac.js";
import type { ShiftingService } from "../services/shifting-service.js";
import { AppError } from "../errors/app-error.js";

export function createCssRouter(service: ShiftingService) {
  const router = Router();

  const readParam = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value ?? "");

  router.post("/apply", authenticate, allowRoles("student", "system_admin"), async (req, res, next) => {
    try {
      const payload = validateApplicationPayload(req.body);
      if (req.user?.role === "student" && req.user.id !== payload.student_id) {
        throw new AppError(403, "FORBIDDEN", "Students may only submit applications for their own records.");
      }

      const result = await service.submitApplication(payload, req.user!.id);
      return res.status(201).json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.post("/eligibility-check", authenticate, allowRoles("student", "system_admin"), async (req, res, next) => {
    try {
      const payload = validateEligibilityPayload(req.body);
      if (req.user?.role === "student" && req.user.id !== payload.student_id) {
        throw new AppError(403, "FORBIDDEN", "Students may only check eligibility for their own records.");
      }

      const result = await service.checkEligibility(payload);
      return res.json(result);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/applications", authenticate, allowRoles("student", "adviser", "department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const studentId = typeof req.query.studentId === "string" ? req.query.studentId : undefined;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const targetProgram = typeof req.query.targetProgram === "string" ? req.query.targetProgram : undefined;

      const effectiveStudentId = req.user?.role === "student" ? req.user.id : studentId;
      const applications = await service.listApplications({
        studentId: effectiveStudentId,
        status,
        targetProgram
      });

      return res.json({ data: applications });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/applications/:applicationId", authenticate, allowRoles("student", "adviser", "department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const applicationId = readParam(req.params.applicationId);
      const application = await service.getApplication(applicationId);
      if (req.user?.role === "student" && req.user.id !== application.student_id) {
        throw new AppError(403, "FORBIDDEN", "Students may only access their own applications.");
      }
      return res.json(application);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/applications/:applicationId/equivalency", authenticate, allowRoles("student", "adviser", "department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const applicationId = readParam(req.params.applicationId);
      const application = await service.getApplication(applicationId);
      if (req.user?.role === "student" && req.user.id !== application.student_id) {
        throw new AppError(403, "FORBIDDEN", "Students may only access their own equivalency reports.");
      }
      const record = await service.getEquivalency(applicationId);
      return res.json(record);
    } catch (error) {
      return next(error);
    }
  });

  router.get("/applications/:applicationId/audits", authenticate, allowRoles("department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const applicationId = readParam(req.params.applicationId);
      const logs = await service.getAuditLogs(applicationId);
      return res.json({ data: logs });
    } catch (error) {
      return next(error);
    }
  });

  router.get("/audit-logs", authenticate, allowRoles("department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const logs = await service.getAllAuditLogs();
      return res.json({ data: logs });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/applications/:applicationId/review", authenticate, allowRoles("department_head", "registrar", "system_admin"), async (req, res, next) => {
    try {
      const applicationId = readParam(req.params.applicationId);
      const payload = validateReviewPayload(req.body);
      const application = await service.reviewApplication(applicationId, payload, req.user!.id, req.user!.role);
      return res.json(application);
    } catch (error) {
      return next(error);
    }
  });

  router.post("/webhooks/srm/slot-opened", authenticate, allowRoles("system", "system_admin", "registrar"), async (req, res, next) => {
    try {
      const targetProgram = typeof req.body?.target_program === "string" ? req.body.target_program.toUpperCase() : "";
      if (!targetProgram) {
        throw new AppError(400, "VALIDATION_ERROR", "Webhook failed: target_program is required.", {
          field_errors: [{ field: "target_program", issue: "Field is required and cannot be empty." }]
        });
      }

      const advanced = await service.advanceWaitlist(targetProgram, req.user!.id);
      return res.json({ advanced });
    } catch (error) {
      return next(error);
    }
  });

  router.post("/jobs/check-sla", authenticate, allowRoles("system", "system_admin", "registrar"), async (req, res, next) => {
    try {
      const triggered = await service.runSlaChecks(req.user!.id);
      return res.json({ triggered });
    } catch (error) {
      return next(error);
    }
  });

  return router;
}
