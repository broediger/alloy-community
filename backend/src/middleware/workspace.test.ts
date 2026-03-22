import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerWorkspaceMiddleware } from './workspace.js'
import { registerErrorHandler } from '../plugins/error-handler.js'

// Mock prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

function buildTestApp() {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  app.register(async function (api) {
    registerWorkspaceMiddleware(api)
    api.get('/workspaces/:workspaceId/test', async (request) => {
      return { workspace: request.workspace }
    })
    api.get('/no-workspace', async () => {
      return { ok: true }
    })
  })
  return app
}

describe('workspace middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should attach workspace to request when workspace exists', async () => {
    const workspace = {
      id: 'ws-123',
      name: 'Test',
      slug: 'test',
      settings: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockPrisma.workspace.findUnique.mockResolvedValue(workspace)

    const app = buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/workspaces/ws-123/test',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.workspace.id).toBe('ws-123')
    expect(body.workspace.name).toBe('Test')
  })

  it('should return 404 when workspace does not exist', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)

    const app = buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/workspaces/nonexistent/test',
    })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.code).toBe('NOT_FOUND')
    expect(res.json().error.message).toBe('Workspace not found')
  })

  it('should not fire on routes without workspaceId', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/no-workspace',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().ok).toBe(true)
    expect(mockPrisma.workspace.findUnique).not.toHaveBeenCalled()
  })
})
