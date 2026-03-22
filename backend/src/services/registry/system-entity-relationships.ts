import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface CreateRelationshipBody {
  sourceEntityId: string
  targetEntityId: string
  viaFieldId: string
  relationshipType: string
}

export async function list(workspaceId: string, systemId: string) {
  const system = await prisma.system.findFirst({
    where: { id: systemId, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  const relationships = await prisma.systemEntityRelationship.findMany({
    where: { workspaceId, sourceEntity: { systemId }, targetEntity: { systemId } },
    include: {
      sourceEntity: { select: { id: true, name: true } },
      targetEntity: { select: { id: true, name: true } },
      viaField: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = relationships.map((r) => ({
    id: r.id,
    workspaceId: r.workspaceId,
    sourceEntityId: r.sourceEntityId,
    sourceEntityName: r.sourceEntity.name,
    targetEntityId: r.targetEntityId,
    targetEntityName: r.targetEntity.name,
    viaFieldId: r.viaFieldId,
    viaFieldName: r.viaField.name,
    relationshipType: r.relationshipType,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))

  return { items, total: items.length }
}

export async function create(workspaceId: string, systemId: string, body: CreateRelationshipBody) {
  const system = await prisma.system.findFirst({
    where: { id: systemId, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  // Validate all referenced entities belong to the same system and workspace
  const sourceEntity = await prisma.systemEntity.findFirst({
    where: { id: body.sourceEntityId, systemId, workspaceId },
  })
  if (!sourceEntity) {
    throw new ValidationError([
      { field: 'sourceEntityId', message: 'Source entity does not belong to this system' },
    ])
  }

  const targetEntity = await prisma.systemEntity.findFirst({
    where: { id: body.targetEntityId, systemId, workspaceId },
  })
  if (!targetEntity) {
    throw new ValidationError([
      { field: 'targetEntityId', message: 'Target entity does not belong to this system' },
    ])
  }

  const viaField = await prisma.systemField.findFirst({
    where: { id: body.viaFieldId, workspaceId, entity: { systemId } },
  })
  if (!viaField) {
    throw new ValidationError([
      { field: 'viaFieldId', message: 'Via field does not belong to this system' },
    ])
  }

  return prisma.systemEntityRelationship.create({
    data: {
      workspaceId,
      sourceEntityId: body.sourceEntityId,
      targetEntityId: body.targetEntityId,
      viaFieldId: body.viaFieldId,
      relationshipType: body.relationshipType as any,
    },
    include: {
      sourceEntity: { select: { id: true, name: true } },
      targetEntity: { select: { id: true, name: true } },
      viaField: { select: { id: true, name: true } },
    },
  })
}

export async function remove(workspaceId: string, systemId: string, id: string) {
  const relationship = await prisma.systemEntityRelationship.findFirst({
    where: { id, workspaceId },
  })
  if (!relationship) throw new NotFoundError('Relationship')

  await prisma.systemEntityRelationship.delete({ where: { id } })
  return { success: true }
}
