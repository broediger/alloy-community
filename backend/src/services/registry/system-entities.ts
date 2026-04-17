import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateSystemEntityBody {
  name: string
  slug: string
  description?: string
}

export interface UpdateSystemEntityBody {
  name?: string
  slug?: string
  description?: string
}

export async function list(workspaceId: string, systemId: string) {
  const system = await prisma.system.findFirst({
    where: { id: systemId, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  const entities = await prisma.systemEntity.findMany({
    where: { systemId, workspaceId },
    include: {
      fields: {
        include: {
          _count: { select: { mappings: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = entities.map((e) => ({
    id: e.id,
    workspaceId: e.workspaceId,
    systemId: e.systemId,
    name: e.name,
    slug: e.slug,
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    fieldCount: e.fields.length,
    mappedFieldCount: e.fields.filter((f) => f._count.mappings > 0).length,
  }))

  return { items, total: items.length }
}

export async function getById(workspaceId: string, systemId: string, id: string) {
  const entity = await prisma.systemEntity.findFirst({
    where: { id, systemId, workspaceId },
    include: {
      fields: {
        include: {
          mappings: {
            include: {
              canonicalField: { select: { id: true, name: true } },
            },
            take: 1,
          },
        },
      },
    },
  })
  if (!entity) throw new NotFoundError('System entity')

  return {
    id: entity.id,
    workspaceId: entity.workspaceId,
    systemId: entity.systemId,
    name: entity.name,
    slug: entity.slug,
    description: entity.description,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
    fields: entity.fields.map((f) => ({
      id: f.id,
      name: f.name,
      path: f.path,
      dataType: f.dataType,
      mappedTo: f.mappings[0]?.canonicalField
        ? {
            canonicalFieldId: f.mappings[0].canonicalField.id,
            canonicalFieldName: f.mappings[0].canonicalField.name,
          }
        : null,
    })),
  }
}

export async function create(workspaceId: string, systemId: string, body: CreateSystemEntityBody) {
  const system = await prisma.system.findFirst({
    where: { id: systemId, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  const existing = await prisma.systemEntity.findFirst({
    where: { systemId, slug: body.slug },
  })
  if (existing) throw new ConflictError(`A system entity with slug '${body.slug}' already exists in this system`)

  return prisma.systemEntity.create({
    data: {
      workspaceId,
      systemId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
    },
  })
}

export async function update(workspaceId: string, systemId: string, id: string, body: UpdateSystemEntityBody) {
  const entity = await prisma.systemEntity.findFirst({
    where: { id, systemId, workspaceId },
  })
  if (!entity) throw new NotFoundError('System entity')

  if (body.slug && body.slug !== entity.slug) {
    const existing = await prisma.systemEntity.findFirst({
      where: { systemId, slug: body.slug },
    })
    if (existing) throw new ConflictError(`A system entity with slug '${body.slug}' already exists in this system`)
  }

  const data: Prisma.SystemEntityUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.slug !== undefined) data.slug = body.slug
  if (body.description !== undefined) data.description = body.description

  return prisma.systemEntity.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, systemId: string, id: string) {
  const entity = await prisma.systemEntity.findFirst({
    where: { id, systemId, workspaceId },
    include: {
      _count: { select: { fields: true } },
    },
  })
  if (!entity) throw new NotFoundError('System entity')

  if (entity._count.fields > 0) {
    throw new DeleteConflictError('Cannot delete system entity with existing fields', [
      { type: 'fields', count: entity._count.fields },
    ])
  }

  await prisma.systemEntity.delete({ where: { id } })
  return { success: true }
}
