import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateSystemBody {
  name: string
  description?: string
  systemType: string
  baseUrl?: string
  notes?: string
}

export interface UpdateSystemBody {
  name?: string
  description?: string
  systemType?: string
  baseUrl?: string
  notes?: string
}

export async function list(workspaceId: string) {
  const systems = await prisma.system.findMany({
    where: { workspaceId },
    include: {
      entities: {
        include: {
          fields: {
            include: {
              _count: { select: { mappings: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = systems.map((s) => {
    const allFields = s.entities.flatMap((e) => e.fields)
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      name: s.name,
      description: s.description,
      systemType: s.systemType,
      baseUrl: s.baseUrl,
      notes: s.notes,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      canonicalFieldCount: allFields.length,
      mappedFieldCount: allFields.filter((f) => f._count.mappings > 0).length,
    }
  })

  return { items, total: items.length }
}

export async function getById(workspaceId: string, id: string) {
  const system = await prisma.system.findFirst({
    where: { id, workspaceId },
    include: {
      entities: {
        include: {
          fields: {
            include: {
              _count: { select: { mappings: true } },
            },
          },
        },
      },
    },
  })
  if (!system) throw new NotFoundError('System')

  return {
    id: system.id,
    workspaceId: system.workspaceId,
    name: system.name,
    description: system.description,
    systemType: system.systemType,
    baseUrl: system.baseUrl,
    notes: system.notes,
    createdAt: system.createdAt,
    updatedAt: system.updatedAt,
    entities: system.entities.map((e) => ({
      id: e.id,
      name: e.name,
      slug: e.slug,
      fieldCount: e.fields.length,
      mappedFieldCount: e.fields.filter((f) => f._count.mappings > 0).length,
    })),
  }
}

export async function create(workspaceId: string, body: CreateSystemBody) {
  const existing = await prisma.system.findFirst({
    where: { workspaceId, name: body.name },
  })
  if (existing) throw new ConflictError(`A system with name '${body.name}' already exists in this workspace`)

  return prisma.system.create({
    data: {
      workspaceId,
      name: body.name,
      description: body.description ?? null,
      systemType: body.systemType as any,
      baseUrl: body.baseUrl ?? null,
      notes: body.notes ?? null,
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateSystemBody) {
  const system = await prisma.system.findFirst({
    where: { id, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  if (body.name && body.name !== system.name) {
    const existing = await prisma.system.findFirst({
      where: { workspaceId, name: body.name },
    })
    if (existing) throw new ConflictError(`A system with name '${body.name}' already exists in this workspace`)
  }

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.systemType !== undefined) data.systemType = body.systemType
  if (body.baseUrl !== undefined) data.baseUrl = body.baseUrl
  if (body.notes !== undefined) data.notes = body.notes

  return prisma.system.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, id: string) {
  const system = await prisma.system.findFirst({
    where: { id, workspaceId },
    include: {
      _count: { select: { entities: true } },
    },
  })
  if (!system) throw new NotFoundError('System')

  if (system._count.entities > 0) {
    throw new DeleteConflictError('Cannot delete system with existing entities', [
      { type: 'entities', count: system._count.entities },
    ])
  }

  await prisma.system.delete({ where: { id } })
  return { success: true }
}
