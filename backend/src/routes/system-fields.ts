import { FastifyInstance } from 'fastify'
import * as service from '../services/registry/system-fields.js'

const createSchema = {
  type: 'object',
  required: ['entityId', 'name', 'dataType'],
  properties: {
    entityId: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    path: { type: 'string' },
    dataType: { type: 'string', minLength: 1 },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
    required: { type: 'boolean' },
  },
  additionalProperties: false,
}

const updateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    path: { type: 'string' },
    dataType: { type: 'string', minLength: 1 },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
    required: { type: 'boolean' },
  },
  additionalProperties: false,
}

export async function systemFieldRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as Record<string, string>
    return service.list(workspaceId, {
      entityId: query.entityId,
      systemId: query.systemId,
      mapped: query.mapped,
      search: query.search,
    })
  })

  app.post('/', { schema: { body: createSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await service.create(workspaceId, request.body as service.CreateSystemFieldBody)
    reply.status(201)
    return result
  })

  app.get('/:sfId', async (request) => {
    const { workspaceId, sfId } = request.params as { workspaceId: string; sfId: string }
    return service.getById(workspaceId, sfId)
  })

  app.patch('/:sfId', { schema: { body: updateSchema } }, async (request) => {
    const { workspaceId, sfId } = request.params as { workspaceId: string; sfId: string }
    return service.update(workspaceId, sfId, request.body as service.UpdateSystemFieldBody)
  })

  app.delete('/:sfId', async (request) => {
    const { workspaceId, sfId } = request.params as { workspaceId: string; sfId: string }
    return service.remove(workspaceId, sfId)
  })
}
