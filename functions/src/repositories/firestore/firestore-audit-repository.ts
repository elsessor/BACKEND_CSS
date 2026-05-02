import type { Firestore } from "firebase-admin/firestore";
import type { AuditRepository } from "../audit-repository.js";
import type { AuditLogEntry } from "../../domain/models.js";

export class FirestoreAuditRepository implements AuditRepository {
  constructor(private readonly db: Firestore) {}

  async log(entry: AuditLogEntry): Promise<void> {
    await this.db.collection("css_audit_logs").doc(entry.id).set(entry);
  }

  async listByApplication(applicationId: string): Promise<AuditLogEntry[]> {
    const snapshot = await this.db
      .collection("css_audit_logs")
      .where("application_id", "==", applicationId)
      .orderBy("timestamp", "asc")
      .get();

    return snapshot.docs.map((doc) => doc.data() as AuditLogEntry);
  }

  async listAll(): Promise<AuditLogEntry[]> {
    const snapshot = await this.db.collection("css_audit_logs").orderBy("timestamp", "desc").get();
    return snapshot.docs.map((doc) => doc.data() as AuditLogEntry);
  }
}
