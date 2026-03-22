import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateCanonicalEntityBody {
  name: string
  slug: string
  description?: string
}

export interface UpdateCanonicalEntityBody {
  name?: string
  slug?: string
  description?: string
}

export async function list(workspaceId: string) {
  const entities = await prisma.canonicalEntity.findMany({
    where: { workspaceId },
    include: {
      _count: {
        select: { fields: true },
      },
      fields: {
        select: {
          id: true,
          _count: { select: { mappings: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = entities.map((e) => ({
    id: e.id,
    workspaceId: e.workspaceId,
    name: e.name,
    slug: e.slug,
    description: e.description,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
    fieldCount: e._count.fields,
    mappedFieldCount: e.fields.filter((f) => f._count.mappings > 0).length,
  }))

  return { items, total: items.length }
}

export async function getById(workspaceId: string, id: string) {
  const entity = await prisma.canonicalEntity.findFirst({
    where: { id, workspaceId },
  })
  if (!entity) throw new NotFoundError('Canonical entity')
  return entity
}

export async function create(workspaceId: string, body: CreateCanonicalEntityBody) {
  const existing = await prisma.canonicalEntity.findFirst({
    where: { workspaceId, slug: body.slug },
  })
  if (existing) throw new ConflictError(`A canonical entity with slug '${body.slug}' already exists in this workspace`)

  return prisma.canonicalEntity.create({
    data: {
      workspaceId,
      name: body.name,
      slug: body.slug,
      description: body.description ?? null,
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateCanonicalEntityBody) {
  const entity = await prisma.canonicalEntity.findFirst({
    where: { id, workspaceId },
  })
  if (!entity) throw new NotFoundError('Canonical entity')

  if (body.slug && body.slug !== entity.slug) {
    const existing = await prisma.canonicalEntity.findFirst({
      where: { workspaceId, slug: body.slug },
    })
    if (existing) throw new ConflictError(`A canonical entity with slug '${body.slug}' already exists in this workspace`)
  }

  return prisma.canonicalEntity.update({
    where: { id },
    data: {
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.slug !== undefined ? { slug: body.slug } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
    },
  })
}

export async function remove(workspaceId: string, id: string) {
  const entity = await prisma.canonicalEntity.findFirst({
    where: { id, workspaceId },
    include: {
      _count: { select: { fields: true } },
    },
  })
  if (!entity) throw new NotFoundError('Canonical entity')

  if (entity._count.fields > 0) {
    throw new DeleteConflictError('Cannot delete canonical entity with existing fields', [
      { type: 'fields', count: entity._count.fields },
    ])
  }

  await prisma.canonicalEntity.delete({ where: { id } })
  return { success: true }
}
