import { FastifyInstance } from 'fastify'
import * as systemService from '../services/registry/systems.js'
import * as entityService from '../services/registry/system-entities.js'
import * as relationshipService from '../services/registry/system-entity-relationships.js'

const createSystemSchema = {
  type: 'object',
  required: ['name', 'systemType'],
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    systemType: { type: 'string', enum: ['REST', 'SOAP', 'EVENT', 'FLAT_FILE', 'OTHER'] },
    baseUrl: { type: 'string' },
    notes: { type: 'string' },
  },
  additionalProperties: false,
}

const updateSystemSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    systemType: { type: 'string', enum: ['REST', 'SOAP', 'EVENT', 'FLAT_FILE', 'OTHER'] },
    baseUrl: { type: 'string' },
    notes: { type: 'string' },
  },
  additionalProperties: false,
}

const createEntitySchema = {
  type: 'object',
  required: ['name', 'slug'],
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

const updateEntitySchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

const createRelationshipSchema = {
  type: 'object',
  required: ['sourceEntityId', 'targetEntityId', 'viaFieldId', 'relationshipType'],
  properties: {
    sourceEntityId: { type: 'string' },
    targetEntityId: { type: 'string' },
    viaFieldId: { type: 'string' },
    relationshipType: { type: 'string', enum: ['LOOKUP', 'PARENT', 'ONE_TO_MANY', 'MANY_TO_MANY'] },
  },
  additionalProperties: false,
}

export async function systemRoutes(app: FastifyInstance) {
  // Systems CRUD
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return systemService.list(workspaceId)
  })

  app.post('/', { schema: { body: createSystemSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await systemService.create(workspaceId, request.body as systemService.CreateSystemBody)
    reply.status(201)
    return result
  })

  app.get('/:sId', async (request) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    return systemService.getById(workspaceId, sId)
  })

  app.patch('/:sId', { schema: { body: updateSystemSchema } }, async (request) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    return systemService.update(workspaceId, sId, request.body as systemService.UpdateSystemBody)
  })

  app.delete('/:sId', async (request) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    return systemService.remove(workspaceId, sId)
  })

  // System Entities
  app.get('/:sId/entities', async (request) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    return entityService.list(workspaceId, sId)
  })

  app.post('/:sId/entities', { schema: { body: createEntitySchema } }, async (request, reply) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    const result = await entityService.create(workspaceId, sId, request.body as entityService.CreateSystemEntityBody)
    reply.status(201)
    return result
  })

  app.get('/:sId/entities/:eId', async (request) => {
    const { workspaceId, sId, eId } = request.params as { workspaceId: string; sId: string; eId: string }
    return entityService.getById(workspaceId, sId, eId)
  })

  app.patch('/:sId/entities/:eId', { schema: { body: updateEntitySchema } }, async (request) => {
    const { workspaceId, sId, eId } = request.params as { workspaceId: string; sId: string; eId: string }
    return entityService.update(workspaceId, sId, eId, request.body as entityService.UpdateSystemEntityBody)
  })

  app.delete('/:sId/entities/:eId', async (request) => {
    const { workspaceId, sId, eId } = request.params as { workspaceId: string; sId: string; eId: string }
    return entityService.remove(workspaceId, sId, eId)
  })

  // System Entity Relationships
  app.get('/:sId/relationships', async (request) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    return relationshipService.list(workspaceId, sId)
  })

  app.post('/:sId/relationships', { schema: { body: createRelationshipSchema } }, async (request, reply) => {
    const { workspaceId, sId } = request.params as { workspaceId: string; sId: string }
    const result = await relationshipService.create(workspaceId, sId, request.body as relationshipService.CreateRelationshipBody)
    reply.status(201)
    return result
  })

  app.delete('/:sId/relationships/:rId', async (request) => {
    const { workspaceId, sId, rId } = request.params as { workspaceId: string; sId: string; rId: string }
    return relationshipService.remove(workspaceId, sId, rId)
  })
}
