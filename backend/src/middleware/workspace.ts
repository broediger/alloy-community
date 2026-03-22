import { FastifyInstance, FastifyRequest } from 'fastify'
import { prisma } from '../lib/prisma.js'
import { NotFoundError } from '../errors/index.js'

declare module 'fastify' {
  interface FastifyRequest {
    workspace: {
      id: string
      name: string
      slug: string
      settings: unknown
      createdAt: Date
      updatedAt: Date
    }
  }
}

export function registerWorkspaceMiddleware(app: FastifyInstance) {
  app.addHook(
    'preHandler',
    async (request: FastifyRequest<{ Params: { workspaceId?: string } }>) => {
      const { workspaceId } = request.params
      if (!workspaceId) return

      const workspace = await prisma.workspace.findUnique({
        where: { id: workspaceId },
      })
      if (!workspace) throw new NotFoundError('Workspace')

      // Ownership check — no-op in MVP, enforced post-MVP when userId is on request
      // if (workspace.ownerId !== request.user.id) throw new ForbiddenError()

      request.workspace = workspace
    }
  )
}
