import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'

export interface CreateInterfaceFieldBody {
  canonicalFieldId: string
  status: string
}

export interface UpdateInterfaceFieldBody {
  status: string
}

export async function list(workspaceId: string, interfaceId: string) {
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  const fields = await prisma.interfaceField.findMany({
    where: { interfaceId },
    include: {
      canonicalField: { select: { id: true, name: true, displayName: true, dataType: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { items: fields, total: fields.length }
}

export async function create(workspaceId: string, interfaceId: string, body: CreateInterfaceFieldBody) {
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  // Validate canonical field belongs to workspace
  const canonicalField = await prisma.canonicalField.findFirst({
    where: { id: body.canonicalFieldId, workspaceId },
  })
  if (!canonicalField) throw new ValidationError([{ field: 'canonicalFieldId', message: 'Canonical field not found in this workspace' }])

  // Check uniqueness per interface
  const existing = await prisma.interfaceField.findFirst({
    where: { interfaceId, canonicalFieldId: body.canonicalFieldId },
  })
  if (existing) throw new ConflictError('This canonical field is already added to this interface')

  return prisma.interfaceField.create({
    data: {
      interfaceId,
      canonicalFieldId: body.canonicalFieldId,
      status: body.status as any,
    },
    include: {
      canonicalField: { select: { id: true, name: true, displayName: true, dataType: true } },
    },
  })
}

export async function update(workspaceId: string, interfaceId: string, id: string, body: UpdateInterfaceFieldBody) {
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  const field = await prisma.interfaceField.findFirst({
    where: { id, interfaceId },
  })
  if (!field) throw new NotFoundError('Interface field')

  return prisma.interfaceField.update({
    where: { id },
    data: { status: body.status as any },
  })
}

export async function remove(workspaceId: string, interfaceId: string, id: string) {
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  const field = await prisma.interfaceField.findFirst({
    where: { id, interfaceId },
  })
  if (!field) throw new NotFoundError('Interface field')

  await prisma.interfaceField.delete({ where: { id } })
  return { success: true }
}
