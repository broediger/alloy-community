import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { systemFieldRoutes } from './system-fields.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    systemEntity: { findFirst: vi.fn() },
    systemField: {
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
const sysField = {
  id: 'sf-1', workspaceId: 'ws-1', entityId: 'se-1', name: 'email', path: null,
  dataType: 'string', format: null, nullable: true, required: false,
  createdAt: new Date(), updatedAt: new Date(),
}

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(systemFieldRoutes, { prefix: '/workspaces/:workspaceId/system-fields' })
  })
  return app
}

describe('System Fields', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET / should return list with mappingCount', async () => {
    mockPrisma.systemField.findMany.mockResolvedValue([{ ...sysField, _count: { mappings: 1 } }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/system-fields' })
    expect(res.statusCode).toBe(200)
    expect(res.json().items[0].mappingCount).toBe(1)
  })

  it('GET / should filter by mapped=false', async () => {
    mockPrisma.systemField.findMany.mockResolvedValue([
      { ...sysField, _count: { mappings: 1 } },
      { ...sysField, id: 'sf-2', _count: { mappings: 0 } },
    ])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/system-fields?mapped=false' })
    expect(res.json().items).toHaveLength(1)
    expect(res.json().items[0].id).toBe('sf-2')
  })

  it('GET /:sfId should return field with mapping info', async () => {
    mockPrisma.systemField.findFirst.mockResolvedValue({
      ...sysField,
      mappings: [{
        id: 'm-1',
        canonicalField: { id: 'cf-1', name: 'email' },
        deprecated: false,
        transformationRule: { type: 'RENAME' },
      }],
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/system-fields/sf-1' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.mapping.canonicalFieldId).toBe('cf-1')
    expect(body.mapping.transformationRule.type).toBe('RENAME')
  })

  it('POST / should validate entityId belongs to workspace', async () => {
    mockPrisma.systemEntity.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/system-fields',
      payload: { entityId: 'bad-id', name: 'email', dataType: 'string' },
    })
    expect(res.statusCode).toBe(404)
  })

  it('DELETE /:sfId should return DELETE_CONFLICT when mapping exists', async () => {
    mockPrisma.systemField.findFirst.mockResolvedValue({ ...sysField, _count: { mappings: 2 } })
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/system-fields/sf-1' })
    expect(res.statusCode).toBe(409)
    expect(res.json().error.code).toBe('DELETE_CONFLICT')
  })
})
