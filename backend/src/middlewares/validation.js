import { validationResult } from 'express-validator';
import { HttpError } from '../lib/http.js';

export function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new HttpError(400, 'VALIDATION_ERROR', errors.array()[0].msg));
  }
  next();
}
