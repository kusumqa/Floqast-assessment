import { NextFunction, Request, Response } from 'express';
import { makeLogger } from './logger';

/** Express middleware: logs method, path, status and duration for every request. */
export function requestLoggingMiddleware(serviceName: string) {
  const log = makeLogger(serviceName);
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      log.info(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
    });
    next();
  };
}
