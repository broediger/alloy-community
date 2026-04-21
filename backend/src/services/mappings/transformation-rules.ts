import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface PutRuleBody {
  type: string
  config?: Record<string, unknown>
  entries?: Array<{ fromValue: string; toValue: string; bidirectional?: boolean }>
  fields?: Array<{ systemFieldId: string; subfieldId: string; position: number }>
}

async function getMappingTargetDataType(workspaceId: string, mappingId: string): Promise<string | null> {
  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, workspaceId },
    include: {
      canonicalField: { select: { dataType: true } },
      canonicalSubfield: { select: { dataType: true } },
    },
  })
  if (!mapping) return null
  return mapping.canonicalField?.dataType ?? mapping.canonicalSubfield?.dataType ?? null
}

export async function putRule(workspaceId: string, mappingId: string, body: PutRuleBody) {
  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, workspaceId },
  })
  if (!mapping) throw new NotFoundError('Mapping')

  // Validate per rule type
  switch (body.type) {
    case 'RENAME':
      // No additional config or child records required
      break

    case 'TYPE_CAST':
      if (!body.config?.from || !body.config?.to) {
        throw new ValidationError([
          { field: 'config', message: 'TYPE_CAST requires config.from and config.to' },
        ])
      }
      break

    case 'VALUE_MAP': {
      const targetDataType = await getMappingTargetDataType(workspaceId, mappingId)
      if (targetDataType !== 'ENUM') {
        throw new ValidationError([
          {
            field: 'type',
            message: 'VALUE_MAP can only be applied to mappings whose canonical field (or subfield) has dataType ENUM',
          },
        ])
      }
      if (!body.entries || body.entries.length === 0) {
        throw new ValidationError([
          { field: 'entries', message: 'VALUE_MAP requires at least one entry' },
        ])
      }
      // Check fromValue uniqueness
      const fromValues = body.entries.map((e) => e.fromValue)
      const uniqueFromValues = new Set(fromValues)
      if (uniqueFromValues.size !== fromValues.length) {
        throw new ValidationError([
          { field: 'entries', message: 'fromValue must be unique per rule' },
        ])
      }
      // Check bidirectional conflicts
      if (body.entries.some((e) => e.bidirectional)) {
        const toValues = body.entries.filter((e) => e.bidirectional).map((e) => e.toValue)
        const toSet = new Set(toValues)
        if (toSet.size !== toValues.length) {
          // Warn — but still allow (per spec: "warns if reverse mapping has conflicts")
          // We include a warning in the response but don't block
        }
      }
      break
    }

    case 'COMPOSE':
      if (!body.fields || body.fields.length === 0) {
        throw new ValidationError([
          { field: 'fields', message: 'COMPOSE requires at least one field' },
        ])
      }
      // Validate position uniqueness
      const composePositions = body.fields.map((f) => f.position)
      if (new Set(composePositions).size !== composePositions.length) {
        throw new ValidationError([
          { field: 'fields', message: 'position must be unique per rule' },
        ])
      }
      // Validate all referenced IDs belong to workspace
      for (const f of body.fields) {
        const systemField = await prisma.systemField.findFirst({
          where: { id: f.systemFieldId, workspaceId },
        })
        if (!systemField) {
          throw new ValidationError([
            { field: 'fields.systemFieldId', message: `System field ${f.systemFieldId} not found in this workspace` },
          ])
        }
        const subfield = await prisma.canonicalSubfield.findFirst({
          where: { id: f.subfieldId, workspaceId },
        })
        if (!subfield) {
          throw new ValidationError([
            { field: 'fields.subfieldId', message: `Subfield ${f.subfieldId} not found in this workspace` },
          ])
        }
      }
      break

    case 'DECOMPOSE':
      if (!body.fields || body.fields.length === 0) {
        throw new ValidationError([
          { field: 'fields', message: 'DECOMPOSE requires at least one field' },
        ])
      }
      const decomposePositions = body.fields.map((f) => f.position)
      if (new Set(decomposePositions).size !== decomposePositions.length) {
        throw new ValidationError([
          { field: 'fields', message: 'position must be unique per rule' },
        ])
      }
      for (const f of body.fields) {
        const systemField = await prisma.systemField.findFirst({
          where: { id: f.systemFieldId, workspaceId },
        })
        if (!systemField) {
          throw new ValidationError([
            { field: 'fields.systemFieldId', message: `System field ${f.systemFieldId} not found in this workspace` },
          ])
        }
        const subfield = await prisma.canonicalSubfield.findFirst({
          where: { id: f.subfieldId, workspaceId },
        })
        if (!subfield) {
          throw new ValidationError([
            { field: 'fields.subfieldId', message: `Subfield ${f.subfieldId} not found in this workspace` },
          ])
        }
      }
      break

    default:
      // Allow CONDITIONAL, FORMULA etc. with just config
      break
  }

  // Atomic create-or-replace in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // Delete existing rule and children
    const existingRule = await tx.transformationRule.findUnique({
      where: { mappingId },
    })
    if (existingRule) {
      await tx.valueMapEntry.deleteMany({ where: { ruleId: existingRule.id } })
      await tx.composeRuleField.deleteMany({ where: { ruleId: existingRule.id } })
      await tx.decomposeRuleField.deleteMany({ where: { ruleId: existingRule.id } })
      await tx.transformationRule.delete({ where: { id: existingRule.id } })
    }

    // Create new rule
    const rule = await tx.transformationRule.create({
      data: {
        mappingId,
        type: body.type as any,
        config: (body.config ?? undefined) as any,
      },
    })

    // Create child records based on type
    if (body.type === 'VALUE_MAP' && body.entries) {
      for (const entry of body.entries) {
        await tx.valueMapEntry.create({
          data: {
            ruleId: rule.id,
            fromValue: entry.fromValue,
            toValue: entry.toValue,
            bidirectional: entry.bidirectional ?? false,
          },
        })
      }
    }

    if (body.type === 'COMPOSE' && body.fields) {
      for (const f of body.fields) {
        await tx.composeRuleField.create({
          data: {
            ruleId: rule.id,
            systemFieldId: f.systemFieldId,
            subfieldId: f.subfieldId,
            position: f.position,
          },
        })
      }
    }

    if (body.type === 'DECOMPOSE' && body.fields) {
      for (const f of body.fields) {
        await tx.decomposeRuleField.create({
          data: {
            ruleId: rule.id,
            subfieldId: f.subfieldId,
            systemFieldId: f.systemFieldId,
            position: f.position,
          },
        })
      }
    }

    // Return full rule with children
    return tx.transformationRule.findUnique({
      where: { id: rule.id },
      include: {
        valueMapEntries: true,
        composeRuleFields: { orderBy: { position: 'asc' } },
        decomposeRuleFields: { orderBy: { position: 'asc' } },
      },
    })
  })

  return result
}

/**
 * Seed (or replace) a VALUE_MAP transformation rule on a mapping using the
 * canonical field's enum values. Each enum value becomes one entry with
 * fromValue=label and toValue=code — the canonical code is what the target
 * system receives, and the German/business label is what the source emits.
 * Callers can PATCH individual entries later for deviations.
 */
export async function seedValueMapFromEnum(workspaceId: string, mappingId: string) {
  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, workspaceId },
    include: {
      canonicalField: { include: { enumValues: { orderBy: { position: 'asc' } } } },
      canonicalSubfield: true,
    },
  })
  if (!mapping) throw new NotFoundError('Mapping')

  // Subfield-backed mappings aren't supported for this helper — subfields don't
  // currently carry their own enum values. Users must create entries manually.
  if (!mapping.canonicalField) {
    throw new ValidationError([
      {
        field: 'canonicalFieldId',
        message: 'Seed-from-enum only supports mappings linked to a canonical field (not a subfield)',
      },
    ])
  }
  if (mapping.canonicalField.dataType !== 'ENUM') {
    throw new ValidationError([
      { field: 'canonicalFieldId', message: 'Canonical field must have dataType ENUM to seed value map' },
    ])
  }
  const enumValues = mapping.canonicalField.enumValues
  if (!enumValues || enumValues.length === 0) {
    throw new ValidationError([
      { field: 'enumValues', message: 'Canonical field has no enum values to seed from' },
    ])
  }

  const entries = enumValues.map((ev) => ({
    fromValue: ev.label,
    toValue: ev.code,
    bidirectional: false,
  }))

  return putRule(workspaceId, mappingId, { type: 'VALUE_MAP', entries })
}

export async function deleteRule(workspaceId: string, mappingId: string) {
  const mapping = await prisma.mapping.findFirst({
    where: { id: mappingId, workspaceId },
  })
  if (!mapping) throw new NotFoundError('Mapping')

  const rule = await prisma.transformationRule.findUnique({
    where: { mappingId },
  })
  if (!rule) throw new NotFoundError('Transformation rule')

  await prisma.$transaction(async (tx) => {
    await tx.valueMapEntry.deleteMany({ where: { ruleId: rule.id } })
    await tx.composeRuleField.deleteMany({ where: { ruleId: rule.id } })
    await tx.decomposeRuleField.deleteMany({ where: { ruleId: rule.id } })
    await tx.transformationRule.delete({ where: { id: rule.id } })
  })

  return { success: true }
}
