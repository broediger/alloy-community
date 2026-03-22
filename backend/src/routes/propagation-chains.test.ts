import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { propagationChainRoutes } from './propagation-chains.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    canonicalField: { findFirst: vi.fn() },
    system: { findFirst: vi.fn() },
    systemField: { findFirst: vi.fn() },
    propagationChain: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    propagationChainStep: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }
const chain = { id: 'pc-1', workspaceId: 'ws-1', canonicalFieldId: 'cf-1', systemId: 's-1', name: 'Chain', description: null, createdAt: new Date(), updatedAt: new Date() }

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(propagationChainRoutes, { prefix: '/workspaces/:workspaceId/propagation-chains' })
  })
  return app
}

describe('Propagation Chains', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET / should return chains with filters', async () => {
    mockPrisma.propagationChain.findMany.mockResolvedValue([])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/propagation-chains?systemId=s-1' })
    expect(res.statusCode).toBe(200)
  })

  it('POST / should validate canonical field and system belong to workspace', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/propagation-chains',
      payload: { canonicalFieldId: 'bad', systemId: 's-1', name: 'Chain' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET /:cId should return chain with steps', async () => {
    mockPrisma.propagationChain.findFirst.mockResolvedValue({
      ...chain,
      canonicalField: { id: 'cf-1', name: 'email' },
      system: { id: 's-1', name: 'SF' },
      steps: [{
        id: 'step-1', position: 0, stepType: 'CONVERSION', notes: null,
        systemField: { id: 'sf-1', name: 'email', entity: { id: 'se-1', name: 'Account' } },
      }],
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/propagation-chains/pc-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().steps).toHaveLength(1)
  })
})

describe('Propagation Chain Steps', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST should validate system field belongs to chain system', async () => {
    mockPrisma.propagationChain.findFirst.mockResolvedValue(chain)
    mockPrisma.systemField.findFirst.mockResolvedValue({
      id: 'sf-1', workspaceId: 'ws-1', entity: { systemId: 's-2' }, // different system
    })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/propagation-chains/pc-1/steps',
      payload: { systemFieldId: 'sf-1', stepType: 'CONVERSION' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].message).toContain('chain\'s system')
  })

  it('PUT /steps/reorder should validate IDs match', async () => {
    mockPrisma.propagationChain.findFirst.mockResolvedValue(chain)
    mockPrisma.propagationChainStep.findMany.mockResolvedValue([{ id: 'step-1' }, { id: 'step-2' }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/propagation-chains/pc-1/steps/reorder',
      payload: { ids: ['step-1'] },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DELETE /steps/:stepId should delete step', async () => {
    mockPrisma.propagationChain.findFirst.mockResolvedValue(chain)
    mockPrisma.propagationChainStep.findFirst.mockResolvedValue({ id: 'step-1', chainId: 'pc-1' })
    mockPrisma.propagationChainStep.delete.mockResolvedValue({})
    const app = buildTestApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/workspaces/ws-1/propagation-chains/pc-1/steps/step-1',
    })
    expect(res.statusCode).toBe(200)
  })
})
