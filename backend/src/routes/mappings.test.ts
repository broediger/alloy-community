import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { mappingRoutes } from './mappings.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    canonicalField: { findFirst: vi.fn() },
    canonicalSubfield: { findFirst: vi.fn() },
    systemField: { findFirst: vi.fn() },
    mapping: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    transformationRule: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    valueMapEntry: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    composeRuleField: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    decomposeRuleField: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }
const mapping = {
  id: 'm-1', workspaceId: 'ws-1', canonicalFieldId: 'cf-1', canonicalSubfieldId: null,
  systemFieldId: 'sf-1', notes: null, deprecated: false, createdAt: new Date(), updatedAt: new Date(),
}

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(mappingRoutes, { prefix: '/workspaces/:workspaceId/mappings' })
  })
  return app
}

describe('Mappings CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST / should validate XOR — both set', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/mappings',
      payload: { canonicalFieldId: 'cf-1', canonicalSubfieldId: 'csf-1', systemFieldId: 'sf-1' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })

  it('POST / should validate XOR — neither set', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/mappings',
      payload: { systemFieldId: 'sf-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST / should require systemFieldId unless COMPOSE/DECOMPOSE', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'cf-1' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/mappings',
      payload: { canonicalFieldId: 'cf-1' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].field).toBe('systemFieldId')
  })

  it('POST / should allow missing systemFieldId for COMPOSE', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'cf-1' })
    mockPrisma.mapping.create.mockResolvedValue({
      ...mapping, systemFieldId: null,
      canonicalField: { id: 'cf-1', name: 'addr' },
      canonicalSubfield: null,
      systemField: null,
    })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/mappings',
      payload: { canonicalFieldId: 'cf-1', ruleType: 'COMPOSE' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST / should validate workspace scope', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue(null) // Not found in workspace
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/mappings',
      payload: { canonicalFieldId: 'bad-cf', systemFieldId: 'sf-1' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET / should return list with filters', async () => {
    mockPrisma.mapping.findMany.mockResolvedValue([])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/mappings?deprecated=false' })
    expect(res.statusCode).toBe(200)
  })

  it('GET /:mId should return mapping with rule', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue({
      ...mapping,
      canonicalField: { id: 'cf-1', name: 'email' },
      canonicalSubfield: null,
      systemField: { id: 'sf-1', name: 'email', entityId: 'se-1' },
      transformationRule: {
        id: 'tr-1', type: 'RENAME', config: null,
        valueMapEntries: [], composeRuleFields: [], decomposeRuleFields: [],
      },
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/mappings/m-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().transformationRule.type).toBe('RENAME')
  })

  it('DELETE /:mId should cascade delete', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    mockPrisma.$transaction.mockResolvedValue(undefined)
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/mappings/m-1' })
    expect(res.statusCode).toBe(200)
  })
})

describe('Transformation Rules', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('PUT /:mId/rule should create RENAME rule', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    mockPrisma.$transaction.mockResolvedValue({
      id: 'tr-1', type: 'RENAME', config: null,
      valueMapEntries: [], composeRuleFields: [], decomposeRuleFields: [],
    })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/mappings/m-1/rule',
      payload: { type: 'RENAME' },
    })
    expect(res.statusCode).toBe(200)
  })

  it('PUT /:mId/rule should validate TYPE_CAST config', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/mappings/m-1/rule',
      payload: { type: 'TYPE_CAST', config: {} },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].field).toBe('config')
  })

  it('PUT /:mId/rule should validate VALUE_MAP entries', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/mappings/m-1/rule',
      payload: { type: 'VALUE_MAP' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PUT /:mId/rule should validate fromValue uniqueness', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/mappings/m-1/rule',
      payload: {
        type: 'VALUE_MAP',
        entries: [
          { fromValue: 'A', toValue: 'X' },
          { fromValue: 'A', toValue: 'Y' },
        ],
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('DELETE /:mId/rule should remove rule', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    mockPrisma.transformationRule.findUnique.mockResolvedValue({ id: 'tr-1' })
    mockPrisma.$transaction.mockResolvedValue(undefined)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/workspaces/ws-1/mappings/m-1/rule',
    })
    expect(res.statusCode).toBe(200)
  })

  it('DELETE /:mId/rule should return 404 when no rule', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValue(mapping)
    mockPrisma.transformationRule.findUnique.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/workspaces/ws-1/mappings/m-1/rule',
    })
    expect(res.statusCode).toBe(404)
  })
})
