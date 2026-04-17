import { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'

export async function list(workspaceId: string, canonicalFieldId: string) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const values = await prisma.canonicalEnumValue.findMany({
    where: { canonicalFieldId },
    orderBy: { position: 'asc' },
  })

  return { items: values, total: values.length }
}

export async function create(workspaceId: string, canonicalFieldId: string, body: { code: string; label: string }) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const existing = await prisma.canonicalEnumValue.findFirst({
    where: { canonicalFieldId, code: body.code },
  })
  if (existing) throw new ConflictError(`An enum value with code '${body.code}' already exists for this field`)

  const maxPosition = await prisma.canonicalEnumValue.aggregate({
    where: { canonicalFieldId },
    _max: { position: true },
  })
  const nextPosition = (maxPosition._max.position ?? -1) + 1

  return prisma.canonicalEnumValue.create({
    data: {
      canonicalFieldId,
      code: body.code,
      label: body.label,
      position: nextPosition,
    },
  })
}

export async function update(workspaceId: string, canonicalFieldId: string, id: string, body: { code?: string; label?: string }) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const enumValue = await prisma.canonicalEnumValue.findFirst({
    where: { id, canonicalFieldId },
  })
  if (!enumValue) throw new NotFoundError('Enum value')

  if (body.code && body.code !== enumValue.code) {
    const existing = await prisma.canonicalEnumValue.findFirst({
      where: { canonicalFieldId, code: body.code },
    })
    if (existing) throw new ConflictError(`An enum value with code '${body.code}' already exists for this field`)
  }

  const data: Prisma.CanonicalEnumValueUpdateInput = {}
  if (body.code !== undefined) data.code = body.code
  if (body.label !== undefined) data.label = body.label

  return prisma.canonicalEnumValue.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, canonicalFieldId: string, id: string) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const enumValue = await prisma.canonicalEnumValue.findFirst({
    where: { id, canonicalFieldId },
  })
  if (!enumValue) throw new NotFoundError('Enum value')

  await prisma.canonicalEnumValue.delete({ where: { id } })
  return { success: true }
}

export async function reorder(workspaceId: string, canonicalFieldId: string, ids: string[]) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const existing = await prisma.canonicalEnumValue.findMany({
    where: { canonicalFieldId },
    select: { id: true },
  })

  const existingIds = new Set(existing.map((e) => e.id))
  const providedIds = new Set(ids)

  if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
    throw new ValidationError([
      { field: 'ids', message: 'Provided IDs do not match the enum value set for this field' },
    ])
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.canonicalEnumValue.update({
        where: { id },
        data: { position: index },
      })
    )
  )

  return prisma.canonicalEnumValue.findMany({
    where: { canonicalFieldId },
    orderBy: { position: 'asc' },
  })
}
