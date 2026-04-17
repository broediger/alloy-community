import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateSystemFieldBody {
  entityId: string
  name: string
  path?: string
  dataType: string
  format?: string
  nullable?: boolean
  required?: boolean
}

export interface UpdateSystemFieldBody {
  name?: string
  path?: string
  dataType?: string
  format?: string
  nullable?: boolean
  required?: boolean
}

export interface SystemFieldFilters {
  entityId?: string
  systemId?: string
  mapped?: string
  search?: string
}

export async function list(workspaceId: string, filters: SystemFieldFilters) {
  const where: Prisma.SystemFieldWhereInput = { workspaceId }

  if (filters.entityId) where.entityId = filters.entityId
  if (filters.systemId) {
    where.entity = { systemId: filters.systemId }
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { path: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const fields = await prisma.systemField.findMany({
    where,
    include: {
      _count: { select: { mappings: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  let items = fields.map((f) => ({
    id: f.id,
    workspaceId: f.workspaceId,
    entityId: f.entityId,
    name: f.name,
    path: f.path,
    dataType: f.dataType,
    format: f.format,
    nullable: f.nullable,
    required: f.required,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    mappingCount: f._count.mappings,
  }))

  if (filters.mapped === 'true') {
    items = items.filter((f) => f.mappingCount > 0)
  } else if (filters.mapped === 'false') {
    items = items.filter((f) => f.mappingCount === 0)
  }

  return { items, total: items.length }
}

export async function getById(workspaceId: string, id: string) {
  const field = await prisma.systemField.findFirst({
    where: { id, workspaceId },
    include: {
      mappings: {
        include: {
          canonicalField: { select: { id: true, name: true } },
          transformationRule: { select: { type: true } },
        },
        take: 1,
      },
    },
  })
  if (!field) throw new NotFoundError('System field')

  const mapping = field.mappings[0]
  return {
    id: field.id,
    workspaceId: field.workspaceId,
    entityId: field.entityId,
    name: field.name,
    path: field.path,
    dataType: field.dataType,
    format: field.format,
    nullable: field.nullable,
    required: field.required,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
    mapping: mapping
      ? {
          id: mapping.id,
          canonicalFieldId: mapping.canonicalField?.id ?? null,
          canonicalFieldName: mapping.canonicalField?.name ?? null,
          deprecated: mapping.deprecated,
          transformationRule: mapping.transformationRule
            ? { type: mapping.transformationRule.type }
            : null,
        }
      : null,
  }
}

export async function create(workspaceId: string, body: CreateSystemFieldBody) {
  const entity = await prisma.systemEntity.findFirst({
    where: { id: body.entityId, workspaceId },
  })
  if (!entity) throw new NotFoundError('System entity')

  const existing = await prisma.systemField.findFirst({
    where: { entityId: body.entityId, name: body.name },
  })
  if (existing) throw new ConflictError(`A system field with name '${body.name}' already exists in this entity`)

  return prisma.systemField.create({
    data: {
      workspaceId,
      entityId: body.entityId,
      name: body.name,
      path: body.path ?? null,
      dataType: body.dataType,
      format: body.format ?? null,
      nullable: body.nullable ?? true,
      required: body.required ?? false,
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateSystemFieldBody) {
  const field = await prisma.systemField.findFirst({
    where: { id, workspaceId },
  })
  if (!field) throw new NotFoundError('System field')

  if (body.name && body.name !== field.name) {
    const existing = await prisma.systemField.findFirst({
      where: { entityId: field.entityId, name: body.name },
    })
    if (existing) throw new ConflictError(`A system field with name '${body.name}' already exists in this entity`)
  }

  const data: Prisma.SystemFieldUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.path !== undefined) data.path = body.path
  if (body.dataType !== undefined) data.dataType = body.dataType
  if (body.format !== undefined) data.format = body.format
  if (body.nullable !== undefined) data.nullable = body.nullable
  if (body.required !== undefined) data.required = body.required

  return prisma.systemField.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, id: string) {
  const field = await prisma.systemField.findFirst({
    where: { id, workspaceId },
    include: {
      _count: { select: { mappings: true } },
    },
  })
  if (!field) throw new NotFoundError('System field')

  if (field._count.mappings > 0) {
    throw new DeleteConflictError('Cannot delete system field with existing mappings', [
      { type: 'mappings', count: field._count.mappings },
    ])
  }

  await prisma.systemField.delete({ where: { id } })
  return { success: true }
}
