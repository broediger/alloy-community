import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

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
            select: { id: true, name: true, displayName: true, dataType: true },
          },
        },
      },
    },
  })
  if (!iface) throw new NotFoundError('Interface')

  const { sourceEntities, targetEntities } = groupBindings(iface.entityBindings)
  const sourceEntityIds = sourceEntities.map((e) => e.id)
  const targetEntityIds = targetEntities.map((e) => e.id)

  // Resolve source and target mappings for each interface field
  // If entity bindings exist, filter mappings to those specific entities
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
          status: f.status,
          createdAt: f.createdAt,
          updatedAt: f.updatedAt,
          sourceMapping: null,
          targetMapping: null,
        }
      }

      const sourceMappingFilter = sourceEntityIds.length > 0
        ? { entityId: { in: sourceEntityIds } }
        : { entity: { systemId: iface.sourceSystemId } }

      const sourceMapping = await prisma.mapping.findFirst({
        where: {
          canonicalFieldId: f.canonicalFieldId,
          workspaceId,
          systemField: sourceMappingFilter,
        },
        include: {
          systemField: {
            select: {
              id: true, name: true, path: true, entityId: true,
              entity: { select: { id: true, name: true } },
            },
          },
          transformationRule: { select: { id: true, type: true } },
        },
      })

      const targetMappingFilter = targetEntityIds.length > 0
        ? { entityId: { in: targetEntityIds } }
        : { entity: { systemId: iface.targetSystemId } }

      const targetMapping = await prisma.mapping.findFirst({
        where: {
          canonicalFieldId: f.canonicalFieldId,
          workspaceId,
          systemField: targetMappingFilter,
        },
        include: {
          systemField: {
            select: {
              id: true, name: true, path: true, entityId: true,
              entity: { select: { id: true, name: true } },
            },
          },
          transformationRule: { select: { id: true, type: true } },
        },
      })

      function mapMapping(m: typeof sourceMapping) {
        if (!m) return null
        return {
          id: m.id,
          systemFieldId: m.systemField?.id ?? null,
          systemFieldName: m.systemField?.name ?? null,
          systemFieldPath: m.systemField?.path ?? null,
          entityName: m.systemField?.entity?.name ?? null,
          deprecated: m.deprecated,
          transformationRule: m.transformationRule
            ? { type: m.transformationRule.type }
            : null,
        }
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
        status: f.status,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        sourceMapping: mapMapping(sourceMapping),
        targetMapping: mapMapping(targetMapping),
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
      direction: body.direction as any,
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

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.direction !== undefined) data.direction = body.direction

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
