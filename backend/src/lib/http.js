export class HttpError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const badRequest = (message) => new HttpError(400, 'VALIDATION_ERROR', message);
export const notFound = (message = 'Recurso no encontrado') => new HttpError(404, 'NOT_FOUND', message);
export const conflict = (message = 'Recurso duplicado') => new HttpError(409, 'CONFLICT', message);
export const forbidden = (message = 'Acceso denegado') => new HttpError(403, 'FORBIDDEN', message);

export const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

export function positiveId(raw) {
  const id = Number(raw);
  if (!Number.isSafeInteger(id) || id < 1) throw badRequest('Identificador inválido');
  return id;
}
