import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { traceRoutes } from './trace.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
  },
}))

vi.mock('../services/trace/trace-engine.js', () => ({
  traceCanonicalField: vi.fn(),
}))

vi.mock('../lib/sql.js', () => ({
  sql: {},
}))

import { prisma } from '../lib/prisma.js'
import { traceCanonicalField } from '../services/trace/trace-engine.js'
const mockPrisma = prisma as any
const mockTrace = traceCanonicalField as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }

function buildTestApp() {
  const app = Fastify({ logger: false })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(traceRoutes, { prefix: '/workspaces/:workspaceId/trace' })
  })
  return app
}

describe('Trace endpoint', () => {
  beforeEach(() => { vi.clearAllMocks(); mockPrisma.workspace.findUnique.mockResolvedValue(ws) })

  it('should return trace result', async () => {
    const traceResult = {
      canonicalField: { id: 'cf-1', name: 'email', displayName: 'Email', dataType: 'STRING', entityId: 'e-1', entityName: 'Customer' },
      mappings: [{
        id: 'm-1', systemFieldId: 'sf-1', systemFieldName: 'email_addr',
        systemEntityId: 'se-1', systemEntityName: 'Account',
        systemId: 's-1', systemName: 'Salesforce',
        deprecated: false, transformationRule: { type: 'RENAME' },
      }],
      propagationChains: [],
      interfaces: [],
      conflicts: [],
    }
    mockTrace.mockResolvedValue(traceResult)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/trace/cf-1' })
    expect(res.statusCode).toBe(200)
    const body = res.json()
    expect(body.canonicalField.name).toBe('email')
    expect(body.mappings).toHaveLength(1)
    expect(body.conflicts).toEqual([])
  })

  it('should return 404 when canonical field not found', async () => {
    mockTrace.mockResolvedValue(null)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/trace/bad-id' })
    expect(res.statusCode).toBe(404)
  })

  it('should include conflicts for type mismatches', async () => {
    const traceResult = {
      canonicalField: { id: 'cf-1', name: 'email', displayName: 'Email', dataType: 'STRING', entityId: 'e-1', entityName: 'Customer' },
      mappings: [],
      propagationChains: [],
      interfaces: [],
      conflicts: [{
        type: 'TYPE_CONFLICT',
        message: 'Incompatible data types',
        details: { systems: [{ systemId: 's-1', dataType: 'string' }, { systemId: 's-2', dataType: 'integer' }] },
      }],
    }
    mockTrace.mockResolvedValue(traceResult)
    const app = buildTestApp()
    const res = await app.inject({ method: 'GET', url: '/workspaces/ws-1/trace/cf-1' })
    expect(res.statusCode).toBe(200)
    expect(res.json().conflicts).toHaveLength(1)
    expect(res.json().conflicts[0].type).toBe('TYPE_CONFLICT')
  })
})
