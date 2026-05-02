import type { AuditRepository } from "../audit-repository.js";
import type { AuditLogEntry } from "../../domain/models.js";

export class MemoryAuditRepository implements AuditRepository {
  private readonly entries: AuditLogEntry[] = [];

  async log(entry: AuditLogEntry): Promise<void> {
    this.entries.push(entry);
  }

  async listByApplication(applicationId: string): Promise<AuditLogEntry[]> {
    return this.entries.filter((entry) => entry.application_id === applicationId);
  }

  async listAll(): Promise<AuditLogEntry[]> {
    return [...this.entries].sort(
      (first, second) => new Date(second.timestamp).getTime() - new Date(first.timestamp).getTime()
    );
  }
}
