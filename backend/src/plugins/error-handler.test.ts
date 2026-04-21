import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from './error-handler.js'
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  DeleteConflictError,
  ReferenceNotFoundError,
} from '../errors/index.js'
import { Prisma } from '@prisma/client'

function buildTestApp() {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  return app
}

describe('error-handler', () => {
  it('should handle ValidationError', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new ValidationError([{ field: 'name', message: 'required' }])
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(400)
    const body = res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
    expect(body.error.details).toEqual([{ field: 'name', message: 'required' }])
  })

  it('should handle NotFoundError', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new NotFoundError('Workspace')
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
    expect(res.json().error.message).toBe('Workspace not found')
  })

  it('should handle ConflictError', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new ConflictError('Duplicate slug')
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('CONFLICT')
  })

  it('should handle DeleteConflictError', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new DeleteConflictError('Cannot delete', [{ type: 'fields', count: 3 }])
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(409)
    const body = res.json()
    expect(body.error.code).toBe('DELETE_CONFLICT')
    expect(body.error.details).toEqual([{ type: 'fields', count: 3 }])
  })

  it('should handle ReferenceNotFoundError', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new ReferenceNotFoundError('entity')
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('REFERENCE_NOT_FOUND')
  })

  it('should handle Prisma P2002 unique constraint', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      const error = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '5.0.0',
        meta: { target: ['slug'] },
      })
      throw error
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('CONFLICT')
    expect(res.json().error.message).toContain('slug')
  })

  it('should handle Prisma P2003 FK constraint', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new Prisma.PrismaClientKnownRequestError('FK failed', {
        code: 'P2003',
        clientVersion: '5.0.0',
      })
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('DELETE_CONFLICT')
  })

  it('should handle Prisma P2025 record not found', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '5.0.0',
      })
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
  })

  it('should handle Prisma P2014 relation violation', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new Prisma.PrismaClientKnownRequestError('Relation violation', {
        code: 'P2014',
        clientVersion: '5.0.0',
      })
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('REFERENCE_NOT_FOUND')
  })

  it('should handle unhandled errors as 500', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new Error('Something broke')
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(500)
    expect(res.json().error.code).toBe('INTERNAL_ERROR')
    expect(res.json().error.message).toBe('An unexpected error occurred')
  })

  it('should handle PrismaClientValidationError as 400', async () => {
    const app = buildTestApp()
    app.get('/test', async () => {
      throw new Prisma.PrismaClientValidationError('Invalid argument', { clientVersion: '5.0.0' })
    })
    const res = await app.inject({ method: 'GET', url: '/test' })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('should handle Fastify validation errors', async () => {
    const app = buildTestApp()
    app.post('/test', {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string' } },
        },
      },
    }, async (request) => {
      return { ok: true }
    })
    const res = await app.inject({
      method: 'POST',
      url: '/test',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })
})
