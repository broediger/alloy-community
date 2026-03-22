import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ValidationError } from '../../errors/index.js'

export interface CreateMappingBody {
  canonicalFieldId?: string
  canonicalSubfieldId?: string
  systemFieldId?: string
  ruleType?: string
  notes?: string
  deprecated?: boolean
}

export interface UpdateMappingBody {
  notes?: string
  deprecated?: boolean
}

export interface MappingFilters {
  canonicalFieldId?: string
  systemId?: string
  entityId?: string
  deprecated?: string
}

export async function list(workspaceId: string, filters: MappingFilters) {
  const where: any = { workspaceId }

  if (filters.canonicalFieldId) where.canonicalFieldId = filters.canonicalFieldId
  if (filters.systemId) {
    where.systemField = { entity: { systemId: filters.systemId } }
  }
  if (filters.entityId) {
    where.systemField = { ...(where.systemField ?? {}), entityId: filters.entityId }
  }
  if (filters.deprecated === 'true') where.deprecated = true
  else if (filters.deprecated === 'false') where.deprecated = false

  const mappings = await prisma.mapping.findMany({
    where,
    include: {
      canonicalField: { select: { id: true, name: true } },
      canonicalSubfield: { select: { id: true, name: true } },
      systemField: {
        select: {
          id: true, name: true, entityId: true,
          entity: { select: { id: true, name: true, systemId: true, system: { select: { id: true, name: true } } } },
        },
      },
      transformationRule: { select: { id: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { items: mappings, total: mappings.length }
}

export async function getById(workspaceId: string, id: string) {
  const mapping = await prisma.mapping.findFirst({
    where: { id, workspaceId },
    include: {
      canonicalField: { select: { id: true, name: true } },
      canonicalSubfield: { select: { id: true, name: true } },
      systemField: { select: { id: true, name: true, entityId: true } },
      transformationRule: {
        include: {
          valueMapEntries: true,
          composeRuleFields: { orderBy: { position: 'asc' } },
          decomposeRuleFields: { orderBy: { position: 'asc' } },
        },
      },
    },
  })
  if (!mapping) throw new NotFoundError('Mapping')
  return mapping
}

export async function create(workspaceId: string, body: CreateMappingBody) {
  // XOR validation: exactly one of canonicalFieldId or canonicalSubfieldId must be set
  const hasField = !!body.canonicalFieldId
  const hasSubfield = !!body.canonicalSubfieldId
  if (hasField === hasSubfield) {
    throw new ValidationError([
      { field: 'canonicalFieldId', message: 'Exactly one of canonicalFieldId or canonicalSubfieldId must be provided' },
    ])
  }

  // systemFieldId required unless ruleType is COMPOSE or DECOMPOSE
  const isComposeDecompose = body.ruleType === 'COMPOSE' || body.ruleType === 'DECOMPOSE'
  if (!isComposeDecompose && !body.systemFieldId) {
    throw new ValidationError([
      { field: 'systemFieldId', message: 'Required unless ruleType is COMPOSE or DECOMPOSE' },
    ])
  }

  // Validate referenced IDs belong to workspace
  if (body.canonicalFieldId) {
    const field = await prisma.canonicalField.findFirst({
      where: { id: body.canonicalFieldId, workspaceId },
    })
    if (!field) throw new ValidationError([{ field: 'canonicalFieldId', message: 'Canonical field not found in this workspace' }])
  }

  if (body.canonicalSubfieldId) {
    const subfield = await prisma.canonicalSubfield.findFirst({
      where: { id: body.canonicalSubfieldId, workspaceId },
    })
    if (!subfield) throw new ValidationError([{ field: 'canonicalSubfieldId', message: 'Canonical subfield not found in this workspace' }])
  }

  if (body.systemFieldId) {
    const systemField = await prisma.systemField.findFirst({
      where: { id: body.systemFieldId, workspaceId },
    })
    if (!systemField) throw new ValidationError([{ field: 'systemFieldId', message: 'System field not found in this workspace' }])
  }

  return prisma.mapping.create({
    data: {
      workspaceId,
      canonicalFieldId: body.canonicalFieldId ?? null,
      canonicalSubfieldId: body.canonicalSubfieldId ?? null,
      systemFieldId: body.systemFieldId ?? null,
      notes: body.notes ?? null,
      deprecated: body.deprecated ?? false,
    },
    include: {
      canonicalField: { select: { id: true, name: true } },
      canonicalSubfield: { select: { id: true, name: true } },
      systemField: { select: { id: true, name: true, entityId: true } },
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateMappingBody) {
  const mapping = await prisma.mapping.findFirst({
    where: { id, workspaceId },
  })
  if (!mapping) throw new NotFoundError('Mapping')

  const data: any = {}
  if (body.notes !== undefined) data.notes = body.notes
  if (body.deprecated !== undefined) data.deprecated = body.deprecated

  return prisma.mapping.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, id: string) {
  const mapping = await prisma.mapping.findFirst({
    where: { id, workspaceId },
  })
  if (!mapping) throw new NotFoundError('Mapping')

  // Cascade: delete transformation rule and all child records first
  await prisma.$transaction(async (tx) => {
    const rule = await tx.transformationRule.findUnique({
      where: { mappingId: id },
    })
    if (rule) {
      await tx.valueMapEntry.deleteMany({ where: { ruleId: rule.id } })
      await tx.composeRuleField.deleteMany({ where: { ruleId: rule.id } })
      await tx.decomposeRuleField.deleteMany({ where: { ruleId: rule.id } })
      await tx.transformationRule.delete({ where: { id: rule.id } })
    }
    await tx.mapping.delete({ where: { id } })
  })

  return { success: true }
}
