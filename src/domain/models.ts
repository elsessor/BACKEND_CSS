export type ApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "cancelled"
  | "waitlisted"
  | "awaiting_data"
  | "pending_cms_update";

export type UserRole =
  | "student"
  | "adviser"
  | "department_head"
  | "registrar"
  | "system_admin"
  | "system";

export interface ShiftApplicationInput {
  student_id: string;
  student_name: string;
  current_program: string;
  target_program: string;
  reason_for_shifting: string;
}

export interface SubjectRecord {
  subject_code: string;
  subject_name: string;
  units: number;
  grade: number | "INC";
  category: "major" | "minor" | "general";
}

export interface CurriculumSubject {
  subject_code: string;
  subject_name: string;
  units: number;
  equivalents?: string[];
}

export interface ShiftApplication {
  application_id: string;
  student_id: string;
  student_name: string;
  current_program: string;
  target_program: string;
  reason_for_shifting: string;
  gwa: number | null;
  units_completed: number | null;
  has_failing_major: boolean;
  has_financial_hold: boolean;
  has_academic_alert: boolean;
  slot_available: boolean;
  status: ApplicationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  decision_at: string | null;
  remarks: string | null;
  waitlist_position?: number | null;
  rejection_reason_code?: string | null;
}

export interface CreditedSubject {
  subject_code: string;
  equivalent_to: string;
  units: number;
  grade: number | "INC";
  status: "credited";
}

export interface SubjectEquivalencyRecord {
  equivalency_id: string;
  application_id: string;
  student_id: string;
  credited_subjects: CreditedSubject[];
  retake_subjects: string[];
  new_units_required: number;
  generated_at: string;
}

export interface AuditLogEntry {
  id: string;
  application_id: string;
  actor_id: string;
  actor_role: UserRole;
  action: string;
  details: Record<string, unknown>;
  timestamp: string;
}

export interface StudentAcademicProfile {
  gwa: number;
  units_completed: number;
  subjects: SubjectRecord[];
  academic_standing: string;
}

export interface AcademicAlertPayload {
  has_alert: boolean;
  alerts: string[];
}

export interface FinancialHoldPayload {
  has_financial_hold: boolean;
  hold_type?: string;
  finance_wallet_url?: string;
}

export interface SlotPayload {
  program_id: string;
  slot_available: boolean;
  available_slots: number;
}

export interface ReviewDecisionInput {
  decision: "approved" | "rejected";
  remarks?: string;
}

export interface EligibilityCheckInput {
  student_id: string;
  current_program: string;
  target_program: string;
}
