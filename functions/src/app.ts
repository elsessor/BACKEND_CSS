import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { firestoreDb } from "./config/firebase.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { FirestoreApplicationRepository } from "./repositories/firestore/firestore-application-repository.js";
import { FirestoreAuditRepository } from "./repositories/firestore/firestore-audit-repository.js";
import { MemoryApplicationRepository } from "./repositories/memory/memory-application-repository.js";
import { MemoryAuditRepository } from "./repositories/memory/memory-audit-repository.js";
import { createCssRouter } from "./routes/css-routes.js";
import { EquivalencyService } from "./services/equivalency-service.js";
import { ShiftingService } from "./services/shifting-service.js";
import { MockSubsystemClients } from "./integrations/mock-subsystem-clients.js";

const applicationRepository =
  env.storageProvider === "firestore" ?
    new FirestoreApplicationRepository(firestoreDb()) :
    new MemoryApplicationRepository();

const auditRepository =
  env.storageProvider === "firestore" ?
    new FirestoreAuditRepository(firestoreDb()) :
    new MemoryAuditRepository();

const shiftingService = new ShiftingService(
  applicationRepository,
  auditRepository,
  new MockSubsystemClients(),
  new EquivalencyService()
);

export function createApp() {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/health", (req, res) => {
    return res.json({
      service: "css-backend",
      status: "ok",
      environment: env.nodeEnv,
      storage_provider: env.storageProvider,
      auth_mode: env.authMode
    });
  });

  app.use("/api/css", createCssRouter(shiftingService));
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
