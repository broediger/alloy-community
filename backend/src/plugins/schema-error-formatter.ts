import { FastifySchemaValidationError } from 'fastify/types/schema.js'
import { ValidationError } from '../errors/index.js'

export function schemaErrorFormatter(
  errors: FastifySchemaValidationError[],
  _dataVar: string
): ValidationError {
  return new ValidationError(
    errors.map((e) => ({
      field:
        e.instancePath?.replace(/^\//, '') ||
        (e.params as Record<string, string>)?.missingProperty ||
        'unknown',
      message: e.message ?? 'Invalid value',
    }))
  )
}
