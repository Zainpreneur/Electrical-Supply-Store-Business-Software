import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message });
  }
  // Prisma unique constraint violation, etc.
  const anyErr = err as { code?: string; meta?: { target?: string[] } };
  if (anyErr?.code === "P2002") {
    return res.status(409).json({ error: `Duplicate value for: ${anyErr.meta?.target?.join(", ")}` });
  }
  if (anyErr?.code === "P2025") {
    return res.status(404).json({ error: "Record not found" });
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}

export function asyncHandler<T extends (...args: any[]) => Promise<any>>(fn: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
