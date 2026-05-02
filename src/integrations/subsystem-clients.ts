import type {
  AcademicAlertPayload,
  FinancialHoldPayload,
  ShiftApplication,
  SlotPayload,
  StudentAcademicProfile,
  SubjectEquivalencyRecord,
  CurriculumSubject
} from "../domain/models.js";

export interface SubsystemClients {
  getStudentAcademicProfile(studentId: string): Promise<StudentAcademicProfile>;
  getCurriculum(programId: string): Promise<CurriculumSubject[]>;
  getAcademicAlerts(studentId: string): Promise<AcademicAlertPayload>;
  getProgramSlots(programId: string): Promise<SlotPayload>;
  getFinancialHold(studentId: string): Promise<FinancialHoldPayload>;
  sendDecisionNotice(application: ShiftApplication): Promise<void>;
  sendWaitlistNotice(application: ShiftApplication): Promise<void>;
  sendSlaReminder(application: ShiftApplication, stage: "48h" | "72h"): Promise<void>;
  updateEnrollment(application: ShiftApplication, equivalency: SubjectEquivalencyRecord | null): Promise<void>;
  deductSlot(programId: string): Promise<void>;
  adjustFinance(application: ShiftApplication): Promise<void>;
  notifyAdministrator(payload: Record<string, unknown>): Promise<void>;
}
