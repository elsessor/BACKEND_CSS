import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/app-error.js";
import { nowIso } from "../utils/time.js";

export function errorHandler(error: unknown, req: Request, res: Response, next: NextFunction) {
  if (error instanceof AppError) {
    return res.status(error.status).json({
      status: error.status,
      error_code: error.errorCode,
      message: error.message,
      details: error.details,
      timestamp: nowIso()
    });
  }

  if (error instanceof Error) {
    const firestoreLikeError = error as Error & { code?: number | string };
    const isFirestoreNotFound =
      firestoreLikeError.code === 5 ||
      firestoreLikeError.code === "5" ||
      firestoreLikeError.message.includes("5 NOT_FOUND");

    if (isFirestoreNotFound) {
      return res.status(503).json({
        status: 503,
        error_code: "FIRESTORE_DATABASE_NOT_READY",
        message: "Firestore is not available for this Firebase project yet. Create the Firestore database in Firebase Console first.",
        details: {
          likely_cause: "The Firebase project exists, but Firestore Database has not been initialized.",
          required_action: "Open Firebase Console > Firestore Database > Create database, then restart the backend.",
          request_path: req.originalUrl
        },
        timestamp: nowIso()
      });
    }
  }

  const message = error instanceof Error ? error.message : "Unexpected error";
  return res.status(500).json({
    status: 500,
    error_code: "INTERNAL_SERVER_ERROR",
    message,
    timestamp: nowIso()
  });
}
