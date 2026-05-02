import type { AuditLogEntry } from "../domain/models.js";

export interface AuditRepository {
  log(entry: AuditLogEntry): Promise<void>;
  listByApplication(applicationId: string): Promise<AuditLogEntry[]>;
  listAll(): Promise<AuditLogEntry[]>;
}
