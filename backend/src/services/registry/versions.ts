import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ConflictError } from '../../errors/index.js'

export interface CutVersionBody {
  label: string
  description?: string
  createdBy?: string
}

export async function list(workspaceId: string) {
  const versions = await prisma.modelVersion.findMany({
    where: { workspaceId },
    include: {
      snapshot: {
        select: { snapshot: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = versions.map((v) => {
    const snap = v.snapshot?.snapshot as any
    const fieldCount = snap?.canonicalFields?.length ?? 0
    return {
      id: v.id,
      workspaceId: v.workspaceId,
      label: v.label,
      description: v.description,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      fieldCount,
    }
  })

  return { items, total: items.length }
}

export async function getById(workspaceId: string, id: string) {
  const version = await prisma.modelVersion.findFirst({
    where: { id, workspaceId },
    include: {
      snapshot: true,
    },
  })
  if (!version) throw new NotFoundError('Model version')

  return {
    id: version.id,
    workspaceId: version.workspaceId,
    label: version.label,
    description: version.description,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    snapshot: version.snapshot?.snapshot ?? null,
  }
}

export async function getDiff(workspaceId: string, id: string) {
  const version = await prisma.modelVersion.findFirst({
    where: { id, workspaceId },
  })
  if (!version) throw new NotFoundError('Model version')

  const diff = await prisma.modelVersionDiff.findFirst({
    where: { versionId: id },
  })

  if (!diff) {
    return { added: [], removed: [], changed: [] }
  }

  return diff.diff as { added: any[]; removed: any[]; changed: any[] }
}

export async function cutVersion(workspaceId: string, body: CutVersionBody) {
  // Check label uniqueness
  const existing = await prisma.modelVersion.findFirst({
    where: { workspaceId, label: body.label },
  })
  if (existing) throw new ConflictError(`A version with label '${body.label}' already exists`)

  // Capture current canonical model snapshot
  const canonicalEntities = await prisma.canonicalEntity.findMany({
    where: { workspaceId },
  })
  const canonicalFields = await prisma.canonicalField.findMany({
    where: { workspaceId },
    include: {
      subfields: { orderBy: { position: 'asc' } },
      examples: true,
      enumValues: { orderBy: { position: 'asc' } },
    },
  })

  const snapshot = {
    canonicalEntities,
    canonicalFields: canonicalFields.map((f) => ({
      ...f,
      subfields: f.subfields,
      examples: f.examples,
      enumValues: f.enumValues,
    })),
  }

  // Get previous version for diff
  const previousVersion = await prisma.modelVersion.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: 'desc' },
    include: {
      snapshot: true,
    },
  })

  // Compute diff
  const diff = computeDiff(
    previousVersion?.snapshot?.snapshot as any,
    snapshot
  )

  // Create version, snapshot, and diff atomically
  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.modelVersion.create({
      data: {
        workspaceId,
        label: body.label,
        description: body.description ?? null,
        createdBy: body.createdBy ?? null,
      },
    })

    await tx.modelVersionSnapshot.create({
      data: {
        versionId: version.id,
        snapshot: snapshot as any,
      },
    })

    await tx.modelVersionDiff.create({
      data: {
        versionId: version.id,
        previousVersionId: previousVersion?.id ?? null,
        diff: diff as any,
      },
    })

    return version
  })

  return result
}

function computeDiff(
  previousSnapshot: { canonicalEntities: any[]; canonicalFields: any[] } | null | undefined,
  currentSnapshot: { canonicalEntities: any[]; canonicalFields: any[] }
) {
  const added: any[] = []
  const removed: any[] = []
  const changed: any[] = []

  if (!previousSnapshot) {
    // First version: everything is added
    for (const field of currentSnapshot.canonicalFields) {
      added.push({
        fieldId: field.id,
        name: field.name,
        entityId: field.entityId,
        dataType: field.dataType,
      })
    }
    return { added, removed, changed }
  }

  const prevFieldMap = new Map(previousSnapshot.canonicalFields.map((f: any) => [f.id, f]))
  const currFieldMap = new Map(currentSnapshot.canonicalFields.map((f: any) => [f.id, f]))

  // Find added fields
  for (const [id, field] of currFieldMap) {
    if (!prevFieldMap.has(id)) {
      added.push({
        fieldId: field.id,
        name: field.name,
        entityId: field.entityId,
        dataType: field.dataType,
      })
    }
  }

  // Find removed fields
  for (const [id, field] of prevFieldMap) {
    if (!currFieldMap.has(id)) {
      removed.push({
        fieldId: field.id,
        name: field.name,
        entityId: field.entityId,
        dataType: field.dataType,
      })
    }
  }

  // Find changed fields
  for (const [id, currField] of currFieldMap) {
    const prevField = prevFieldMap.get(id)
    if (!prevField) continue

    const changes: Record<string, { before: any; after: any }> = {}

    if (prevField.name !== currField.name) {
      changes.name = { before: prevField.name, after: currField.name }
    }
    if (prevField.dataType !== currField.dataType) {
      changes.dataType = { before: prevField.dataType, after: currField.dataType }
    }
    if (prevField.displayName !== currField.displayName) {
      changes.displayName = { before: prevField.displayName, after: currField.displayName }
    }
    if (prevField.nullable !== currField.nullable) {
      changes.nullable = { before: prevField.nullable, after: currField.nullable }
    }
    if (prevField.description !== currField.description) {
      changes.description = { before: prevField.description, after: currField.description }
    }

    if (Object.keys(changes).length > 0) {
      changed.push({
        fieldId: currField.id,
        name: currField.name,
        entityId: currField.entityId,
        changes,
      })
    }
  }

  return { added, removed, changed }
}
