import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'

export interface CreateInterfaceFieldBody {
  canonicalFieldId?: string
  name?: string
  displayName?: string
  dataType?: string
  description?: string
  nullable?: boolean
  maxLength?: number
  status: string
}

export interface UpdateInterfaceFieldBody {
  status?: string
  name?: string
  displayName?: string
  dataType?: string
  description?: string
  nullable?: boolean
  maxLength?: number | null
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

  const isLinked = !!body.canonicalFieldId

  if (isLinked) {
    // Linked field: validate canonical field belongs to workspace
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
        maxLength: body.maxLength ?? null,
        status: body.status as any,
      },
      include: {
        canonicalField: { select: { id: true, name: true, displayName: true, dataType: true } },
      },
    })
  }

  // Unlinked field: validate required metadata
  if (!body.name) {
    throw new ValidationError([{ field: 'name', message: 'Required for unlinked fields' }])
  }
  if (!body.dataType) {
    throw new ValidationError([{ field: 'dataType', message: 'Required for unlinked fields' }])
  }

  // Check name uniqueness among unlinked fields on this interface
  const existing = await prisma.interfaceField.findFirst({
    where: { interfaceId, canonicalFieldId: null, name: body.name },
  })
  if (existing) throw new ConflictError(`Unlinked field '${body.name}' already exists on this interface`)

  return prisma.interfaceField.create({
    data: {
      interfaceId,
      canonicalFieldId: null,
      name: body.name,
      displayName: body.displayName ?? null,
      dataType: body.dataType,
      description: body.description ?? null,
      nullable: body.nullable ?? true,
      maxLength: body.maxLength ?? null,
      status: body.status as any,
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

  const data: any = {}

  if (body.status !== undefined) data.status = body.status
  if (body.maxLength !== undefined) data.maxLength = body.maxLength

  // Only allow metadata updates on unlinked fields
  if (body.name !== undefined || body.displayName !== undefined || body.dataType !== undefined || body.description !== undefined || body.nullable !== undefined) {
    if (field.canonicalFieldId) {
      throw new ValidationError([{ field: 'name', message: 'Cannot update metadata on a linked canonical field' }])
    }
    if (body.name !== undefined) data.name = body.name
    if (body.displayName !== undefined) data.displayName = body.displayName
    if (body.dataType !== undefined) data.dataType = body.dataType
    if (body.description !== undefined) data.description = body.description
    if (body.nullable !== undefined) data.nullable = body.nullable
  }

  return prisma.interfaceField.update({
    where: { id },
    data,
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
