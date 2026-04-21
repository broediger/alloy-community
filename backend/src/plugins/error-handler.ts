import { FastifyInstance } from 'fastify'
import { Prisma } from '@prisma/client'
import { AppError } from '../errors/index.js'

export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: Error, request, reply) => {
    // AppError subclasses — serialise directly
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      })
    }

    // Fastify validation errors (thrown by schemaErrorFormatter as ValidationError)
    const err = error as unknown as Record<string, unknown>
    if ('validation' in err && err.statusCode === 400) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.message,
        },
      })
    }

    // Prisma known request errors
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      switch (error.code) {
        case 'P2002': {
          const target = (error.meta?.target as string[])?.join(', ') ?? 'field'
          return reply.status(409).send({
            error: {
              code: 'CONFLICT',
              message: `A record with this ${target} already exists`,
            },
          })
        }
        case 'P2003':
          return reply.status(409).send({
            error: {
              code: 'DELETE_CONFLICT',
              message: 'Cannot delete — record has dependents',
            },
          })
        case 'P2025':
          return reply.status(404).send({
            error: { code: 'NOT_FOUND', message: 'Record not found' },
          })
        case 'P2014':
          return reply.status(400).send({
            error: {
              code: 'REFERENCE_NOT_FOUND',
              message: 'Referenced record does not exist',
            },
          })
        default:
          request.log.error(
            { err: error, prismaCode: error.code, meta: error.meta },
            'Unhandled Prisma known-request error',
          )
          break
      }
    }

    // Prisma validation errors — surface as 400 so the cause isn't masked
    if (error instanceof Prisma.PrismaClientValidationError) {
      request.log.warn({ err: error }, 'Prisma validation error')
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Request could not be processed by the database layer' },
      })
    }

    // Unhandled — log the full stack and return 500
    request.log.error({ err: error, stack: error.stack }, 'Unhandled error in request handler')
    return reply.status(500).send({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    })
  })
}
