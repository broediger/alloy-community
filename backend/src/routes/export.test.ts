import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { exportRoutes } from './export.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    system: { findFirst: vi.fn(), findMany: vi.fn() },
    canonicalEntity: { findMany: vi.fn(), findFirst: vi.fn() },
    canonicalField: { findMany: vi.fn() },
    canonicalSubfield: { findMany: vi.fn() },
    canonicalFieldExample: { findMany: vi.fn() },
    canonicalEnumValue: { findMany: vi.fn() },
    systemEntity: { findMany: vi.fn() },
    systemField: { findMany: vi.fn() },
    systemEntityRelationship: { findMany: vi.fn() },
    mapping: { findMany: vi.fn() },
    transformationRule: { findMany: vi.fn() },
    valueMapEntry: { findMany: vi.fn() },
    composeRuleField: { findMany: vi.fn() },
    decomposeRuleField: { findMany: vi.fn() },
    propagationChain: { findMany: vi.fn() },
    propagationChainStep: { findMany: vi.fn() },
    interface: { findMany: vi.fn(), findFirst: vi.fn() },
    interfaceField: { findMany: vi.fn() },
    modelVersion: { findMany: vi.fn(), findFirst: vi.fn() },
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
    api.register(exportRoutes, { prefix: '/workspaces/:workspaceId/export' })
  })
  return app
}

describe('OpenAPI Export', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST /openapi should generate JSON', async () => {
    mockPrisma.system.findFirst.mockResolvedValue({
      id: 's-1', name: 'Salesforce', description: 'CRM', baseUrl: 'https://api.sf.com',
    })
    mockPrisma.canonicalEntity.findMany.mockResolvedValue([
      { id: 'e-1', name: 'Customer', slug: 'customer' },
    ])
    mockPrisma.canonicalField.findMany.mockResolvedValue([{
      id: 'f-1', entityId: 'e-1', name: 'email', displayName: 'Email',
      dataType: 'STRING', format: null, nullable: true, description: 'Customer email',
      isComposite: false, subfields: [], examples: [{ value: 'test@example.com' }],
      enumValues: [],
    }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/export/openapi',
      payload: { systemId: 's-1', format: 'json' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['content-disposition']).toContain('attachment')
    const spec = JSON.parse(res.payload)
    expect(spec.openapi).toBe('3.0.0')
    expect(spec.components.schemas.Customer.properties.email).toBeDefined()
    expect(spec.components.schemas.Customer.properties.email.nullable).toBe(true)
    expect(spec.components.schemas.Customer.properties.email.example).toBe('test@example.com')
  })

  it('POST /openapi should generate YAML', async () => {
    mockPrisma.system.findFirst.mockResolvedValue({
      id: 's-1', name: 'Salesforce', description: null, baseUrl: null,
    })
    mockPrisma.canonicalEntity.findMany.mockResolvedValue([])
    mockPrisma.canonicalField.findMany.mockResolvedValue([])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/export/openapi',
      payload: { systemId: 's-1', format: 'yaml' },
    })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('yaml')
  })

  it('POST /openapi should handle enum fields', async () => {
    mockPrisma.system.findFirst.mockResolvedValue({
      id: 's-1', name: 'System', description: null, baseUrl: null,
    })
    mockPrisma.canonicalEntity.findMany.mockResolvedValue([
      { id: 'e-1', name: 'Order', slug: 'order' },
    ])
    mockPrisma.canonicalField.findMany.mockResolvedValue([{
      id: 'f-1', entityId: 'e-1', name: 'status', displayName: 'Status',
      dataType: 'ENUM', format: null, nullable: false, description: null,
      isComposite: false, subfields: [], examples: [],
      enumValues: [{ code: 'ACTIVE' }, { code: 'INACTIVE' }],
    }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/export/openapi',
      payload: { systemId: 's-1', format: 'json' },
    })
    const spec = JSON.parse(res.payload)
    expect(spec.components.schemas.Order.properties.status.enum).toEqual(['ACTIVE', 'INACTIVE'])
    expect(spec.components.schemas.Order.required).toContain('status')
  })
})

describe('JSON Schema Export', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('POST /json-schema entity scope', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1', name: 'Customer' })
    mockPrisma.canonicalField.findMany.mockResolvedValue([{
      id: 'f-1', name: 'email', displayName: 'Email', dataType: 'STRING',
      nullable: true, description: 'Email', isComposite: false,
      subfields: [], examples: [], enumValues: [],
    }])
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/export/json-schema',
      payload: { scope: 'entity', scopeId: 'e-1', format: 'json' },
    })
    expect(res.statusCode).toBe(200)
    const schema = JSON.parse(res.payload)
    expect(schema.$schema).toBe('http://json-schema.org/draft-07/schema#')
    expect(schema.properties.email.type).toBe('string')
  })

  it('POST /json-schema interface scope', async () => {
    mockPrisma.interface.findFirst.mockResolvedValue({
      id: 'i-1', name: 'TestInterface',
      fields: [{
        canonicalField: {
          id: 'f-1', name: 'email', displayName: 'Email', dataType: 'STRING',
          nullable: false, description: null, isComposite: false,
          subfields: [], examples: [], enumValues: [],
        },
      }],
    })
    const app = buildTestApp()
    const res = await app.inject({
      method: 'POST',
      url: '/workspaces/ws-1/export/json-schema',
      payload: { scope: 'interface', scopeId: 'i-1', format: 'json' },
    })
    expect(res.statusCode).toBe(200)
    const schema = JSON.parse(res.payload)
    expect(schema.required).toContain('email')
  })
})

describe('Workspace Export', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('GET /workspace should return full export', async () => {
    // Mock all the findMany calls
    mockPrisma.canonicalEntity.findMany.mockResolvedValue([{ id: 'e-1' }])
    mockPrisma.canonicalField.findMany.mockResolvedValue([{ id: 'f-1' }])
    mockPrisma.canonicalSubfield.findMany.mockResolvedValue([])
    mockPrisma.canonicalFieldExample.findMany.mockResolvedValue([])
    mockPrisma.canonicalEnumValue.findMany.mockResolvedValue([])
    mockPrisma.system.findMany.mockResolvedValue([{ id: 's-1' }])
    mockPrisma.systemEntity.findMany.mockResolvedValue([])
    mockPrisma.systemField.findMany.mockResolvedValue([])
    mockPrisma.systemEntityRelationship.findMany.mockResolvedValue([])
    mockPrisma.mapping.findMany.mockResolvedValue([])
    mockPrisma.transformationRule.findMany.mockResolvedValue([])
    mockPrisma.valueMapEntry.findMany.mockResolvedValue([])
    mockPrisma.composeRuleField.findMany.mockResolvedValue([])
    mockPrisma.decomposeRuleField.findMany.mockResolvedValue([])
    mockPrisma.propagationChain.findMany.mockResolvedValue([])
    mockPrisma.propagationChainStep.findMany.mockResolvedValue([])
    mockPrisma.interface.findMany.mockResolvedValue([])
    mockPrisma.interfaceField.findMany.mockResolvedValue([])
    mockPrisma.modelVersion.findMany.mockResolvedValue([])

    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/export/workspace' })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-disposition']).toContain('workspace-test-')
    const data = JSON.parse(res.payload)
    expect(data.workspace.id).toBe('ws-1')
    expect(data.canonicalEntities).toHaveLength(1)
    expect(data.systems).toHaveLength(1)
    expect(data.exportedAt).toBeDefined()
  })
})
