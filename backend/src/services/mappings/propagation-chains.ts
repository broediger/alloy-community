import { Prisma, PropagationStepType } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface CreateChainBody {
  canonicalFieldId: string
  systemId: string
  name: string
  description?: string
}

export interface UpdateChainBody {
  name?: string
  description?: string
}

export interface ChainFilters {
  canonicalFieldId?: string
  systemId?: string
}

export interface CreateStepBody {
  systemFieldId: string
  stepType: string
  notes?: string
}

export interface UpdateStepBody {
  stepType?: string
  notes?: string
}

export async function list(workspaceId: string, filters: ChainFilters) {
  const where: Prisma.PropagationChainWhereInput = { workspaceId }
  if (filters.canonicalFieldId) where.canonicalFieldId = filters.canonicalFieldId
  if (filters.systemId) where.systemId = filters.systemId

  const chains = await prisma.propagationChain.findMany({
    where,
    include: {
      canonicalField: { select: { id: true, name: true } },
      system: { select: { id: true, name: true } },
      _count: { select: { steps: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return { items: chains, total: chains.length }
}

export async function getById(workspaceId: string, id: string) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id, workspaceId },
    include: {
      canonicalField: { select: { id: true, name: true } },
      system: { select: { id: true, name: true } },
      steps: {
        orderBy: { position: 'asc' },
        include: {
          systemField: {
            select: {
              id: true,
              name: true,
              entity: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  })
  if (!chain) throw new NotFoundError('Propagation chain')
  return chain
}

export async function create(workspaceId: string, body: CreateChainBody) {
  const canonicalField = await prisma.canonicalField.findFirst({
    where: { id: body.canonicalFieldId, workspaceId },
  })
  if (!canonicalField) throw new ValidationError([{ field: 'canonicalFieldId', message: 'Canonical field not found in this workspace' }])

  const system = await prisma.system.findFirst({
    where: { id: body.systemId, workspaceId },
  })
  if (!system) throw new ValidationError([{ field: 'systemId', message: 'System not found in this workspace' }])

  return prisma.propagationChain.create({
    data: {
      workspaceId,
      canonicalFieldId: body.canonicalFieldId,
      systemId: body.systemId,
      name: body.name,
      description: body.description ?? null,
    },
  })
}

export async function update(workspaceId: string, id: string, body: UpdateChainBody) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  const data: Prisma.PropagationChainUpdateInput = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description

  return prisma.propagationChain.update({
    where: { id },
    data,
  })
}

export async function remove(workspaceId: string, id: string) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  await prisma.propagationChain.delete({ where: { id } })
  return { success: true }
}

// Steps
export async function createStep(workspaceId: string, chainId: string, body: CreateStepBody) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id: chainId, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  // Validate system field belongs to chain's system
  const systemField = await prisma.systemField.findFirst({
    where: { id: body.systemFieldId, workspaceId },
    include: { entity: { select: { systemId: true } } },
  })
  if (!systemField) throw new ValidationError([{ field: 'systemFieldId', message: 'System field not found in this workspace' }])
  if (systemField.entity.systemId !== chain.systemId) {
    throw new ValidationError([{ field: 'systemFieldId', message: 'System field does not belong to the chain\'s system' }])
  }

  const maxPosition = await prisma.propagationChainStep.aggregate({
    where: { chainId },
    _max: { position: true },
  })
  const nextPosition = (maxPosition._max.position ?? -1) + 1

  if (!isPropagationStepType(body.stepType)) {
    throw new ValidationError([
      { field: 'stepType', message: `Invalid stepType '${body.stepType}'` },
    ])
  }

  return prisma.propagationChainStep.create({
    data: {
      chainId,
      systemFieldId: body.systemFieldId,
      position: nextPosition,
      stepType: body.stepType,
      notes: body.notes ?? null,
    },
    include: {
      systemField: {
        select: {
          id: true,
          name: true,
          entity: { select: { id: true, name: true } },
        },
      },
    },
  })
}

export async function updateStep(workspaceId: string, chainId: string, stepId: string, body: UpdateStepBody) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id: chainId, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  const step = await prisma.propagationChainStep.findFirst({
    where: { id: stepId, chainId },
  })
  if (!step) throw new NotFoundError('Propagation chain step')

  const data: Prisma.PropagationChainStepUpdateInput = {}
  if (body.stepType !== undefined) {
    if (!isPropagationStepType(body.stepType)) {
      throw new ValidationError([
        { field: 'stepType', message: `Invalid stepType '${body.stepType}'` },
      ])
    }
    data.stepType = body.stepType
  }
  if (body.notes !== undefined) data.notes = body.notes

  return prisma.propagationChainStep.update({
    where: { id: stepId },
    data,
  })
}

function isPropagationStepType(value: string): value is PropagationStepType {
  return value in PropagationStepType
}

export async function removeStep(workspaceId: string, chainId: string, stepId: string) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id: chainId, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  const step = await prisma.propagationChainStep.findFirst({
    where: { id: stepId, chainId },
  })
  if (!step) throw new NotFoundError('Propagation chain step')

  await prisma.propagationChainStep.delete({ where: { id: stepId } })
  return { success: true }
}

export async function reorderSteps(workspaceId: string, chainId: string, ids: string[]) {
  const chain = await prisma.propagationChain.findFirst({
    where: { id: chainId, workspaceId },
  })
  if (!chain) throw new NotFoundError('Propagation chain')

  const existing = await prisma.propagationChainStep.findMany({
    where: { chainId },
    select: { id: true },
  })

  const existingIds = new Set(existing.map((s) => s.id))
  const providedIds = new Set(ids)

  if (existingIds.size !== providedIds.size || ![...existingIds].every((id) => providedIds.has(id))) {
    throw new ValidationError([
      { field: 'ids', message: 'Provided IDs do not match the step set for this chain' },
    ])
  }

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.propagationChainStep.update({
        where: { id },
        data: { position: index },
      })
    )
  )

  return prisma.propagationChainStep.findMany({
    where: { chainId },
    orderBy: { position: 'asc' },
    include: {
      systemField: {
        select: {
          id: true,
          name: true,
          entity: { select: { id: true, name: true } },
        },
      },
    },
  })
}
