import type { Firestore } from "firebase-admin/firestore";
import type { ApplicationRepository } from "../application-repository.js";
import type { ShiftApplication, SubjectEquivalencyRecord } from "../../domain/models.js";

export class FirestoreApplicationRepository implements ApplicationRepository {
  constructor(private readonly db: Firestore) {}

  async create(application: ShiftApplication): Promise<void> {
    await this.db.collection("css_applications").doc(application.application_id).set(application);
  }

  async update(application: ShiftApplication): Promise<void> {
    await this.db.collection("css_applications").doc(application.application_id).set(application);
  }

  async getById(applicationId: string): Promise<ShiftApplication | null> {
    const snapshot = await this.db.collection("css_applications").doc(applicationId).get();
    return snapshot.exists ? (snapshot.data() as ShiftApplication) : null;
  }

  async getByStudentAndTarget(studentId: string, targetProgram: string): Promise<ShiftApplication[]> {
    const snapshot = await this.db
      .collection("css_applications")
      .where("student_id", "==", studentId)
      .where("target_program", "==", targetProgram)
      .get();

    return snapshot.docs.map((doc) => doc.data() as ShiftApplication);
  }

  async list(filters?: { studentId?: string; status?: string; targetProgram?: string }): Promise<ShiftApplication[]> {
    let query: FirebaseFirestore.Query = this.db.collection("css_applications");

    if (filters?.studentId) {
      query = query.where("student_id", "==", filters.studentId);
    }
    if (filters?.status) {
      query = query.where("status", "==", filters.status);
    }
    if (filters?.targetProgram) {
      query = query.where("target_program", "==", filters.targetProgram);
    }

    const snapshot = await query.get();
    return snapshot.docs.map((doc) => doc.data() as ShiftApplication);
  }

  async countSubmittedThisSemester(studentId: string): Promise<number> {
    const snapshot = await this.db.collection("css_applications").where("student_id", "==", studentId).get();
    return snapshot.size;
  }

  async getNextWaitlisted(targetProgram: string): Promise<ShiftApplication | null> {
    const snapshot = await this.db
      .collection("css_applications")
      .where("target_program", "==", targetProgram)
      .where("status", "==", "waitlisted")
      .orderBy("submitted_at", "asc")
      .limit(1)
      .get();

    if (snapshot.empty) {
      return null;
    }

    return snapshot.docs[0].data() as ShiftApplication;
  }

  async saveEquivalency(record: SubjectEquivalencyRecord): Promise<void> {
    await this.db.collection("css_equivalencies").doc(record.application_id).set(record);
  }

  async getEquivalency(applicationId: string): Promise<SubjectEquivalencyRecord | null> {
    const snapshot = await this.db.collection("css_equivalencies").doc(applicationId).get();
    return snapshot.exists ? (snapshot.data() as SubjectEquivalencyRecord) : null;
  }
}
