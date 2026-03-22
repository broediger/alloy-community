import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { systemRoutes } from './systems.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    system: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    systemEntity: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    systemEntityRelationship: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    systemField: {
      findFirst: vi.fn(),
    },
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }
const system = { id: 's-1', workspaceId: 'ws-1', name: 'Salesforce', description: null, systemType: 'REST', baseUrl: null, notes: null, createdAt: new Date(), updatedAt: new Date() }

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(systemRoutes, { prefix: '/workspaces/:workspaceId/systems' })
  })
  return app
}

describe('Systems CRUD', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET / should return systems with coverage counts', async () => {
    mockPrisma.system.findMany.mockResolvedValue([{
      ...system,
      entities: [{
        fields: [
          { _count: { mappings: 1 } },
          { _count: { mappings: 0 } },
        ],
      }],
    }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/systems' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.items[0].canonicalFieldCount).toBe(2)
    expect(body.items[0].mappedFieldCount).toBe(1)
  })

  it('POST / should create system', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(null)
    mockPrisma.system.create.mockResolvedValue(system)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/systems',
      payload: { name: 'Salesforce', systemType: 'REST' },
    })
    expect(res.statusCode).toBe(201)
  })

  it('POST / should return 409 on duplicate name', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(system)
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/systems',
      payload: { name: 'Salesforce', systemType: 'REST' },
    })
    expect(res.statusCode).toBe(409)
  })

  it('DELETE /:sId should return DELETE_CONFLICT when entities exist', async () => {
    mockPrisma.system.findFirst.mockResolvedValue({ ...system, _count: { entities: 3 } })
    const app = buildTestApp()
    const res = await app.inject({ method: 'DELETE', url: '/workspaces/ws-1/systems/s-1' })
    expect(res.statusCode).toBe(409)
  })
})

describe('System Entities', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET /:sId/entities should return list', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(system)
    mockPrisma.systemEntity.findMany.mockResolvedValue([{
      id: 'se-1', workspaceId: 'ws-1', systemId: 's-1', name: 'Account', slug: 'account',
      description: null, createdAt: new Date(), updatedAt: new Date(),
      fields: [{ _count: { mappings: 1 } }],
    }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/systems/s-1/entities' })
    expect(res.statusCode).toBe(200)
    expect(res.json().items[0].fieldCount).toBe(1)
    expect(res.json().items[0].mappedFieldCount).toBe(1)
  })

  it('GET /:sId/entities/:eId should return detail with fields and mappedTo', async () => {
    mockPrisma.systemEntity.findFirst.mockResolvedValue({
      id: 'se-1', workspaceId: 'ws-1', systemId: 's-1', name: 'Account', slug: 'account',
      description: null, createdAt: new Date(), updatedAt: new Date(),
      fields: [{
        id: 'sf-1', name: 'email', path: null, dataType: 'string',
        mappings: [{ canonicalField: { id: 'cf-1', name: 'email' } }],
      }],
    })
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/systems/s-1/entities/se-1' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.fields[0].mappedTo.canonicalFieldId).toBe('cf-1')
  })
})

describe('System Entity Relationships', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST should validate entities belong to system', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(system)
    mockPrisma.systemEntity.findFirst.mockResolvedValue(null) // source entity not found
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/systems/s-1/relationships',
      payload: {
        sourceEntityId: 'bad-id',
        targetEntityId: 'te-1',
        viaFieldId: 'vf-1',
        relationshipType: 'LOOKUP',
      },
    })
    expect(res.statusCode).toBe(400)
  })

  it('GET should return relationships with entity names', async () => {
    mockPrisma.system.findFirst.mockResolvedValue(system)
    mockPrisma.systemEntityRelationship.findMany.mockResolvedValue([{
      id: 'r-1', workspaceId: 'ws-1',
      sourceEntityId: 'se-1', sourceEntity: { id: 'se-1', name: 'Account' },
      targetEntityId: 'se-2', targetEntity: { id: 'se-2', name: 'Contact' },
      viaFieldId: 'sf-1', viaField: { id: 'sf-1', name: 'account_id' },
      relationshipType: 'LOOKUP',
      createdAt: new Date(), updatedAt: new Date(),
    }])
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/systems/s-1/relationships' })
    expect(res.statusCode).toBe(200)
    expect(res.json().items[0].sourceEntityName).toBe('Account')
  })
})
