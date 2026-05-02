import type { ApplicationRepository } from "../application-repository.js";
import type { ShiftApplication, SubjectEquivalencyRecord } from "../../domain/models.js";

export class MemoryApplicationRepository implements ApplicationRepository {
  private readonly applications = new Map<string, ShiftApplication>();
  private readonly equivalencies = new Map<string, SubjectEquivalencyRecord>();

  async create(application: ShiftApplication): Promise<void> {
    this.applications.set(application.application_id, application);
  }

  async update(application: ShiftApplication): Promise<void> {
    this.applications.set(application.application_id, application);
  }

  async getById(applicationId: string): Promise<ShiftApplication | null> {
    return this.applications.get(applicationId) ?? null;
  }

  async getByStudentAndTarget(studentId: string, targetProgram: string): Promise<ShiftApplication[]> {
    return [...this.applications.values()].filter(
      (application) => application.student_id === studentId && application.target_program === targetProgram
    );
  }

  async list(filters?: { studentId?: string; status?: string; targetProgram?: string }): Promise<ShiftApplication[]> {
    return [...this.applications.values()].filter((application) => {
      if (filters?.studentId && application.student_id !== filters.studentId) {
        return false;
      }
      if (filters?.status && application.status !== filters.status) {
        return false;
      }
      if (filters?.targetProgram && application.target_program !== filters.targetProgram) {
        return false;
      }
      return true;
    });
  }

  async countSubmittedThisSemester(studentId: string): Promise<number> {
    return [...this.applications.values()].filter((application) => application.student_id === studentId).length;
  }

  async getNextWaitlisted(targetProgram: string): Promise<ShiftApplication | null> {
    const waitlisted = [...this.applications.values()]
      .filter((application) => application.status === "waitlisted" && application.target_program === targetProgram)
      .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

    return waitlisted[0] ?? null;
  }

  async saveEquivalency(record: SubjectEquivalencyRecord): Promise<void> {
    this.equivalencies.set(record.application_id, record);
  }

  async getEquivalency(applicationId: string): Promise<SubjectEquivalencyRecord | null> {
    return this.equivalencies.get(applicationId) ?? null;
  }
}
