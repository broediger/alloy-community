import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    canonicalEntity: {
      findFirst: vi.fn(),
    },
    canonicalField: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { create, remove } from './canonical-fields.js'

const mockPrisma = prisma as any

describe('canonical-fields service: remove()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes a field with no dependents', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({
      id: 'f-1',
      workspaceId: 'ws-1',
      _count: { mappings: 0, interfaceFields: 0, subfields: 0, propagationChains: 0 },
    })
    mockPrisma.canonicalField.delete.mockResolvedValue({ id: 'f-1' })

    const result = await remove('ws-1', 'f-1')

    expect(result).toEqual({ success: true })
    expect(mockPrisma.canonicalField.delete).toHaveBeenCalledWith({ where: { id: 'f-1' } })
  })

  it('throws DELETE_CONFLICT when subfields exist', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({
      id: 'f-1',
      _count: { mappings: 0, interfaceFields: 0, subfields: 2, propagationChains: 0 },
    })
    await expect(remove('ws-1', 'f-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      statusCode: 409,
      details: [{ type: 'subfields', count: 2 }],
    })
    expect(mockPrisma.canonicalField.delete).not.toHaveBeenCalled()
  })

  it('throws DELETE_CONFLICT when propagationChains exist', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({
      id: 'f-1',
      _count: { mappings: 0, interfaceFields: 0, subfields: 0, propagationChains: 1 },
    })
    await expect(remove('ws-1', 'f-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      statusCode: 409,
      details: [{ type: 'propagationChains', count: 1 }],
    })
  })

  it('aggregates multiple dependent types', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue({
      id: 'f-1',
      _count: { mappings: 3, interfaceFields: 1, subfields: 2, propagationChains: 1 },
    })
    await expect(remove('ws-1', 'f-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      details: [
        { type: 'mappings', count: 3 },
        { type: 'interfaceFields', count: 1 },
        { type: 'subfields', count: 2 },
        { type: 'propagationChains', count: 1 },
      ],
    })
  })

  it('throws NotFound when field not in workspace', async () => {
    mockPrisma.canonicalField.findFirst.mockResolvedValue(null)
    await expect(remove('ws-1', 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })
})

describe('canonical-fields service: create() relationship validation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.canonicalField.findFirst.mockResolvedValue(null) // no name conflict
  })

  it('accepts self-referential fields when cardinality is provided', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1', workspaceId: 'ws-1' })
    mockPrisma.canonicalField.create.mockResolvedValue({ id: 'f-1', referencedEntityId: 'e-1' })

    await expect(
      create('ws-1', {
        entityId: 'e-1',
        name: 'parent',
        displayName: 'Parent',
        dataType: 'OBJECT',
        referencedEntityId: 'e-1',
        cardinality: 'ONE',
      }),
    ).resolves.toMatchObject({ id: 'f-1' })
    expect(mockPrisma.canonicalField.create).toHaveBeenCalled()
  })

  it('rejects when referenced entity does not exist', async () => {
    // First findFirst: for body.entityId — entity exists
    mockPrisma.canonicalEntity.findFirst
      .mockResolvedValueOnce({ id: 'e-1', workspaceId: 'ws-1' })
      // Second findFirst: for referencedEntityId — doesn't exist
      .mockResolvedValueOnce(null)

    await expect(
      create('ws-1', {
        entityId: 'e-1',
        name: 'parent',
        displayName: 'Parent',
        dataType: 'OBJECT',
        referencedEntityId: 'e-missing',
        cardinality: 'ONE',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })

  it('rejects referencedEntityId without cardinality', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({ id: 'e-1' })
    await expect(
      create('ws-1', {
        entityId: 'e-1',
        name: 'parent',
        displayName: 'Parent',
        dataType: 'OBJECT',
        referencedEntityId: 'e-1',
        // no cardinality
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' })
  })
})
