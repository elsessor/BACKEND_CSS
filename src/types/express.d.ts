import type { UserRole } from "../domain/models.js";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        token?: string;
      };
    }
  }
}

export {};
