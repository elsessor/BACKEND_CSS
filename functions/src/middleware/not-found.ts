import type { Request, Response } from "express";

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({
    status: 404,
    error_code: "ROUTE_NOT_FOUND",
    message: `No route found for ${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
}
