import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/index.js'

export async function create(workspaceId: string, canonicalFieldId: string, body: { value: string }) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  return prisma.canonicalFieldExample.create({
    data: {
      canonicalFieldId,
      value: body.value,
    },
  })
}

export async function remove(workspaceId: string, canonicalFieldId: string, id: string) {
  const field = await prisma.canonicalField.findFirst({
    where: { id: canonicalFieldId, workspaceId },
  })
  if (!field) throw new NotFoundError('Canonical field')

  const example = await prisma.canonicalFieldExample.findFirst({
    where: { id, canonicalFieldId },
  })
  if (!example) throw new NotFoundError('Example')

  await prisma.canonicalFieldExample.delete({ where: { id } })
  return { success: true }
}
