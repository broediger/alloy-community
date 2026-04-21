import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    canonicalEntity: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    canonicalField: {
      count: vi.fn(),
    },
  },
}))

import { prisma } from '../../lib/prisma.js'
import { remove } from './canonical-entities.js'

const mockPrisma = prisma as any

describe('canonical-entities service: remove()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes an empty entity with no referencing fields', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({
      id: 'e-1',
      _count: { fields: 0 },
    })
    mockPrisma.canonicalField.count.mockResolvedValue(0)
    mockPrisma.canonicalEntity.delete.mockResolvedValue({ id: 'e-1' })

    const result = await remove('ws-1', 'e-1')

    expect(result).toEqual({ success: true })
    expect(mockPrisma.canonicalEntity.delete).toHaveBeenCalledWith({ where: { id: 'e-1' } })
  })

  it('throws DELETE_CONFLICT when fields exist', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({
      id: 'e-1',
      _count: { fields: 5 },
    })
    mockPrisma.canonicalField.count.mockResolvedValue(0)
    await expect(remove('ws-1', 'e-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      statusCode: 409,
      details: [{ type: 'fields', count: 5 }],
    })
    expect(mockPrisma.canonicalEntity.delete).not.toHaveBeenCalled()
  })

  it('throws DELETE_CONFLICT when other fields reference this entity', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({
      id: 'e-1',
      _count: { fields: 0 },
    })
    mockPrisma.canonicalField.count.mockResolvedValue(2)
    await expect(remove('ws-1', 'e-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      statusCode: 409,
      details: [{ type: 'referencingFields', count: 2 }],
    })
  })

  it('aggregates both dependency types', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue({
      id: 'e-1',
      _count: { fields: 3 },
    })
    mockPrisma.canonicalField.count.mockResolvedValue(4)
    await expect(remove('ws-1', 'e-1')).rejects.toMatchObject({
      code: 'DELETE_CONFLICT',
      details: [
        { type: 'fields', count: 3 },
        { type: 'referencingFields', count: 4 },
      ],
    })
  })

  it('throws NotFound when entity not in workspace', async () => {
    mockPrisma.canonicalEntity.findFirst.mockResolvedValue(null)
    await expect(remove('ws-1', 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })
})
