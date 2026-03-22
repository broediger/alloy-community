import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { canonicalFieldRoutes } from './canonical-fields.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    canonicalEntity: { findFirst: vi.fn() },
    canonicalField: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    canonicalSubfield: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    canonicalFieldExample: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    canonicalEnumValue: {
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
const field = {
  id: 'f-1', workspaceId: 'ws-1', entityId: 'e-1', name: 'email', displayName: 'Email',
  description: null, dataType: 'STRING', format: null, nullable: true, minValue: null, maxValue: null,
  isComposite: false, compositionPattern: null, tags: [], createdAt: new Date(), updatedAt: new Date(),
}

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(canonicalFieldRoutes, { prefix: '/workspaces/:workspaceId/canonical-fields' })
  })
  return app
}

describe('Canonical Fields', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  describe('GET /', () => {
    it('should return list with mappingCount', async () => {
      mockPrisma.canonicalField.findMany.mockResolvedValue([{ ...field, _count: { mappings: 2 } }])
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-fields' })
      expect(res.statusCode).toBe(200)
      expect(res.json().items[0].mappingCount).toBe(2)
    })

    it('should filter by entityId', async () => {
      mockPrisma.canonicalField.findMany.mockResolvedValue([])
      const app = buildTestApp()
      await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-fields?entityId=e-1' })
      expect(mockPrisma.canonicalField.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ entityId: 'e-1' }) })
      )
    })

    it('should filter by mapped=true', async () => {
      mockPrisma.canonicalField.findMany.mockResolvedValue([
        { ...field, _count: { mappings: 2 } },
        { ...field, id: 'f-2', _count: { mappings: 0 } },
      ])
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-fields?mapped=true' })
      expect(res.json().items).toHaveLength(1)
    })
  })

  describe('POST /', () => {
    it('should create a field', async () => {
      mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1' })
      mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
      mockPrisma.canonicalField.create.mockResolvedValue(field)
      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST',
        url: '/workspaces/ws-1/canonical-fields',
        payload: { entityId: 'e-1', name: 'email', displayName: 'Email', dataType: 'STRING' },
      })
      expect(res.statusCode).toBe(201)
    })

    it('should allow isComposite without subfields', async () => {
      mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1' })
      mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
      mockPrisma.canonicalField.create.mockResolvedValue({ ...field, isComposite: true })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST',
        url: '/workspaces/ws-1/canonical-fields',
        payload: { entityId: 'e-1', name: 'address', displayName: 'Address', dataType: 'OBJECT', isComposite: true },
      })
      expect(res.statusCode).toBe(201)
    })

    it('should allow dataType ENUM without enumValues', async () => {
      mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1' })
      mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
      mockPrisma.canonicalField.create.mockResolvedValue({ ...field, dataType: 'ENUM' })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST',
        url: '/workspaces/ws-1/canonical-fields',
        payload: { entityId: 'e-1', name: 'status', displayName: 'Status', dataType: 'ENUM' },
      })
      expect(res.statusCode).toBe(201)
    })
  })

  describe('GET /:fId', () => {
    it('should return field with subfields, examples, enumValues', async () => {
      mockPrisma.canonicalField.findFirst.mockResolvedValue({
        ...field,
        subfields: [{ id: 'sf-1', name: 'street' }],
        examples: [{ id: 'ex-1', value: 'test@email.com' }],
        enumValues: [],
        _count: { mappings: 1 },
      })
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/canonical-fields/f-1' })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.subfields).toHaveLength(1)
      expect(body.examples).toHaveLength(1)
      expect(body.mappingCount).toBe(1)
    })
  })

  describe('DELETE /:fId', () => {
    it('should return DELETE_CONFLICT when mappings or interfaceFields exist', async () => {
      mockPrisma.canonicalField.findFirst.mockResolvedValue({
        ...field,
        _count: { mappings: 3, interfaceFields: 1 },
      })
      const app = buildTestApp()
      const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/canonical-fields/f-1' })
      expect(res.statusCode).toBe(409)
      expect(res.json().error.details).toHaveLength(2)
    })
  })
})

describe('Subfields', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST should create subfield with auto position', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalSubfield.findFirst.mockResolvedValue(null)
    mockPrisma.canonicalSubfield.aggregate.mockResolvedValue({ _max: { position: 1 } })
    mockPrisma.canonicalSubfield.create.mockResolvedValue({ id: 'sf-1', position: 2 })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/canonical-fields/f-1/subfields',
      payload: { name: 'street', displayName: 'Street', dataType: 'STRING' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('PUT /reorder should validate IDs', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalSubfield.findMany.mockResolvedValue([{ id: 'sf-1' }, { id: 'sf-2' }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/canonical-fields/f-1/subfields/reorder',
      payload: { ids: ['sf-1'] }, // Missing sf-2
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.code).toBe('VALIDATION_ERROR')
  })
})

describe('Examples', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST should create example', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalFieldExample.create.mockResolvedValue({ id: 'ex-1', value: 'test@email.com' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/canonical-fields/f-1/examples',
      payload: { value: 'test@email.com' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('DELETE should return 404 when not found', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalFieldExample.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'DELETE',
      url: '/workspaces/ws-1/canonical-fields/f-1/examples/bad-id',
    })
    expect(res.statusCode).toBe(404)
  })
})

describe('Enum Values', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET should return enum values ordered by position', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalEnumValue.findMany.mockResolvedValue([
      { id: 'ev-1', code: 'ACTIVE', label: 'Active', position: 0 },
      { id: 'ev-2', code: 'INACTIVE', label: 'Inactive', position: 1 },
    ])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'GET',
      url: '/workspaces/ws-1/canonical-fields/f-1/enum-values',
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().items).toHaveLength(2)
  })

  it('POST should validate unique code', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalEnumValue.findFirst.mockResolvedValue({ id: 'ev-1', code: 'ACTIVE' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/canonical-fields/f-1/enum-values',
      payload: { code: 'ACTIVE', label: 'Active' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('PUT /reorder should validate IDs match', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'f-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalEnumValue.findMany.mockResolvedValue([{ id: 'ev-1' }, { id: 'ev-2' }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PUT',
      url: '/workspaces/ws-1/canonical-fields/f-1/enum-values/reorder',
      payload: { ids: ['ev-1', 'ev-3'] },
    })
    expect(res.statusCode).toBe(400)
  })
})
