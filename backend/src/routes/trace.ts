import { FastifyInstance } from 'fastify'
import { traceCanonicalField } from '../services/trace/trace-engine.js'
import { NotFoundError } from '../errors/index.js'

export async function traceRoutes(app: FastifyInstance) {
  app.get('/:canonicalFieldId', async (request) => {
    const { workspaceId, canonicalFieldId } = request.params as {
      workspaceId: string
      canonicalFieldId: string
    }
    const result = await traceCanonicalField(workspaceId, canonicalFieldId)
    if (!result) throw new NotFoundError('Canonical field')
    return result
  })
}
