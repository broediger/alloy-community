import { describe, it, expect, vi, beforeEach } from 'vitest'
import Fastify from 'fastify'
import { registerErrorHandler } from '../plugins/error-handler.js'
import { schemaErrorFormatter } from '../plugins/schema-error-formatter.js'
import { registerWorkspaceMiddleware } from '../middleware/workspace.js'
import { interfaceRoutes } from './interfaces.js'

vi.mock('../lib/prisma.js', () => ({
  prisma: {
    workspace: { findUnique: vi.fn() },
    interface: { findFirst: vi.fn() },
    interfaceVersion: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    interfaceVersionSnapshot: {
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    interfaceVersionDiff: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../lib/prisma.js'
const mockPrisma = prisma as any

const ws = { id: 'ws-1', name: 'Test', slug: 'test', settings: null, createdAt: new Date(), updatedAt: new Date() }
const baseUrl = '/workspaces/ws-1/interfaces/iface-1/versions'

function buildTestApp() {
  const app = Fastify({ logger: false, schemaErrorFormatter })
  registerErrorHandler(app)
  app.register(async (api) => {
    registerWorkspaceMiddleware(api)
    api.register(interfaceRoutes, { prefix: '/workspaces/:workspaceId/interfaces' })
  })
  return app
}

describe('Interface Versions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.workspace.findUnique.mockResolvedValue(ws)
  })

  describe('GET /:iId/versions', () => {
    it('should return version list with field count', async () => {
      mockPrisma.interface.findFirst.mockResolvedValue({ id: 'iface-1', workspaceId: 'ws-1' })
      mockPrisma.interfaceVersion.findMany.mockResolvedValue([{
        id: 'v-1', workspaceId: 'ws-1', interfaceId: 'iface-1', label: 'v1.0',
        description: null, status: 'PUBLISHED', createdAt: new Date(), createdBy: null,
        snapshot: { snapshot: { fields: [{ id: 'f1' }, { id: 'f2' }, { id: 'f3' }] } },
      }])
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: baseUrl })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.items).toHaveLength(1)
      expect(body.items[0].fieldCount).toBe(3)
      expect(body.items[0].status).toBe('PUBLISHED')
    })

    it('should return 404 if interface does not exist', async () => {
      mockPrisma.interface.findFirst.mockResolvedValue(null)
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: baseUrl })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('POST /:iId/versions', () => {
    it('should cut a new version', async () => {
      mockPrisma.interface.findFirst.mockResolvedValue({
        id: 'iface-1', workspaceId: 'ws-1', name: 'Order API', description: null,
        sourceSystemId: 'sys-1', targetSystemId: 'sys-2', direction: 'REQUEST_RESPONSE',
        sourceSystem: { id: 'sys-1', name: 'Source' },
        targetSystem: { id: 'sys-2', name: 'Target' },
        entityBindings: [],
        fields: [{
          id: 'f-1', canonicalFieldId: 'cf-1', name: null, displayName: null,
          dataType: null, description: null, nullable: true, status: 'MANDATORY',
          canonicalField: { id: 'cf-1', name: 'email', displayName: 'Email', dataType: 'STRING' },
        }],
      })
      // Label check
      mockPrisma.interfaceVersion.findFirst
        .mockResolvedValueOnce(null)  // label uniqueness check
        .mockResolvedValueOnce(null)  // latest version check (no existing versions)

      mockPrisma.$transaction.mockResolvedValue({
        id: 'v-1', workspaceId: 'ws-1', interfaceId: 'iface-1',
        label: 'v1.0', status: 'DRAFT',
      })

      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST', url: baseUrl,
        payload: { label: 'v1.0', description: 'First version' },
      })
      expect(res.statusCode).toBe(201)
      expect(res.json().label).toBe('v1.0')
    })

    it('should return 409 on duplicate label', async () => {
      mockPrisma.interface.findFirst.mockResolvedValue({ id: 'iface-1', workspaceId: 'ws-1' })
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({ id: 'v-existing', label: 'v1.0' })

      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST', url: baseUrl,
        payload: { label: 'v1.0' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should return 409 when latest version is still DRAFT', async () => {
      mockPrisma.interface.findFirst.mockResolvedValue({
        id: 'iface-1', workspaceId: 'ws-1', name: 'Order API', description: null,
        sourceSystemId: 'sys-1', targetSystemId: 'sys-2', direction: 'REQUEST_RESPONSE',
        sourceSystem: { id: 'sys-1', name: 'Source' },
        targetSystem: { id: 'sys-2', name: 'Target' },
        entityBindings: [], fields: [],
      })
      mockPrisma.interfaceVersion.findFirst
        .mockResolvedValueOnce(null)  // label uniqueness check
        .mockResolvedValueOnce({ id: 'v-1', status: 'DRAFT' })  // latest version is DRAFT

      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST', url: baseUrl,
        payload: { label: 'v2.0' },
      })
      expect(res.statusCode).toBe(409)
    })

    it('should return 400 if label is missing', async () => {
      const app = buildTestApp()
      const res = await app.inject({
        method: 'POST', url: baseUrl,
        payload: {},
      })
      expect(res.statusCode).toBe(400)
    })
  })

  describe('GET /:iId/versions/:vId', () => {
    it('should return version with snapshot', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({
        id: 'v-1', workspaceId: 'ws-1', interfaceId: 'iface-1', label: 'v1.0',
        description: null, status: 'PUBLISHED', createdAt: new Date(), createdBy: null,
        snapshot: { snapshot: { metadata: {}, entityBindings: [], fields: [] } },
      })
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: `${baseUrl}/v-1` })
      expect(res.statusCode).toBe(200)
      expect(res.json().snapshot).toBeTruthy()
    })

    it('should return 404 for non-existent version', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue(null)
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: `${baseUrl}/v-999` })
      expect(res.statusCode).toBe(404)
    })
  })

  describe('GET /:iId/versions/:vId/diff', () => {
    it('should return structured diff', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({ id: 'v-1' })
      mockPrisma.interfaceVersionDiff.findFirst.mockResolvedValue({
        diff: {
          fields: { added: [{ fieldId: 'f-1', name: 'email' }], removed: [], changed: [] },
          entityBindings: { added: [], removed: [] },
          metadata: {},
        },
      })
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: `${baseUrl}/v-1/diff` })
      expect(res.statusCode).toBe(200)
      expect(res.json().fields.added).toHaveLength(1)
    })

    it('should return empty diff when no diff record exists', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({ id: 'v-1' })
      mockPrisma.interfaceVersionDiff.findFirst.mockResolvedValue(null)
      const app = buildTestApp()
      const res = await app.inject({ method: 'GET', url: `${baseUrl}/v-1/diff` })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.fields).toEqual({ added: [], removed: [], changed: [] })
      expect(body.entityBindings).toEqual({ added: [], removed: [] })
      expect(body.metadata).toEqual({})
    })
  })

  describe('PATCH /:iId/versions/:vId/status', () => {
    it('should publish a DRAFT version', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({
        id: 'v-1', status: 'DRAFT', interfaceId: 'iface-1', workspaceId: 'ws-1',
      })
      mockPrisma.interfaceVersion.update.mockResolvedValue({
        id: 'v-1', status: 'PUBLISHED',
      })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'PATCH', url: `${baseUrl}/v-1/status`,
        payload: { status: 'PUBLISHED' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('PUBLISHED')
    })

    it('should deprecate a PUBLISHED version', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({
        id: 'v-1', status: 'PUBLISHED', interfaceId: 'iface-1', workspaceId: 'ws-1',
      })
      mockPrisma.interfaceVersion.update.mockResolvedValue({
        id: 'v-1', status: 'DEPRECATED',
      })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'PATCH', url: `${baseUrl}/v-1/status`,
        payload: { status: 'DEPRECATED' },
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().status).toBe('DEPRECATED')
    })

    it('should reject deprecating a DRAFT version', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({
        id: 'v-1', status: 'DRAFT', interfaceId: 'iface-1', workspaceId: 'ws-1',
      })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'PATCH', url: `${baseUrl}/v-1/status`,
        payload: { status: 'DEPRECATED' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should reject any transition from DEPRECATED', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue({
        id: 'v-1', status: 'DEPRECATED', interfaceId: 'iface-1', workspaceId: 'ws-1',
      })
      const app = buildTestApp()
      const res = await app.inject({
        method: 'PATCH', url: `${baseUrl}/v-1/status`,
        payload: { status: 'PUBLISHED' },
      })
      expect(res.statusCode).toBe(400)
    })

    it('should return 404 for non-existent version', async () => {
      mockPrisma.interfaceVersion.findFirst.mockResolvedValue(null)
      const app = buildTestApp()
      const res = await app.inject({
        method: 'PATCH', url: `${baseUrl}/v-999/status`,
        payload: { status: 'PUBLISHED' },
      })
      expect(res.statusCode).toBe(404)
    })
  })
})
