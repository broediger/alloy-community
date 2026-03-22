import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { versionRoutes } from './versions.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    modelVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    modelVersionSnapshot: {
      create: vi.fn(),
    },
    modelVersionDiff: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    canonicalEntity: { findMany: vi.fn() },
    canonicalField: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(versionRoutes, { prefix: '/workspaces/:workspaceId/versions' })
  })
  return app
}

describe('Versions', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET / should return version list with field count', async () => {
    mockPrisma.modelVersion.findMany.mockResolvedValue([{
      id: 'v-1', workspaceId: 'ws-1', label: 'v1.0', description: null,
      createdAt: new Date(), createdBy: null,
      snapshot: { snapshot: { canonicalFields: [{ id: 'f1' }, { id: 'f2' }] } },
    }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/versions' })
    expect(res.statusCode).toBe(200)
    expect(res.json().items[0].fieldCount).toBe(2)
  })

  it('POST / should cut version', async () => {
    // No existing version
    mockPrisma.modelVersion.findFirst
      .mockResolvedValueOnce(null)  // label check
      .mockResolvedValueOnce(null)  // previous version

    mockPrisma.canonicalEntity.findMany.mockResolvedValue([])
    mockPrisma.canonicalField.findMany.mockResolvedValue([{
      id: 'f-1', name: 'email', entityId: 'e-1', dataType: 'STRING',
      displayName: 'Email', nullable: true, description: null,
      subfields: [], examples: [], enumValues: [],
    }])
    mockPrisma.$transaction.mockResolvedValue({
      id: 'v-1', label: 'v1.0', workspaceId: 'ws-1',
    })

    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/versions',
      payload: { label: 'v1.0' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST / should return 409 on duplicate label', async () => {
    mockPrisma.modelVersion.findFirst.mockResolvedValue({ id: 'v-existing', label: 'v1.0' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/versions',
      payload: { label: 'v1.0' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('GET /:vId should return version with snapshot', async () => {
    mockPrisma.modelVersion.findFirst.mockResolvedValue({
      id: 'v-1', workspaceId: 'ws-1', label: 'v1.0', description: null,
      createdAt: new Date(), createdBy: null,
      snapshot: { snapshot: { canonicalEntities: [], canonicalFields: [] } },
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/versions/v-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().snapshot).toBeTruthy()
  })

  it('GET /:vId/diff should return diff', async () => {
    mockPrisma.modelVersion.findFirst.mockResolvedValue({ id: 'v-1' })
    mockPrisma.modelVersionDiff.findFirst.mockResolvedValue({
      diff: { added: [{ fieldId: 'f-1', name: 'email' }], removed: [], changed: [] },
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/versions/v-1/diff' })
    expect(res.statusCode).toBe(200)
    expect(res.json().added).toHaveLength(1)
  })

  it('GET /:vId/diff should return empty diff when no diff record', async () => {
    mockPrisma.modelVersion.findFirst.mockResolvedValue({ id: 'v-1' })
    mockPrisma.modelVersionDiff.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/versions/v-1/diff' })
    expect(res.statusCode).toBe(200)
    expect(res.json()).toEqual({ added: [], removed: [], changed: [] })
  })
})
