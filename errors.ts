import { Response } from 'express';
import { ApiErrorBody } from './types';

function send(res: Response, status: number, code: string, message: string, details?: unknown): void {
  const body: ApiErrorBody = { error: { code, message, ...(details !== undefined ? { details } : {}) } };
  res.status(status).json(body);
}

export const ApiErrors = {
  badRequest: (res: Response, message: string, details?: unknown) => send(res, 400, 'BAD_REQUEST', message, details),
  unauthorized: (res: Response, message = 'Missing or invalid authentication token') =>
    send(res, 401, 'UNAUTHORIZED', message),
  forbidden: (res: Response, message = 'You do not have permission to access this resource') =>
    send(res, 403, 'FORBIDDEN', message),
  notFound: (res: Response, message: string) => send(res, 404, 'NOT_FOUND', message),
  conflict: (res: Response, message: string) => send(res, 409, 'CONFLICT', message),
  validation: (res: Response, message: string, details?: unknown) =>
    send(res, 422, 'VALIDATION_ERROR', message, details),
  internal: (res: Response, message = 'Internal server error') => send(res, 500, 'INTERNAL_ERROR', message),
};
