import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { interfaceRoutes } from './interfaces.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    system: { findFirst: vi.fn() },
    canonicalField: { findFirst: vi.fn() },
    interface: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    interfaceEntityBinding: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    interfaceField: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mapping: {
      findFirst: vi.fn(),
    },
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
    api.register(interfaceRoutes, { prefix: '/workspaces/:workspaceId/interfaces' })
  })
  return app
}

describe('Interfaces CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST / should validate sourceSystemId !== targetSystemId', async () => {
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/interfaces',
      payload: { name: 'Test', sourceSystemId: 's-1', targetSystemId: 's-1', direction: 'REQUEST_RESPONSE' },
    })
    expect(res.statusCode).toBe(400)
    expect(res.json().error.details[0].message).toContain('different')
  })

  it('POST / should validate systems belong to workspace', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/interfaces',
      payload: { name: 'Test', sourceSystemId: 'bad', targetSystemId: 's-2', direction: 'REQUEST_RESPONSE' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('POST / should create interface', async () => {
    mockPrisma.system.findFirst
      .mockResolvedValueOnce({ id: 's-1' }) // source
      .mockResolvedValueOnce({ id: 's-2' }) // target
    mockPrisma.interface.create.mockResolvedValue({
      id: 'i-1', workspaceId: 'ws-1', name: 'Test',
      sourceSystem: { id: 's-1', name: 'Source' },
      targetSystem: { id: 's-2', name: 'Target' },
      entityBindings: [],
    })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/interfaces',
      payload: { name: 'Test', sourceSystemId: 's-1', targetSystemId: 's-2', direction: 'REQUEST_RESPONSE' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('GET /:iId should resolve source and target mappings', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({
      id: 'i-1', workspaceId: 'ws-1', name: 'Test', description: null,
      sourceSystemId: 's-1', targetSystemId: 's-2',
      sourceSystem: { id: 's-1', name: 'Source' },
      targetSystem: { id: 's-2', name: 'Target' },
      entityBindings: [],
      direction: 'REQUEST_RESPONSE',
      createdAt: new Date(), updatedAt: new Date(),
      fields: [{
        id: 'if-1', interfaceId: 'i-1', canonicalFieldId: 'cf-1', status: 'MANDATORY',
        createdAt: new Date(), updatedAt: new Date(),
        canonicalField: { id: 'cf-1', name: 'email', displayName: 'Email', dataType: 'STRING' },
      }],
    })
    // Source mapping exists, target mapping is null
    mockPrisma.mapping.findFirst
      .mockResolvedValueOnce({
        id: 'm-1',
        systemField: { id: 'sf-1', name: 'email_addr', entityId: 'se-1' },
        deprecated: false,
        transformationRule: { id: 'tr-1', type: 'RENAME' },
      })
      .mockResolvedValueOnce(null) // no target mapping

    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/interfaces/i-1' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.fields[0].sourceMapping).not.toBeNull()
    expect(body.fields[0].sourceMapping.systemFieldName).toBe('email_addr')
    expect(body.fields[0].targetMapping).toBeNull()
  })

  it('DELETE /:iId should cascade', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({ id: 'i-1', workspaceId: 'ws-1' })
    mockPrisma.interface.delete.mockResolvedValue({})
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/interfaces/i-1' })
    expect(res.statusCode).toBe(200)
  })
})

describe('Interface Fields', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST should validate unique canonicalFieldId per interface', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({ id: 'i-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalField.findFirst.mockResolvedValue({ id: 'cf-1' })
    mockPrisma.interfaceField.findFirst.mockResolvedValue({ id: 'if-existing' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/interfaces/i-1/fields',
      payload: { canonicalFieldId: 'cf-1', status: 'MANDATORY' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('POST should validate canonicalFieldId belongs to workspace', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({ id: 'i-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/interfaces/i-1/fields',
      payload: { canonicalFieldId: 'bad', status: 'MANDATORY' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('PATCH should update status', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({ id: 'i-1', workspaceId: 'ws-1' })
    mockPrisma.interfaceField.findFirst.mockResolvedValue({ id: 'if-1', interfaceId: 'i-1' })
    mockPrisma.interfaceField.update.mockResolvedValue({ id: 'if-1', status: 'OPTIONAL' })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'PATCH',
      url: '/workspaces/ws-1/interfaces/i-1/fields/if-1',
      payload: { status: 'OPTIONAL' },
    })
    expect(res.statusCode).toBe(200)
  })
})
