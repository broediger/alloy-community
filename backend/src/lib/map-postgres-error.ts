import postgres from 'postgres'
import { ConflictError, ReferenceNotFoundError, ValidationError, AppError } from '../errors/index.js'

// PostgreSQL SQLSTATE codes — see https://www.postgresql.org/docs/current/errcodes-appendix.html
const PG = {
  NOT_NULL_VIOLATION: '23502',
  FOREIGN_KEY_VIOLATION: '23503',
  UNIQUE_VIOLATION: '23505',
  CHECK_VIOLATION: '23514',
  EXCLUSION_VIOLATION: '23P01',
  STRING_DATA_RIGHT_TRUNCATION: '22001',
  INVALID_TEXT_REPRESENTATION: '22P02',
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
} as const

export function mapPostgresError(error: unknown): never {
  if (error instanceof postgres.PostgresError) {
    switch (error.code) {
      case PG.FOREIGN_KEY_VIOLATION:
        throw new ReferenceNotFoundError(error.column_name ?? error.constraint_name ?? 'field')
      case PG.UNIQUE_VIOLATION:
        throw new ConflictError(
          error.constraint_name
            ? `Duplicate record violates constraint '${error.constraint_name}'`
            : 'Duplicate record'
        )
      case PG.CHECK_VIOLATION:
        throw new ValidationError([
          {
            field: error.constraint_name ?? 'unknown',
            message: `Check constraint '${error.constraint_name ?? 'unknown'}' violated`,
          },
        ])
      case PG.NOT_NULL_VIOLATION:
        throw new ValidationError([
          { field: error.column_name ?? 'unknown', message: 'Required field is missing' },
        ])
      case PG.STRING_DATA_RIGHT_TRUNCATION:
        throw new ValidationError([
          { field: error.column_name ?? 'unknown', message: 'Value exceeds maximum length' },
        ])
      case PG.INVALID_TEXT_REPRESENTATION:
        throw new ValidationError([
          { field: 'unknown', message: 'Invalid value format' },
        ])
      case PG.SERIALIZATION_FAILURE:
      case PG.DEADLOCK_DETECTED:
        throw new AppError('TRANSACTION_CONFLICT', 'Transaction conflict — please retry', 409)
      case PG.EXCLUSION_VIOLATION:
        throw new ConflictError('Record conflicts with an existing range')
      default:
        break
    }
  }
  throw error
}
