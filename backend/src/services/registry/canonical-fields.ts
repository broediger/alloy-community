import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError } from '../../errors/index.js'

export interface CreateCanonicalFieldBody {
  entityId: string
  name: string
  displayName: string
  description?: string
  dataType: string
  format?: string
  nullable?: boolean
  minValue?: string
  maxValue?: string
  isComposite?: boolean
  compositionPattern?: string
  tags?: string[]
}

export interface UpdateCanonicalFieldBody {
  name?: string
  displayName?: string
  description?: string
  dataType?: string
  format?: string
  nullable?: boolean
  minValue?: string
  maxValue?: string
  isComposite?: boolean
  compositionPattern?: string
  tags?: string[]
}

export interface CanonicalFieldFilters {
  entityId?: string
  dataType?: string
  tags?: string
  mapped?: string
  search?: string
}

export async function list(workspaceId: string, filters: CanonicalFieldFilters) {
  const where: any = { workspaceId }

  if (filters.entityId) where.entityId = filters.entityId
  if (filters.dataType) where.dataType = filters.dataType
  if (filters.tags) {
    where.tags = { hasSome: filters.tags.split(',') }
  }
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { displayName: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ]
  }

  const fields = await prisma.canonicalField.findMany({
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
    displayName: f.displayName,
    description: f.description,
    dataType: f.dataType,
    format: f.format,
    nullable: f.nullable,
    minValue: f.minValue,
    maxValue: f.maxValue,
    isComposite: f.isComposite,
    compositionPattern: f.compositionPattern,
    tags: f.tags,
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
  const field = await prisma.canonicalField.findFirst({
    where: { id, workspaceId },
    include: {
      subfields: { orderBy: { position: 'asc' } },
      examples: true,
      enumValues: { orderBy: { position: 'asc' } },
      _count: { select: { mappings: true } },
    },
  })
  if (!field) throw new NotFoundError('Canonical field')

  return {
    id: field.id,
    workspaceId: field.workspaceId,
    entityId: field.entityId,
    name: field.name,
    displayName: field.displayName,
    description: field.description,
    dataType: field.dataType,
    format: field.format,
    nullable: field.nullable,
    minValue: field.minValue,
    maxValue: field.maxValue,
    isComposite: field.isComposite,
    compositionPattern: field.compositionPattern,
    tags: field.tags,
    createdAt: field.createdAt,
    updatedAt: field.updatedAt,
    subfields: field.subfields,
    examples: field.examples,
    enumValues: field.enumValues,
    mappingCount: field._count.mappings,
  }
}

export async function create(workspaceId: string, body: CreateCanonicalFieldBody) {
  const entity = await prisma.canonicalEntity.findFirst({
    where: { id: body.entityId, workspaceId },
  })
  if (!entity) throw new NotFoundError('Canonical entity')

  const existing = await prisma.canonicalField.findFirst({
    where: { entityId: body.entityId, name: body.name },
  })
  if (existing) throw new ConflictError(`A canonical field with name '${body.name}' already exists in this entity`)

  return prisma.canonicalField.create({
    data: {
      workspaceId,
      entityId: body.entityId,
      name: body.name,
      displayName: body.displayName,
      description: body.description ?? null,
      dataType: body.dataType as any,
      format: body.format ?? null,
      nullable: body.nullable ?? true,
      minValue: body.minValue ?? null,
      maxValue: body.maxValue ?? null,
      isComposite: body.isComposite ?? false,
      compositionPattern: body.compositionPattern ?? null,
      tags: body.tags ?? [],
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateCanonicalFieldBody) {
  const field = await prisma.canonicalField.findFirst({
    where: { id, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  if (body.name && body.name !== field.name) {
    const existing = await prisma.canonicalField.findFirst({
      where: { entityId: field.entityId, name: body.name },
    })
    if (existing) throw new ConflictError(`A canonical field with name '${body.name}' already exists in this entity`)
  }

  const data: any = {}
  if (body.name !== undefined) data.name = body.name
  if (body.displayName !== undefined) data.displayName = body.displayName
  if (body.description !== undefined) data.description = body.description
  if (body.dataType !== undefined) data.dataType = body.dataType
  if (body.format !== undefined) data.format = body.format
  if (body.nullable !== undefined) data.nullable = body.nullable
  if (body.minValue !== undefined) data.minValue = body.minValue
  if (body.maxValue !== undefined) data.maxValue = body.maxValue
  if (body.isComposite !== undefined) data.isComposite = body.isComposite
  if (body.compositionPattern !== undefined) data.compositionPattern = body.compositionPattern
  if (body.tags !== undefined) data.tags = body.tags

  return prisma.canonicalField.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, id: string) {
  const field = await prisma.canonicalField.findFirst({
    where: { id, workspaceId },
    include: {
      _count: { select: { mappings: true, interfaceFields: true } },
    },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const deps: { type: string; count: number }[] = []
  if (field._count.mappings > 0) deps.push({ type: 'mappings', count: field._count.mappings })
  if (field._count.interfaceFields > 0) deps.push({ type: 'interfaceFields', count: field._count.interfaceFields })

  if (deps.length > 0) {
    throw new DeleteConflictError('Cannot delete canonical field with active dependents', deps)
  }

  await prisma.canonicalField.delete({ where: { id } })
  return { success: true }
}
