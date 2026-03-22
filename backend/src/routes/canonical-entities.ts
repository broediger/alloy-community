import { FastifyInstance } from 'fastify'
import * as service from '../services/registry/canonical-entities.js'

const createSchema = {
  type: 'object',
  required: ['name', 'slug'],
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

const updateSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1 },
    description: { type: 'string' },
  },
  additionalProperties: false,
}

export async function canonicalEntityRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return service.list(workspaceId)
  })

  app.post('/', { schema: { body: createSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await service.create(workspaceId, request.body as service.CreateCanonicalEntityBody)
    reply.status(201)
    return result
  })

  app.get('/:eId', async (request) => {
    const { workspaceId, eId } = request.params as { workspaceId: string; eId: string }
    return service.getById(workspaceId, eId)
  })

  app.patch('/:eId', { schema: { body: updateSchema } }, async (request) => {
    const { workspaceId, eId } = request.params as { workspaceId: string; eId: string }
    return service.update(workspaceId, eId, request.body as service.UpdateCanonicalEntityBody)
  })

  app.delete('/:eId', async (request) => {
    const { workspaceId, eId } = request.params as { workspaceId: string; eId: string }
    return service.remove(workspaceId, eId)
  })
}
