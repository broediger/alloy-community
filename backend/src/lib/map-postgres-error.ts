import postgres from 'postgres'
import { ConflictError, ReferenceNotFoundError } from '../errors/index.js'

export function mapPostgresError(error: unknown): never {
  if (error instanceof postgres.PostgresError) {
    if (error.code === '23503') throw new ReferenceNotFoundError('field')
    if (error.code === '23505') throw new ConflictError('Duplicate record')
  }
  throw error
}
