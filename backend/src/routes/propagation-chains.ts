import { FastifyInstance } from 'fastify'
import * as service from '../services/mappings/propagation-chains.js'

const createChainSchema = {
  type: 'object',
  required: ['canonicalFieldId', 'systemId', 'name'],
  properties: {
    canonicalFieldId: { type: 'string' },
    systemId: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

const updateChainSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

const createStepSchema = {
  type: 'object',
  required: ['systemFieldId', 'stepType'],
  properties: {
    systemFieldId: { type: 'string' },
    stepType: { type: 'string', enum: ['CONVERSION', 'LOOKUP'] },
    notes: { type: 'string' },
  },
  additionalProperties: false,
}

const updateStepSchema = {
  type: 'object',
  properties: {
    stepType: { type: 'string', enum: ['CONVERSION', 'LOOKUP'] },
    notes: { type: 'string' },
  },
  additionalProperties: false,
}

const reorderSchema = {
  type: 'object',
  required: ['ids'],
  properties: {
    ids: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
}

export async function propagationChainRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as Record<string, string>
    return service.list(workspaceId, {
      canonicalFieldId: query.canonicalFieldId,
      systemId: query.systemId,
    })
  })

  app.post('/', { schema: { body: createChainSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await service.create(workspaceId, request.body as service.CreateChainBody)
    reply.status(201)
    return result
  })

  app.get('/:cId', async (request) => {
    const { workspaceId, cId } = request.params as { workspaceId: string; cId: string }
    return service.getById(workspaceId, cId)
  })

  app.patch('/:cId', { schema: { body: updateChainSchema } }, async (request) => {
    const { workspaceId, cId } = request.params as { workspaceId: string; cId: string }
    return service.update(workspaceId, cId, request.body as service.UpdateChainBody)
  })

  app.delete('/:cId', async (request) => {
    const { workspaceId, cId } = request.params as { workspaceId: string; cId: string }
    return service.remove(workspaceId, cId)
  })

  // Steps
  app.post('/:cId/steps', { schema: { body: createStepSchema } }, async (request, reply) => {
    const { workspaceId, cId } = request.params as { workspaceId: string; cId: string }
    const result = await service.createStep(workspaceId, cId, request.body as service.CreateStepBody)
    reply.status(201)
    return result
  })

  app.patch('/:cId/steps/:stepId', { schema: { body: updateStepSchema } }, async (request) => {
    const { workspaceId, cId, stepId } = request.params as { workspaceId: string; cId: string; stepId: string }
    return service.updateStep(workspaceId, cId, stepId, request.body as service.UpdateStepBody)
  })

  app.delete('/:cId/steps/:stepId', async (request) => {
    const { workspaceId, cId, stepId } = request.params as { workspaceId: string; cId: string; stepId: string }
    return service.removeStep(workspaceId, cId, stepId)
  })

  app.put('/:cId/steps/reorder', { schema: { body: reorderSchema } }, async (request) => {
    const { workspaceId, cId } = request.params as { workspaceId: string; cId: string }
    const { ids } = request.body as { ids: string[] }
    return service.reorderSteps(workspaceId, cId, ids)
  })
}
