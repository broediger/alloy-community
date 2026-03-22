import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { workspaceRoutes } from './workspaces.js'

// Mock prisma
vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(workspaceRoutes, { prefix: '/workspaces' })
  return app
}

const sampleWorkspace = {
  id: 'ws-1',
  name: 'Test Workspace',
  slug: 'test-workspace',
  settings: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
}

describe('GET /workspaces', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return list with counts', async () => {
    mockPrisma.workspace.findMany.mockResolvedValue([
      {
        ...sampleWorkspace,
        _count: { canonicalFields: 10, systems: 2, interfaces: 3 },
      },
    ])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items).toHaveLength(1)
    expect(body.total).toBe(1)
    expect(body.items[0].canonicalFieldCount).toBe(10)
    expect(body.items[0].systemCount).toBe(2)
    expect(body.items[0].interfaceCount).toBe(3)
  })
})

describe('POST /workspaces', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should create a workspace', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    mockPrisma.workspace.create.mockResolvedValue(sampleWorkspace)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces',
      payload: { name: 'Test Workspace', slug: 'test-workspace' },
    })
    expect(res.statusCode).toBe(201)
    expect(res.json().id).toBe('ws-1')
  })

  it('should return 409 on duplicate slug', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(sampleWorkspace)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces',
      payload: { name: 'Other', slug: 'test-workspace' },
    })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('CONFLICT')
  })

  it('should return 400 on missing required fields', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces',
      payload: {},
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })
})

describe('GET /workspaces/:workspaceId', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should return a workspace', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(sampleWorkspace)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().id).toBe('ws-1')
  })

  it('should return 404 when not found', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/nonexistent' })
    expect(res.statusCode).toBe(404)
  })
})

describe('PATCH /workspaces/:workspaceId', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should update a workspace', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(sampleWorkspace)
    mockPrisma.workspace.update.mockResolvedValue({ ...sampleWorkspace, name: 'Updated' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/workspaces/ws-1',
      payload: { name: 'Updated' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().name).toBe('Updated')
  })

  it('should return 404 when workspace not found', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/workspaces/nonexistent',
      payload: { name: 'Updated' },
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('DELETE /workspaces/:workspaceId', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('should delete workspace with no dependents', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({
      ...sampleWorkspace,
      _count: { canonicalEntities: 0, systems: 0, interfaces: 0 },
    })
    mockPrisma.workspace.delete.mockResolvedValue(sampleWorkspace)
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().success).toBe(true)
  })

  it('should return DELETE_CONFLICT when dependents exist', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue({
      ...sampleWorkspace,
      _count: { canonicalEntities: 2, systems: 1, interfaces: 0 },
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('DELETE_CONFLICT')
    expect(res.json().error.details).toHaveLength(2)
  })

  it('should return 404 when workspace not found', async () => {
    mockPrisma.workspace.findUnique.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/nonexistent' })
    expect(res.statusCode).toBe(404)
  })
})
