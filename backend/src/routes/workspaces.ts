import { FastifyInstance } from 'fastify'
import * as workspaceService from '../services/registry/workspaces.js'

const createWorkspaceSchema = {
  type: 'object',
  required: ['name', 'slug'],
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1, pattern: '^[a-z0-9-]+$' },
    settings: {},
  },
  additionalProperties: false,
}

const updateWorkspaceSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    slug: { type: 'string', minLength: 1, pattern: '^[a-z0-9-]+$' },
    settings: {},
  },
  additionalProperties: false,
}

export async function workspaceRoutes(app: FastifyInstance) {
  app.get('/', async () => {
    return workspaceService.list()
  })

  app.post('/', { schema: { body: createWorkspaceSchema } }, async (request, reply) => {
    const result = await workspaceService.create(request.body as workspaceService.CreateWorkspaceBody)
    reply.status(201)
    return result
  })

  app.get('/:workspaceId', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return workspaceService.getById(workspaceId)
  })

  app.patch('/:workspaceId', { schema: { body: updateWorkspaceSchema } }, async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return workspaceService.update(workspaceId, request.body as workspaceService.UpdateWorkspaceBody)
  })

  app.delete('/:workspaceId', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return workspaceService.remove(workspaceId)
  })
}
