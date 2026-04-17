import { Prisma, InterfaceDirection } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

function parseInterfaceDirection(value: string): InterfaceDirection {
  if (!(value in InterfaceDirection)) {
    throw new ValidationError([
      { field: 'direction', message: `Invalid direction '${value}'` },
    ])
  }
  return value as InterfaceDirection
}

export interface CreateInterfaceBody {
  name: string
  description?: string
  sourceSystemId: string
  targetSystemId: string
  sourceEntityIds?: string[]
  targetEntityIds?: string[]
  direction: string
}

export interface UpdateInterfaceBody {
  name?: string
  description?: string
  direction?: string
  sourceEntityIds?: string[]
  targetEntityIds?: string[]
}

function groupBindings(bindings: Array<{ side: string; entity: { id: string; name: string; slug: string } }>) {
  const sourceEntities: Array<{ id: string; name: string; slug: string }> = []
  const targetEntities: Array<{ id: string; name: string; slug: string }> = []
  for (const b of bindings) {
    if (b.side === 'SOURCE') sourceEntities.push(b.entity)
    else if (b.side === 'TARGET') targetEntities.push(b.entity)
  }
  return { sourceEntities, targetEntities }
}

export async function list(workspaceId: string) {
  const interfaces = await prisma.interface.findMany({
    where: { workspaceId },
    include: {
      sourceSystem: { select: { id: true, name: true } },
      targetSystem: { select: { id: true, name: true } },
      entityBindings: {
        include: {
          entity: { select: { id: true, name: true, slug: true } },
        },
      },
      _count: { select: { fields: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = interfaces.map((i) => {
    const { entityBindings, ...rest } = i
    const { sourceEntities, targetEntities } = groupBindings(entityBindings)
    return { ...rest, sourceEntities, targetEntities }
  })

  return { items, total: items.length }
}

export async function getById(workspaceId: string, id: string) {
  const iface = await prisma.interface.findFirst({
    where: { id, workspaceId },
    include: {
      sourceSystem: { select: { id: true, name: true } },
      targetSystem: { select: { id: true, name: true } },
      entityBindings: {
        include: {
          entity: { select: { id: true, name: true, slug: true } },
        },
      },
      fields: {
        include: {
          canonicalField: {
            select: {
              id: true, name: true, displayName: true, dataType: true,
              referencedEntityId: true, cardinality: true, itemsDataType: true, isComposite: true,
            },
          },
        },
      },
    },
  })
  if (!iface) throw new NotFoundError('Interface')
  const ifaceId = iface.id

  const { sourceEntities, targetEntities } = groupBindings(iface.entityBindings)
  const sourceEntityIds = sourceEntities.map((e) => e.id)
  const targetEntityIds = targetEntities.map((e) => e.id)

  const sourceMappingFilter = sourceEntityIds.length > 0
    ? { entityId: { in: sourceEntityIds } }
    : { entity: { systemId: iface.sourceSystemId } }
  const targetMappingFilter = targetEntityIds.length > 0
    ? { entityId: { in: targetEntityIds } }
    : { entity: { systemId: iface.targetSystemId } }

  function mapMapping(m: any) {
    if (!m) return null
    return {
      id: m.id,
      systemFieldId: m.systemField?.id ?? null,
      systemFieldName: m.systemField?.name ?? null,
      systemFieldPath: m.systemField?.path ?? null,
      entityName: m.systemField?.entity?.name ?? null,
      deprecated: m.deprecated,
      transformationRule: m.transformationRule
        ? {
            type: m.transformationRule.type,
            config: m.transformationRule.config,
            valueMapEntries: m.transformationRule.valueMapEntries ?? [],
            composeRuleFields: m.transformationRule.composeRuleFields ?? [],
            decomposeRuleFields: m.transformationRule.decomposeRuleFields ?? [],
          }
        : null,
    }
  }

  async function resolveMappingsForCanonicalField(canonicalFieldId: string) {
    const include = {
      systemField: {
        select: {
          id: true, name: true, path: true, entityId: true,
          entity: { select: { id: true, name: true } },
        },
      },
      transformationRule: {
        include: {
          valueMapEntries: { orderBy: { fromValue: 'asc' as const } },
          composeRuleFields: { orderBy: { position: 'asc' as const } },
          decomposeRuleFields: { orderBy: { position: 'asc' as const } },
        },
      },
    }
    const sourceMapping = await prisma.mapping.findFirst({
      where: { canonicalFieldId, workspaceId, systemField: sourceMappingFilter },
      include,
    })
    const targetMapping = await prisma.mapping.findFirst({
      where: { canonicalFieldId, workspaceId, systemField: targetMappingFilter },
      include,
    })
    return { sourceMapping: mapMapping(sourceMapping), targetMapping: mapMapping(targetMapping) }
  }

  // Recursively expand entity reference fields. Cycle guard via visited set; depth limit = 3.
  async function expandReferencedFields(
    referencedEntityId: string,
    depth: number,
    visited: Set<string>
  ): Promise<any[]> {
    if (depth >= 3 || visited.has(referencedEntityId)) return []
    const newVisited = new Set(visited)
    newVisited.add(referencedEntityId)

    const childFields = await prisma.canonicalField.findMany({
      where: { entityId: referencedEntityId, workspaceId },
      orderBy: { name: 'asc' },
    })

    return Promise.all(
      childFields.map(async (cf) => {
        const { sourceMapping, targetMapping } = await resolveMappingsForCanonicalField(cf.id)
        let children: any[] | undefined
        if (cf.referencedEntityId) {
          children = await expandReferencedFields(cf.referencedEntityId, depth + 1, newVisited)
        }
        return {
          id: `virtual-${cf.id}`,
          interfaceId: ifaceId,
          canonicalFieldId: cf.id,
          canonicalField: {
            id: cf.id, name: cf.name, displayName: cf.displayName, dataType: cf.dataType,
            referencedEntityId: cf.referencedEntityId, cardinality: cf.cardinality,
            itemsDataType: cf.itemsDataType, isComposite: cf.isComposite,
          },
          name: null,
          displayName: null,
          dataType: null,
          description: null,
          nullable: cf.nullable,
          maxLength: null,
          status: 'OPTIONAL' as const,
          createdAt: cf.createdAt,
          updatedAt: cf.updatedAt,
          sourceMapping,
          targetMapping,
          children,
          virtual: true,
        }
      })
    )
  }

  // Resolve source and target mappings for each interface field
  const fieldsWithMappings = await Promise.all(
    iface.fields.map(async (f) => {
      // Unlinked fields have no canonical field — skip mapping resolution
      if (!f.canonicalFieldId) {
        return {
          id: f.id,
          interfaceId: f.interfaceId,
          canonicalFieldId: null,
          canonicalField: null,
          name: f.name,
          displayName: f.displayName,
          dataType: f.dataType,
          description: f.description,
          nullable: f.nullable,
          maxLength: f.maxLength,
          status: f.status,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          sourceMapping: null,
          targetMapping: null,
        }
      }

      const { sourceMapping, targetMapping } = await resolveMappingsForCanonicalField(f.canonicalFieldId!)
      let children: any[] | undefined
      const refEntityId = f.canonicalField?.referencedEntityId
      if (refEntityId) {
        children = await expandReferencedFields(refEntityId, 0, new Set())
      }

      return {
        id: f.id,
        interfaceId: f.interfaceId,
        canonicalFieldId: f.canonicalFieldId,
        canonicalField: f.canonicalField,
        name: null,
        displayName: null,
        dataType: null,
        description: null,
        nullable: true,
        maxLength: f.maxLength,
        status: f.status,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        sourceMapping,
        targetMapping,
        children,
      }
    })
  )

  return {
    id: iface.id,
    workspaceId: iface.workspaceId,
    name: iface.name,
    description: iface.description,
    sourceSystemId: iface.sourceSystemId,
    sourceSystem: iface.sourceSystem,
    targetSystemId: iface.targetSystemId,
    targetSystem: iface.targetSystem,
    sourceEntities,
    targetEntities,
    direction: iface.direction,
    createdAt: iface.createdAt,
    updatedAt: iface.updatedAt,
    fields: fieldsWithMappings,
  }
}

export async function create(workspaceId: string, body: CreateInterfaceBody) {
  if (body.sourceSystemId === body.targetSystemId) {
    throw new ValidationError([
      { field: 'targetSystemId', message: 'Source and target systems must be different' },
    ])
  }

  const sourceSystem = await prisma.system.findFirst({
    where: { id: body.sourceSystemId, workspaceId },
  })
  if (!sourceSystem) throw new ValidationError([{ field: 'sourceSystemId', message: 'Source system not found in this workspace' }])

  const targetSystem = await prisma.system.findFirst({
    where: { id: body.targetSystemId, workspaceId },
  })
  if (!targetSystem) throw new ValidationError([{ field: 'targetSystemId', message: 'Target system not found in this workspace' }])

  // Validate sourceEntityIds belong to sourceSystemId
  if (body.sourceEntityIds && body.sourceEntityIds.length > 0) {
    const sourceEntities = await prisma.systemEntity.findMany({
      where: { id: { in: body.sourceEntityIds }, systemId: body.sourceSystemId, workspaceId },
    })
    if (sourceEntities.length !== body.sourceEntityIds.length) {
      throw new ValidationError([{ field: 'sourceEntityIds', message: 'One or more source entities not found or do not belong to source system' }])
    }
  }

  // Validate targetEntityIds belong to targetSystemId
  if (body.targetEntityIds && body.targetEntityIds.length > 0) {
    const targetEntities = await prisma.systemEntity.findMany({
      where: { id: { in: body.targetEntityIds }, systemId: body.targetSystemId, workspaceId },
    })
    if (targetEntities.length !== body.targetEntityIds.length) {
      throw new ValidationError([{ field: 'targetEntityIds', message: 'One or more target entities not found or do not belong to target system' }])
    }
  }

  // Build entity binding create data
  const bindingsData: Array<{ entityId: string; side: string }> = []
  for (const eid of body.sourceEntityIds ?? []) {
    bindingsData.push({ entityId: eid, side: 'SOURCE' })
  }
  for (const eid of body.targetEntityIds ?? []) {
    bindingsData.push({ entityId: eid, side: 'TARGET' })
  }

  const created = await prisma.interface.create({
    data: {
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      sourceSystemId: body.sourceSystemId,
      targetSystemId: body.targetSystemId,
      direction: parseInterfaceDirection(body.direction),
      entityBindings: bindingsData.length > 0
        ? { createMany: { data: bindingsData } }
        : undefined,
    },
    include: {
      sourceSystem: { select: { id: true, name: true } },
      targetSystem: { select: { id: true, name: true } },
      entityBindings: {
        include: {
          entity: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  const { entityBindings, ...rest } = created
  const { sourceEntities, targetEntities } = groupBindings(entityBindings)
  return { ...rest, sourceEntities, targetEntities }
}

export async function update(workspaceId: string, id: string, body: UpdateInterfaceBody) {
  const iface = await prisma.interface.findFirst({
    where: { id, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  const data: Prisma.InterfaceUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.direction !== undefined) data.direction = parseInterfaceDirection(body.direction)

  // Handle sourceEntityIds: validate belong to source system
  if (body.sourceEntityIds !== undefined) {
    if (body.sourceEntityIds.length > 0) {
      const sourceEntities = await prisma.systemEntity.findMany({
        where: { id: { in: body.sourceEntityIds }, systemId: iface.sourceSystemId, workspaceId },
      })
      if (sourceEntities.length !== body.sourceEntityIds.length) {
        throw new ValidationError([{ field: 'sourceEntityIds', message: 'One or more source entities not found or do not belong to source system' }])
      }
    }
    // Delete existing SOURCE bindings and recreate
    await prisma.interfaceEntityBinding.deleteMany({
      where: { interfaceId: id, side: 'SOURCE' },
    })
    if (body.sourceEntityIds.length > 0) {
      await prisma.interfaceEntityBinding.createMany({
        data: body.sourceEntityIds.map((entityId) => ({
          interfaceId: id,
          entityId,
          side: 'SOURCE',
        })),
      })
    }
  }

  // Handle targetEntityIds: validate belong to target system
  if (body.targetEntityIds !== undefined) {
    if (body.targetEntityIds.length > 0) {
      const targetEntities = await prisma.systemEntity.findMany({
        where: { id: { in: body.targetEntityIds }, systemId: iface.targetSystemId, workspaceId },
      })
      if (targetEntities.length !== body.targetEntityIds.length) {
        throw new ValidationError([{ field: 'targetEntityIds', message: 'One or more target entities not found or do not belong to target system' }])
      }
    }
    // Delete existing TARGET bindings and recreate
    await prisma.interfaceEntityBinding.deleteMany({
      where: { interfaceId: id, side: 'TARGET' },
    })
    if (body.targetEntityIds.length > 0) {
      await prisma.interfaceEntityBinding.createMany({
        data: body.targetEntityIds.map((entityId) => ({
          interfaceId: id,
          entityId,
          side: 'TARGET',
        })),
      })
    }
  }

  const updated = await prisma.interface.update({
    where: { id },
    data,
    include: {
      sourceSystem: { select: { id: true, name: true } },
      targetSystem: { select: { id: true, name: true } },
      entityBindings: {
        include: {
          entity: { select: { id: true, name: true, slug: true } },
        },
      },
    },
  })

  const { entityBindings, ...rest } = updated
  const { sourceEntities, targetEntities } = groupBindings(entityBindings)
  return { ...rest, sourceEntities, targetEntities }
}

export async function remove(workspaceId: string, id: string) {
  const iface = await prisma.interface.findFirst({
    where: { id, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  // Cascade deletes interface fields and entity bindings via Prisma onDelete: Cascade
  await prisma.interface.delete({ where: { id } })
  return { success: true }
}
