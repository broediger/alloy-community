export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number,
    public readonly details?: unknown[]
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class ValidationError extends AppError {
  constructor(details: { field: string; message: string }[]) {
    super('VALIDATION_ERROR', 'Request body is invalid', 400, details)
    this.name = 'ValidationError'
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409)
    this.name = 'ConflictError'
  }
}

export class DeleteConflictError extends AppError {
  constructor(message: string, details: { type: string; count: number }[]) {
    super('DELETE_CONFLICT', message, 409, details)
    this.name = 'DeleteConflictError'
  }
}

export class ReferenceNotFoundError extends AppError {
  constructor(resource: string) {
    super('REFERENCE_NOT_FOUND', `Referenced ${resource} does not exist`, 400)
    this.name = 'ReferenceNotFoundError'
  }
}
