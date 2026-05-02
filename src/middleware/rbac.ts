import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../domain/models.js";
import { AppError } from "../errors/app-error.js";

export function allowRoles(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, "UNAUTHORIZED", "Authentication is required."));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError(403, "FORBIDDEN", "You do not have access to this resource.", {
        allowed_roles: roles
      }));
    }

    return next();
  };
}
