import { describe, it, expect } from 'vitest'
import {
  AppError,
  ValidationError,
  NotFoundError,
  ConflictError,
  DeleteConflictError,
  ReferenceNotFoundError,
} from './index.js'

describe('AppError', () => {
  it('should create an instance with correct properties', () => {
    const error = new AppError('TEST_CODE', 'Test message', 418, [{ detail: 'info' }])
    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('TEST_CODE')
    expect(error.message).toBe('Test message')
    expect(error.statusCode).toBe(418)
    expect(error.details).toEqual([{ detail: 'info' }])
    expect(error.name).toBe('AppError')
  })

  it('should work without details', () => {
    const error = new AppError('CODE', 'msg', 400)
    expect(error.details).toBeUndefined()
  })
})

describe('ValidationError', () => {
  it('should create a 400 VALIDATION_ERROR', () => {
    const details = [{ field: 'name', message: 'is required' }]
    const error = new ValidationError(details)
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Request body is invalid')
    expect(error.statusCode).toBe(400)
    expect(error.details).toEqual(details)
    expect(error.name).toBe('ValidationError')
  })
})

describe('NotFoundError', () => {
  it('should create a 404 NOT_FOUND', () => {
    const error = new NotFoundError('Workspace')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('NOT_FOUND')
    expect(error.message).toBe('Workspace not found')
    expect(error.statusCode).toBe(404)
    expect(error.name).toBe('NotFoundError')
  })
})

describe('ConflictError', () => {
  it('should create a 409 CONFLICT', () => {
    const error = new ConflictError('Duplicate slug')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('CONFLICT')
    expect(error.message).toBe('Duplicate slug')
    expect(error.statusCode).toBe(409)
    expect(error.name).toBe('ConflictError')
  })
})

describe('DeleteConflictError', () => {
  it('should create a 409 DELETE_CONFLICT with details', () => {
    const details = [{ type: 'fields', count: 5 }]
    const error = new DeleteConflictError('Cannot delete', details)
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('DELETE_CONFLICT')
    expect(error.message).toBe('Cannot delete')
    expect(error.statusCode).toBe(409)
    expect(error.details).toEqual(details)
    expect(error.name).toBe('DeleteConflictError')
  })
})

describe('ReferenceNotFoundError', () => {
  it('should create a 400 REFERENCE_NOT_FOUND', () => {
    const error = new ReferenceNotFoundError('entity')
    expect(error).toBeInstanceOf(AppError)
    expect(error.code).toBe('REFERENCE_NOT_FOUND')
    expect(error.message).toBe('Referenced entity does not exist')
    expect(error.statusCode).toBe(400)
    expect(error.name).toBe('ReferenceNotFoundError')
  })
})
