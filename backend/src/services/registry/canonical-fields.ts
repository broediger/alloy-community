import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError, ValidationError } from '../../errors/index.js'

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
  referencedEntityId?: string
  cardinality?: 'ONE' | 'MANY'
  itemsDataType?: string
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
  referencedEntityId?: string | null
  cardinality?: 'ONE' | 'MANY' | null
  itemsDataType?: string | null
}

async function validateRelationshipFields(
  workspaceId: string,
  body: CreateCanonicalFieldBody | UpdateCanonicalFieldBody,
  current?: { isComposite: boolean; dataType: string; entityId: string; id?: string }
) {
  // Resolve effective values (body overrides current)
  const isComposite = body.isComposite ?? current?.isComposite ?? false
  const dataType = (body as any).dataType ?? current?.dataType
  const referencedEntityId = body.referencedEntityId
  const cardinality = body.cardinality
  const itemsDataType = body.itemsDataType

  // referencedEntityId XOR isComposite (both inline composite and entity ref are mutually exclusive)
  if (referencedEntityId && isComposite) {
    throw new ValidationError([
      { field: 'referencedEntityId', message: 'Entity reference and inline composite are mutually exclusive' },
    ])
  }

  // If referencedEntityId set, cardinality required
  if (referencedEntityId && !cardinality) {
    throw new ValidationError([
      { field: 'cardinality', message: 'Cardinality is required when referencing an entity' },
    ])
  }

  // Validate referenced entity exists in same workspace; reject self-reference
  if (referencedEntityId) {
    const refEntity = await prisma.canonicalEntity.findFirst({
      where: { id: referencedEntityId, workspaceId },
    })
    if (!refEntity) {
      throw new ValidationError([
        { field: 'referencedEntityId', message: 'Referenced entity not found in this workspace' },
      ])
    }
    if (current?.entityId === referencedEntityId) {
      throw new ValidationError([
        { field: 'referencedEntityId', message: 'Field cannot reference its own parent entity' },
      ])
    }
  }

  // itemsDataType only valid when dataType=ARRAY OR (isComposite=true AND cardinality=MANY)
  if (itemsDataType) {
    const isArrayPrimitive = dataType === 'ARRAY'
    const isCompositeArray = isComposite && cardinality === 'MANY'
    if (!isArrayPrimitive && !isCompositeArray) {
      throw new ValidationError([
        { field: 'itemsDataType', message: 'itemsDataType only valid when dataType=ARRAY or composite array' },
      ])
    }
  }
}

export interface CanonicalFieldFilters {
  entityId?: string
  dataType?: string
  tags?: string
  mapped?: string
  search?: string
}

export async function list(workspaceId: string, filters: CanonicalFieldFilters) {
  const where: Prisma.CanonicalFieldWhereInput = { workspaceId }

  if (filters.entityId) where.entityId = filters.entityId
  if (filters.dataType) where.dataType = filters.dataType as Prisma.CanonicalFieldWhereInput['dataType']
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
    referencedEntityId: f.referencedEntityId,
    cardinality: f.cardinality,
    itemsDataType: f.itemsDataType,
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
    referencedEntityId: field.referencedEntityId,
    cardinality: field.cardinality,
    itemsDataType: field.itemsDataType,
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

  await validateRelationshipFields(workspaceId, body, {
    isComposite: body.isComposite ?? false,
    dataType: body.dataType,
    entityId: body.entityId,
  })

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
      referencedEntityId: body.referencedEntityId ?? null,
      cardinality: (body.cardinality ?? null) as any,
      itemsDataType: (body.itemsDataType ?? null) as any,
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

  await validateRelationshipFields(workspaceId, body, {
    isComposite: field.isComposite,
    dataType: field.dataType,
    entityId: field.entityId,
    id: field.id,
  })

  const data: Prisma.CanonicalFieldUncheckedUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.displayName !== undefined) data.displayName = body.displayName
  if (body.description !== undefined) data.description = body.description
  if (body.dataType !== undefined) data.dataType = body.dataType as Prisma.CanonicalFieldUncheckedUpdateInput['dataType']
  if (body.format !== undefined) data.format = body.format
  if (body.nullable !== undefined) data.nullable = body.nullable
  if (body.minValue !== undefined) data.minValue = body.minValue
  if (body.maxValue !== undefined) data.maxValue = body.maxValue
  if (body.isComposite !== undefined) data.isComposite = body.isComposite
  if (body.compositionPattern !== undefined) data.compositionPattern = body.compositionPattern
  if (body.tags !== undefined) data.tags = body.tags
  if (body.referencedEntityId !== undefined) data.referencedEntityId = body.referencedEntityId
  if (body.cardinality !== undefined) data.cardinality = body.cardinality
  if (body.itemsDataType !== undefined) data.itemsDataType = body.itemsDataType as Prisma.CanonicalFieldUncheckedUpdateInput['itemsDataType']

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
