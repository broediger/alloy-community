import { FastifyInstance } from 'fastify'
import * as versionService from '../services/registry/versions.js'

const cutVersionSchema = {
  type: 'object',
  required: ['label'],
  properties: {
    label: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    createdBy: { type: 'string' },
  },
  additionalProperties: false,
}

export async function versionRoutes(app: FastifyInstance) {
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    return versionService.list(workspaceId)
  })

  app.post('/', { schema: { body: cutVersionSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await versionService.cutVersion(workspaceId, request.body as versionService.CutVersionBody)
    reply.status(201)
    return result
  })

  app.get('/:vId', async (request) => {
    const { workspaceId, vId } = request.params as { workspaceId: string; vId: string }
    return versionService.getById(workspaceId, vId)
  })

  app.get('/:vId/diff', async (request) => {
    const { workspaceId, vId } = request.params as { workspaceId: string; vId: string }
    return versionService.getDiff(workspaceId, vId)
  })
}
