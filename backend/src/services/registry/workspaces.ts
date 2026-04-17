import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateWorkspaceBody {
  name: string
  slug: string
  settings?: unknown
}

export interface UpdateWorkspaceBody {
  name?: string
  slug?: string
  settings?: unknown
}

export async function list() {
  const workspaces = await prisma.workspace.findMany({
    include: {
      _count: {
        select: {
          canonicalFields: true,
          systems: true,
          interfaces: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = workspaces.map((w) => ({
    id: w.id,
    name: w.name,
    slug: w.slug,
    settings: w.settings,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
    canonicalFieldCount: w._count.canonicalFields,
    systemCount: w._count.systems,
    interfaceCount: w._count.interfaces,
  }))

  return { items, total: items.length }
}

export async function getById(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
  })
  if (!workspace) throw new NotFoundError('Workspace')
  return workspace
}

export async function create(body: CreateWorkspaceBody) {
  const existing = await prisma.workspace.findUnique({
    where: { slug: body.slug },
  })
  if (existing) throw new ConflictError(`A workspace with slug '${body.slug}' already exists`)

  return prisma.workspace.create({
    data: {
      name: body.name,
      slug: body.slug,
      settings: (body.settings ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  })
}

export async function update(id: string, body: UpdateWorkspaceBody) {
  const workspace = await prisma.workspace.findUnique({ where: { id } })
  if (!workspace) throw new NotFoundError('Workspace')

  if (body.slug && body.slug !== workspace.slug) {
    const existing = await prisma.workspace.findUnique({
      where: { slug: body.slug },
    })
    if (existing) throw new ConflictError(`A workspace with slug '${body.slug}' already exists`)
  }

  const data: Prisma.WorkspaceUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.slug !== undefined) data.slug = body.slug
  if (body.settings !== undefined) data.settings = body.settings as Prisma.InputJsonValue

  return prisma.workspace.update({
    where: { id },
    data,
  })
}

export async function remove(id: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          canonicalEntities: true,
          systems: true,
          interfaces: true,
        },
      },
    },
  })
  if (!workspace) throw new NotFoundError('Workspace')

  const deps: { type: string; count: number }[] = []
  if (workspace._count.canonicalEntities > 0) deps.push({ type: 'canonicalEntities', count: workspace._count.canonicalEntities })
  if (workspace._count.systems > 0) deps.push({ type: 'systems', count: workspace._count.systems })
  if (workspace._count.interfaces > 0) deps.push({ type: 'interfaces', count: workspace._count.interfaces })

  if (deps.length > 0) {
    throw new DeleteConflictError('Cannot delete workspace with existing dependents', deps)
  }

  await prisma.workspace.delete({ where: { id } })
  return { success: true }
}
