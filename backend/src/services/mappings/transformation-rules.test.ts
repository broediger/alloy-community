import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../lib/prisma.js', () => ({
  prisma: {
    mapping: { findFirst: vi.fn() },
    canonicalField: {},
    systemField: { findFirst: vi.fn() },
    canonicalSubfield: { findFirst: vi.fn() },
    transformationRule: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    valueMapEntry: { deleteMany: vi.fn(), create: vi.fn() },
    composeRuleField: { deleteMany: vi.fn() },
    decomposeRuleField: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

import { prisma } from '../../lib/prisma.js'
import { putRule, seedValueMapFromEnum } from './transformation-rules.js'

const mockPrisma = prisma as any

function mockTx() {
  const tx: any = {
    transformationRule: {
      findUnique: vi.fn().mockResolvedValue({ id: 'r-1', valueMapEntries: [], composeRuleFields: [], decomposeRuleFields: [] }),
      create: vi.fn().mockResolvedValue({ id: 'r-1' }),
      delete: vi.fn(),
    },
    valueMapEntry: { deleteMany: vi.fn(), create: vi.fn() },
    composeRuleField: { deleteMany: vi.fn(), create: vi.fn() },
    decomposeRuleField: { deleteMany: vi.fn(), create: vi.fn() },
  }
  return tx
}

describe('putRule VALUE_MAP requires ENUM dataType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects VALUE_MAP when canonical field is STRING', async () => {
    // First findFirst: existence check at entry
    mockPrisma.mapping.findFirst
      .mockResolvedValueOnce({ id: 'm-1', workspaceId: 'ws-1' })
      // Second findFirst: getMappingTargetDataType
      .mockResolvedValueOnce({
        id: 'm-1',
        canonicalField: { dataType: 'STRING' },
        canonicalSubfield: null,
      })

    await expect(
      putRule('ws-1', 'm-1', {
        type: 'VALUE_MAP',
        entries: [{ fromValue: 'a', toValue: 'b' }],
      }),
    ).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
      statusCode: 400,
    })
  })

  it('accepts VALUE_MAP when canonical field is ENUM', async () => {
    mockPrisma.mapping.findFirst
      .mockResolvedValueOnce({ id: 'm-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({
        id: 'm-1',
        canonicalField: { dataType: 'ENUM' },
        canonicalSubfield: null,
      })
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx()))

    const result = await putRule('ws-1', 'm-1', {
      type: 'VALUE_MAP',
      entries: [{ fromValue: 'Monatlich', toValue: 'MONTHLY' }],
    })
    expect(result).toBeDefined()
  })

  it('accepts VALUE_MAP when canonical subfield is ENUM', async () => {
    mockPrisma.mapping.findFirst
      .mockResolvedValueOnce({ id: 'm-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({
        id: 'm-1',
        canonicalField: null,
        canonicalSubfield: { dataType: 'ENUM' },
      })
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx()))

    const result = await putRule('ws-1', 'm-1', {
      type: 'VALUE_MAP',
      entries: [{ fromValue: 'A', toValue: 'B' }],
    })
    expect(result).toBeDefined()
  })
})

describe('seedValueMapFromEnum', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('seeds entries from canonical field enum values', async () => {
    // First findFirst is inside seedValueMapFromEnum itself (loads mapping + canonicalField.enumValues)
    mockPrisma.mapping.findFirst
      .mockResolvedValueOnce({
        id: 'm-1',
        workspaceId: 'ws-1',
        canonicalField: {
          id: 'f-1',
          dataType: 'ENUM',
          enumValues: [
            { code: 'MONTHLY', label: 'Monatlich', position: 0 },
            { code: 'YEARLY', label: 'jährlich', position: 1 },
          ],
        },
        canonicalSubfield: null,
      })
      // putRule() re-fetches mapping (basic existence) + target dataType
      .mockResolvedValueOnce({ id: 'm-1', workspaceId: 'ws-1' })
      .mockResolvedValueOnce({
        id: 'm-1',
        canonicalField: { dataType: 'ENUM' },
        canonicalSubfield: null,
      })
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx()))

    const result = await seedValueMapFromEnum('ws-1', 'm-1')
    expect(result).toBeDefined()
  })

  it('rejects when canonical field is not ENUM', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValueOnce({
      id: 'm-1',
      canonicalField: { dataType: 'STRING', enumValues: [] },
      canonicalSubfield: null,
    })
    await expect(seedValueMapFromEnum('ws-1', 'm-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects when canonical field has no enum values', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValueOnce({
      id: 'm-1',
      canonicalField: { dataType: 'ENUM', enumValues: [] },
      canonicalSubfield: null,
    })
    await expect(seedValueMapFromEnum('ws-1', 'm-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('rejects for subfield-backed mappings', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValueOnce({
      id: 'm-1',
      canonicalField: null,
      canonicalSubfield: { dataType: 'ENUM' },
    })
    await expect(seedValueMapFromEnum('ws-1', 'm-1')).rejects.toMatchObject({
      code: 'VALIDATION_ERROR',
    })
  })

  it('throws NotFound for unknown mapping', async () => {
    mockPrisma.mapping.findFirst.mockResolvedValueOnce(null)
    await expect(seedValueMapFromEnum('ws-1', 'missing')).rejects.toMatchObject({
      code: 'NOT_FOUND',
      statusCode: 404,
    })
  })
})
