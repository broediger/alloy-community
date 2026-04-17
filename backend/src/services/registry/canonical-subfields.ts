import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, DeleteConflictError, ConflictError, ValidationError } from '../../errors/index.js'

export interface CreateSubfieldBody {
  name: string
  displayName: string
  description?: string
  dataType: string
  format?: string
  nullable?: boolean
}

export interface UpdateSubfieldBody {
  name?: string
  displayName?: string
  description?: string
  dataType?: string
  format?: string
  nullable?: boolean
}

export async function list(workspaceId: string, parentFieldId: string) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: parentFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const subfields = await prisma.canonicalSubfield.findMany({
    where: { parentFieldId },
    orderBy: { position: 'asc' },
  })

  return { items: subfields, total: subfields.length }
}

export async function create(workspaceId: string, parentFieldId: string, body: CreateSubfieldBody) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: parentFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const existing = await prisma.canonicalSubfield.findFirst({
    where: { parentFieldId, name: body.name },
  })
  if (existing) throw new ConflictError(`A subfield with name '${body.name}' already exists for this field`)

  const maxPosition = await prisma.canonicalSubfield.aggregate({
    where: { parentFieldId },
    _max: { position: true },
  })
  const nextPosition = (maxPosition._max.position ?? -1) + 1

  return prisma.canonicalSubfield.create({
    data: {
      workspaceId,
      parentFieldId,
      name: body.name,
      displayName: body.displayName,
      description: body.description ?? null,
      dataType: body.dataType as Prisma.CanonicalSubfieldCreateInput['dataType'],
      format: body.format ?? null,
      nullable: body.nullable ?? true,
      position: nextPosition,
    },
  })
}

export async function update(workspaceId: string, parentFieldId: string, id: string, body: UpdateSubfieldBody) {
  const subfield = await prisma.canonicalSubfield.findFirst({
    where: { id, parentFieldId, workspaceId },
  })
  if (!subfield) throw new NotFoundError('Canonical subfield')

  if (body.name && body.name !== subfield.name) {
    const existing = await prisma.canonicalSubfield.findFirst({
      where: { parentFieldId, name: body.name },
    })
    if (existing) throw new ConflictError(`A subfield with name '${body.name}' already exists for this field`)
  }

  const data: Prisma.CanonicalSubfieldUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.displayName !== undefined) data.displayName = body.displayName
  if (body.description !== undefined) data.description = body.description
  if (body.dataType !== undefined) data.dataType = body.dataType as Prisma.CanonicalSubfieldUpdateInput['dataType']
  if (body.format !== undefined) data.format = body.format
  if (body.nullable !== undefined) data.nullable = body.nullable

  return prisma.canonicalSubfield.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, parentFieldId: string, id: string) {
  const subfield = await prisma.canonicalSubfield.findFirst({
    where: { id, parentFieldId, workspaceId },
    include: {
      _count: { select: { mappings: true } },
    },
  })
  if (!subfield) throw new NotFoundError('Canonical subfield')

  if (subfield._count.mappings > 0) {
    throw new DeleteConflictError('Cannot delete subfield with active mappings', [
      { type: 'mappings', count: subfield._count.mappings },
    ])
  }

  await prisma.canonicalSubfield.delete({ where: { id } })
  return { success: true }
}

export async function reorder(workspaceId: string, parentFieldId: string, ids: string[]) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: parentFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const existing = await prisma.canonicalSubfield.findMany({
    where: { parentFieldId },
    select: { id: true },
  })

  const existingIds = new Set(existing.map((s) => s.id))
  const providedIds = new Set(ids)

  if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
    throw new ValidationError([
      { field: 'ids', message: 'Provided IDs do not match the subfield set for this field' },
    ])
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.canonicalSubfield.update({
        where: { id },
        data: { position: index },
      })
    )
  )

  return prisma.canonicalSubfield.findMany({
    where: { parentFieldId },
    orderBy: { position: 'asc' },
  })
}
