import { HttpError } from '../lib/http.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' } });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'JSON inválido' } });
  }
  if (error.code === '23505') {
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Registro duplicado' } });
  }
  if (error.code === '23503' || error.code === '23514' || error.code === '22P02') {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Datos incompatibles con la base de datos' } });
  }
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: { code: error.code, message: error.message } });
  }
  console.error('Error de API:', error);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' } });
}
