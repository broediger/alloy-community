import { FastifyInstance } from 'fastify'
import * as mappingService from '../services/mappings/mappings.js'
import * as ruleService from '../services/mappings/transformation-rules.js'

const createMappingSchema = {
  type: 'object',
  properties: {
    canonicalFieldId: { type: 'string' },
    canonicalSubfieldId: { type: 'string' },
    systemFieldId: { type: 'string' },
    systemEntityId: { type: 'string' },
    ruleType: { type: 'string', enum: ['RENAME', 'TYPE_CAST', 'VALUE_MAP', 'CONDITIONAL', 'FORMULA', 'COMPOSE', 'DECOMPOSE'] },
    notes: { type: 'string' },
    deprecated: { type: 'boolean' },
  },
  additionalProperties: false,
}

const updateMappingSchema = {
  type: 'object',
  properties: {
    notes: { type: 'string' },
    deprecated: { type: 'boolean' },
  },
  additionalProperties: false,
}

const putRuleSchema = {
  type: 'object',
  required: ['type'],
  properties: {
    type: { type: 'string', enum: ['RENAME', 'TYPE_CAST', 'VALUE_MAP', 'CONDITIONAL', 'FORMULA', 'COMPOSE', 'DECOMPOSE'] },
    config: { type: 'object' },
    entries: {
      type: 'array',
      items: {
        type: 'object',
        required: ['fromValue', 'toValue'],
        properties: {
          fromValue: { type: 'string' },
          toValue: { type: 'string' },
          bidirectional: { type: 'boolean' },
        },
      },
    },
    fields: {
      type: 'array',
      items: {
        type: 'object',
        required: ['systemFieldId', 'subfieldId', 'position'],
        properties: {
          systemFieldId: { type: 'string' },
          subfieldId: { type: 'string' },
          position: { type: 'integer' },
        },
      },
    },
  },
  additionalProperties: false,
}

export async function mappingRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as Record<string, string>
    return mappingService.list(workspaceId, {
      canonicalFieldId: query.canonicalFieldId,
      systemId: query.systemId,
      entityId: query.entityId,
      deprecated: query.deprecated,
    })
  })

  app.post('/', { schema: { body: createMappingSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await mappingService.create(workspaceId, request.body as mappingService.CreateMappingBody)
    reply.status(201)
    return result
  })

  app.get('/:mId', async (request) => {
    const { workspaceId, mId } = request.params as { workspaceId: string; mId: string }
    return mappingService.getById(workspaceId, mId)
  })

  app.patch('/:mId', { schema: { body: updateMappingSchema } }, async (request) => {
    const { workspaceId, mId } = request.params as { workspaceId: string; mId: string }
    return mappingService.update(workspaceId, mId, request.body as mappingService.UpdateMappingBody)
  })

  app.delete('/:mId', async (request) => {
    const { workspaceId, mId } = request.params as { workspaceId: string; mId: string }
    return mappingService.remove(workspaceId, mId)
  })

  // Transformation Rules
  app.put('/:mId/rule', { schema: { body: putRuleSchema } }, async (request) => {
    const { workspaceId, mId } = request.params as { workspaceId: string; mId: string }
    return ruleService.putRule(workspaceId, mId, request.body as ruleService.PutRuleBody)
  })

  app.delete('/:mId/rule', async (request) => {
    const { workspaceId, mId } = request.params as { workspaceId: string; mId: string }
    return ruleService.deleteRule(workspaceId, mId)
  })
}
