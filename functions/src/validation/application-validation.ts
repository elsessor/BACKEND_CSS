import type { EligibilityCheckInput, ReviewDecisionInput, ShiftApplicationInput } from "../domain/models.js";
import { AppError } from "../errors/app-error.js";

const studentIdPattern = /^STU-\d{4}-\d{5}$/;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateApplicationPayload(payload: unknown): ShiftApplicationInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(422, "SCHEMA_VALIDATION_FAILED", "Payload rejected: body must be a JSON object.", {
      schema_errors: [{ field: "body", expected_type: "object", received_type: typeof payload }]
    });
  }

  const body = payload as Record<string, unknown>;
  const fieldErrors: Array<{ field: string; issue: string }> = [];
  const schemaErrors: Array<Record<string, unknown>> = [];

  const requiredFields = ["student_id", "student_name", "current_program", "target_program", "reason_for_shifting"] as const;

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === "") {
      fieldErrors.push({ field, issue: "Field is required and cannot be empty." });
    } else if (typeof body[field] !== "string") {
      schemaErrors.push({
        field,
        expected_type: "string",
        received_type: typeof body[field],
        received_value: body[field]
      });
    }
  }

  if (fieldErrors.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Application submission failed: missing required fields.", {
      field_errors: fieldErrors
    });
  }

  if (schemaErrors.length > 0) {
    throw new AppError(422, "SCHEMA_VALIDATION_FAILED", "Payload rejected: one or more fields have invalid data types.", {
      schema_errors: schemaErrors
    });
  }

  if (!studentIdPattern.test(String(body.student_id))) {
    throw new AppError(400, "VALIDATION_ERROR", "Application submission failed: missing required fields.", {
      field_errors: [{ field: "student_id", issue: "Invalid format. Expected pattern: STU-YYYY-NNNNN." }]
    });
  }

  if (![body.student_name, body.current_program, body.target_program].every(isNonEmptyString)) {
    throw new AppError(400, "VALIDATION_ERROR", "Application submission failed: missing required fields.", {
      field_errors: requiredFields.map((field) => ({
        field,
        issue: "Field is required and cannot be empty."
      }))
    });
  }

  return {
    student_id: String(body.student_id).trim(),
    student_name: String(body.student_name).trim(),
    current_program: String(body.current_program).trim().toUpperCase(),
    target_program: String(body.target_program).trim().toUpperCase(),
    reason_for_shifting: String(body.reason_for_shifting).trim()
  };
}

export function validateEligibilityPayload(payload: unknown): EligibilityCheckInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(422, "SCHEMA_VALIDATION_FAILED", "Payload rejected: body must be a JSON object.", {
      schema_errors: [{ field: "body", expected_type: "object", received_type: typeof payload }]
    });
  }

  const body = payload as Record<string, unknown>;
  const fieldErrors: Array<{ field: string; issue: string }> = [];
  const requiredFields = ["student_id", "current_program", "target_program"] as const;

  for (const field of requiredFields) {
    if (!(field in body) || body[field] === "" || typeof body[field] !== "string") {
      fieldErrors.push({ field, issue: "Field is required and cannot be empty." });
    }
  }

  if (fieldErrors.length > 0) {
    throw new AppError(400, "VALIDATION_ERROR", "Eligibility check failed: missing required fields.", {
      field_errors: fieldErrors
    });
  }

  if (!studentIdPattern.test(String(body.student_id))) {
    throw new AppError(400, "VALIDATION_ERROR", "Eligibility check failed: invalid student ID format.", {
      field_errors: [{ field: "student_id", issue: "Invalid format. Expected pattern: STU-YYYY-NNNNN." }]
    });
  }

  return {
    student_id: String(body.student_id).trim(),
    current_program: String(body.current_program).trim().toUpperCase(),
    target_program: String(body.target_program).trim().toUpperCase()
  };
}

export function validateReviewPayload(payload: unknown): ReviewDecisionInput {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AppError(422, "SCHEMA_VALIDATION_FAILED", "Payload rejected: body must be a JSON object.");
  }

  const body = payload as Record<string, unknown>;

  if (body.decision !== "approved" && body.decision !== "rejected") {
    throw new AppError(400, "VALIDATION_ERROR", "Review submission failed: invalid decision.", {
      field_errors: [{ field: "decision", issue: "Decision must be either approved or rejected." }]
    });
  }

  if (body.remarks !== undefined && typeof body.remarks !== "string") {
    throw new AppError(422, "SCHEMA_VALIDATION_FAILED", "Payload rejected: one or more fields have invalid data types.", {
      schema_errors: [{ field: "remarks", expected_type: "string", received_type: typeof body.remarks }]
    });
  }

  return {
    decision: body.decision,
    remarks: typeof body.remarks === "string" ? body.remarks.trim() : undefined
  };
}
