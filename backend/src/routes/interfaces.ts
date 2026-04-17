import { FastifyInstance } from 'fastify'
import * as interfaceService from '../services/interfaces/interfaces.js'
import * as fieldService from '../services/interfaces/interface-fields.js'
import * as versionService from '../services/interfaces/interface-versions.js'

const createInterfaceSchema = {
  type: 'object',
  required: ['name', 'sourceSystemId', 'targetSystemId', 'direction'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    sourceSystemId: { type: 'string' },
    targetSystemId: { type: 'string' },
    sourceEntityIds: { type: 'array', items: { type: 'string' } },
    targetEntityIds: { type: 'array', items: { type: 'string' } },
    direction: { type: 'string', enum: ['REQUEST_RESPONSE', 'EVENT'] },
  },
  additionalProperties: false,
}

const updateInterfaceSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    direction: { type: 'string', enum: ['REQUEST_RESPONSE', 'EVENT'] },
    sourceEntityIds: { type: 'array', items: { type: 'string' } },
    targetEntityIds: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
}

const createFieldSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    canonicalFieldId: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    description: { type: 'string' },
    nullable: { type: 'boolean' },
    maxLength: { type: 'integer', minimum: 1 },
    status: { type: 'string', enum: ['MANDATORY', 'OPTIONAL', 'EXCLUDED'] },
  },
  additionalProperties: false,
}

const updateFieldSchema = {
  type: 'object',
  properties: {
    status: { type: 'string', enum: ['MANDATORY', 'OPTIONAL', 'EXCLUDED'] },
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    description: { type: 'string' },
    nullable: { type: 'boolean' },
    maxLength: { type: ['integer', 'null'], minimum: 1 },
  },
  additionalProperties: false,
}

const cutInterfaceVersionSchema = {
  type: 'object',
  required: ['label'],
  properties: {
    label: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    createdBy: { type: 'string' },
  },
  additionalProperties: false,
}

const updateVersionStatusSchema = {
  type: 'object',
  required: ['status'],
  properties: {
    status: { type: 'string', enum: ['PUBLISHED', 'DEPRECATED'] },
  },
  additionalProperties: false,
}

export async function interfaceRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return interfaceService.list(workspaceId)
  })

  app.post('/', { schema: { body: createInterfaceSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await interfaceService.create(workspaceId, request.body as interfaceService.CreateInterfaceBody)
    reply.status(201)
    return result
  })

  app.get('/:iId', async (request) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    return interfaceService.getById(workspaceId, iId)
  })

  app.patch('/:iId', { schema: { body: updateInterfaceSchema } }, async (request) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    return interfaceService.update(workspaceId, iId, request.body as interfaceService.UpdateInterfaceBody)
  })

  app.delete('/:iId', async (request) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    return interfaceService.remove(workspaceId, iId)
  })

  // Interface Fields
  app.get('/:iId/fields', async (request) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    return fieldService.list(workspaceId, iId)
  })

  app.post('/:iId/fields', { schema: { body: createFieldSchema } }, async (request, reply) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    const result = await fieldService.create(workspaceId, iId, request.body as fieldService.CreateInterfaceFieldBody)
    reply.status(201)
    return result
  })

  app.patch('/:iId/fields/:ifId', { schema: { body: updateFieldSchema } }, async (request) => {
    const { workspaceId, iId, ifId } = request.params as { workspaceId: string; iId: string; ifId: string }
    return fieldService.update(workspaceId, iId, ifId, request.body as fieldService.UpdateInterfaceFieldBody)
  })

  app.delete('/:iId/fields/:ifId', async (request) => {
    const { workspaceId, iId, ifId } = request.params as { workspaceId: string; iId: string; ifId: string }
    return fieldService.remove(workspaceId, iId, ifId)
  })

  // Interface Versions
  app.get('/:iId/versions', async (request) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    return versionService.list(workspaceId, iId)
  })

  app.post('/:iId/versions', { schema: { body: cutInterfaceVersionSchema } }, async (request, reply) => {
    const { workspaceId, iId } = request.params as { workspaceId: string; iId: string }
    const result = await versionService.cutVersion(workspaceId, iId, request.body as versionService.CutInterfaceVersionBody)
    reply.status(201)
    return result
  })

  app.get('/:iId/versions/:vId', async (request) => {
    const { workspaceId, iId, vId } = request.params as { workspaceId: string; iId: string; vId: string }
    return versionService.getById(workspaceId, iId, vId)
  })

  app.get('/:iId/versions/:vId/diff', async (request) => {
    const { workspaceId, iId, vId } = request.params as { workspaceId: string; iId: string; vId: string }
    return versionService.getDiff(workspaceId, iId, vId)
  })

  app.patch('/:iId/versions/:vId/status', { schema: { body: updateVersionStatusSchema } }, async (request) => {
    const { workspaceId, iId, vId } = request.params as { workspaceId: string; iId: string; vId: string }
    return versionService.updateStatus(workspaceId, iId, vId, request.body as versionService.UpdateInterfaceVersionStatusBody)
  })
}
