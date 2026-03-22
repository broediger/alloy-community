import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { canonicalEntityRoutes } from './canonical-entities.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    canonicalEntity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }
const entity = { id: 'e-1', workspaceId: 'ws-1', name: 'Customer', slug: 'customer', description: null, createdAt: new Date(), updatedAt: new Date() }

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(canonicalEntityRoutes, { prefix: '/workspaces/:workspaceId/canonical-entities' })
  })
  return app
}

describe('Canonical Entities CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET / should return list with counts', async () => {
    mockPrisma.canonicalEntity.findMany.mockResolvedValue([{
      ...entity,
      _count: { fields: 3 },
      fields: [
        { id: 'f1', _count: { mappings: 1 } },
        { id: 'f2', _count: { mappings: 0 } },
        { id: 'f3', _count: { mappings: 2 } },
      ],
    }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-entities' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items[0].fieldCount).toBe(3)
    expect(body.items[0].mappedFieldCount).toBe(2)
  })

  it('POST / should create entity', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue(null)
    mockPrisma.canonicalEntity.create.mockResolvedValue(entity)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/canonical-entities',
      payload: { name: 'Customer', slug: 'customer' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST / should return 409 on duplicate slug', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue(entity)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/canonical-entities',
      payload: { name: 'Customer', slug: 'customer' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('GET /:eId should return entity detail', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue(entity)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-entities/e-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe('e-1')
  })

  it('GET /:eId should return 404 when not found', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-entities/bad-id' })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /:eId should return DELETE_CONFLICT when fields exist', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ ...entity, _count: { fields: 5 } })
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/canonical-entities/e-1' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('DELETE_CONFLICT')
    expect(res.json().error.details[0].count).toBe(5)
  })

  it('DELETE /:eId should succeed when no fields', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ ...entity, _count: { fields: 0 } })
    mockPrisma.canonicalEntity.delete.mockResolvedValue(entity)
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/canonical-entities/e-1' })
    expect(res.statusCode).toBe(200)
  })

  it('should return 404 when workspace not found', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/bad/canonical-entities' })
    expect(res.statusCode).toBe(404)
    expect(res.json().error.message).toBe('Workspace not found')
  })
})
