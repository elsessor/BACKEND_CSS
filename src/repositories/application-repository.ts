import type { ShiftApplication, SubjectEquivalencyRecord } from "../domain/models.js";

export interface ApplicationRepository {
  create(application: ShiftApplication): Promise<void>;
  update(application: ShiftApplication): Promise<void>;
  getById(applicationId: string): Promise<ShiftApplication | null>;
  getByStudentAndTarget(studentId: string, targetProgram: string): Promise<ShiftApplication[]>;
  list(filters?: { studentId?: string; status?: string; targetProgram?: string }): Promise<ShiftApplication[]>;
  countSubmittedThisSemester(studentId: string): Promise<number>;
  getNextWaitlisted(targetProgram: string): Promise<ShiftApplication | null>;
  saveEquivalency(record: SubjectEquivalencyRecord): Promise<void>;
  getEquivalency(applicationId: string): Promise<SubjectEquivalencyRecord | null>;
}
