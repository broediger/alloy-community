import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ConflictError, ValidationError } from '../../errors/index.js'

export interface CutInterfaceVersionBody {
  label: string
  description?: string
  createdBy?: string
}

export interface UpdateInterfaceVersionStatusBody {
  status: 'PUBLISHED' | 'DEPRECATED'
}

export async function list(workspaceId: string, interfaceId: string) {
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  const versions = await prisma.interfaceVersion.findMany({
    where: { interfaceId, workspaceId },
    include: {
      snapshot: {
        select: { snapshot: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const items = versions.map((v) => {
    const snap = v.snapshot?.snapshot as any
    const fieldCount = snap?.fields?.length ?? 0
    return {
      id: v.id,
      workspaceId: v.workspaceId,
      interfaceId: v.interfaceId,
      label: v.label,
      description: v.description,
      status: v.status,
      createdAt: v.createdAt,
      createdBy: v.createdBy,
      fieldCount,
    }
  })

  return { items, total: items.length }
}

export async function getById(workspaceId: string, interfaceId: string, versionId: string) {
  const version = await prisma.interfaceVersion.findFirst({
    where: { id: versionId, interfaceId, workspaceId },
    include: {
      snapshot: true,
    },
  })
  if (!version) throw new NotFoundError('Interface version')

  return {
    id: version.id,
    workspaceId: version.workspaceId,
    interfaceId: version.interfaceId,
    label: version.label,
    description: version.description,
    status: version.status,
    createdAt: version.createdAt,
    createdBy: version.createdBy,
    snapshot: version.snapshot?.snapshot ?? null,
  }
}

export async function getDiff(workspaceId: string, interfaceId: string, versionId: string) {
  const version = await prisma.interfaceVersion.findFirst({
    where: { id: versionId, interfaceId, workspaceId },
  })
  if (!version) throw new NotFoundError('Interface version')

  const diff = await prisma.interfaceVersionDiff.findFirst({
    where: { versionId },
  })

  if (!diff) {
    return {
      fields: { added: [], removed: [], changed: [] },
      entityBindings: { added: [], removed: [] },
      metadata: {},
    }
  }

  return diff.diff as {
    fields: { added: any[]; removed: any[]; changed: any[] }
    entityBindings: { added: any[]; removed: any[] }
    metadata: Record<string, { before: any; after: any }>
  }
}

export async function cutVersion(workspaceId: string, interfaceId: string, body: CutInterfaceVersionBody) {
  // Verify interface exists
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
    include: {
      sourceSystem: { select: { id: true, name: true } },
      targetSystem: { select: { id: true, name: true } },
      entityBindings: {
        include: {
          entity: { select: { id: true, name: true, slug: true } },
        },
      },
      fields: {
        include: {
          canonicalField: {
            select: { id: true, name: true, displayName: true, dataType: true },
          },
        },
      },
    },
  })
  if (!iface) throw new NotFoundError('Interface')

  // Check label uniqueness
  const existing = await prisma.interfaceVersion.findFirst({
    where: { interfaceId, label: body.label },
  })
  if (existing) throw new ConflictError(`A version with label '${body.label}' already exists for this interface`)

  // Block if latest version is still DRAFT
  const latestVersion = await prisma.interfaceVersion.findFirst({
    where: { interfaceId, workspaceId },
    orderBy: { createdAt: 'desc' },
    include: { snapshot: true },
  })
  if (latestVersion && latestVersion.status === 'DRAFT') {
    throw new ConflictError('Publish or deprecate the current draft before cutting a new version')
  }

  // Build snapshot
  const snapshot = {
    metadata: {
      name: iface.name,
      description: iface.description,
      direction: iface.direction,
      sourceSystemId: iface.sourceSystemId,
      sourceSystemName: iface.sourceSystem.name,
      targetSystemId: iface.targetSystemId,
      targetSystemName: iface.targetSystem.name,
    },
    entityBindings: iface.entityBindings.map((b) => ({
      id: b.id,
      entityId: b.entityId,
      entityName: b.entity.name,
      entitySlug: b.entity.slug,
      side: b.side,
    })),
    fields: iface.fields.map((f) => ({
      id: f.id,
      canonicalFieldId: f.canonicalFieldId,
      canonicalFieldName: f.canonicalField?.name ?? null,
      canonicalFieldDisplayName: f.canonicalField?.displayName ?? null,
      canonicalFieldDataType: f.canonicalField?.dataType ?? null,
      name: f.name,
      displayName: f.displayName,
      dataType: f.dataType,
      description: f.description,
      nullable: f.nullable,
      status: f.status,
    })),
  }

  // Compute diff
  const diff = computeDiff(
    latestVersion?.snapshot?.snapshot as any,
    snapshot
  )

  // Create version, snapshot, and diff atomically
  const result = await prisma.$transaction(async (tx) => {
    const version = await tx.interfaceVersion.create({
      data: {
        workspaceId,
        interfaceId,
        label: body.label,
        description: body.description ?? null,
        status: 'DRAFT',
        createdBy: body.createdBy ?? null,
      },
    })

    await tx.interfaceVersionSnapshot.create({
      data: {
        versionId: version.id,
        snapshot: snapshot as any,
      },
    })

    await tx.interfaceVersionDiff.create({
      data: {
        versionId: version.id,
        previousVersionId: latestVersion?.id ?? null,
        diff: diff as any,
      },
    })

    return version
  })

  return result
}

export async function updateStatus(
  workspaceId: string,
  interfaceId: string,
  versionId: string,
  body: UpdateInterfaceVersionStatusBody
) {
  const version = await prisma.interfaceVersion.findFirst({
    where: { id: versionId, interfaceId, workspaceId },
  })
  if (!version) throw new NotFoundError('Interface version')

  // Validate transition rules
  const { status: currentStatus } = version
  const { status: targetStatus } = body

  if (currentStatus === 'DRAFT' && targetStatus !== 'PUBLISHED') {
    throw new ValidationError([
      { field: 'status', message: 'Draft versions can only be published' },
    ])
  }
  if (currentStatus === 'PUBLISHED' && targetStatus !== 'DEPRECATED') {
    throw new ValidationError([
      { field: 'status', message: 'Published versions can only be deprecated' },
    ])
  }
  if (currentStatus === 'DEPRECATED') {
    throw new ValidationError([
      { field: 'status', message: 'Deprecated versions cannot change status' },
    ])
  }

  const updated = await prisma.interfaceVersion.update({
    where: { id: versionId },
    data: { status: targetStatus },
  })

  return updated
}

// ─── Diff computation ────────────────────────────────────

interface SnapshotShape {
  metadata: {
    name: string
    description: string | null
    direction: string
    sourceSystemId: string
    sourceSystemName: string
    targetSystemId: string
    targetSystemName: string
  }
  entityBindings: Array<{
    id: string
    entityId: string
    entityName: string
    entitySlug: string
    side: string
  }>
  fields: Array<{
    id: string
    canonicalFieldId: string | null
    canonicalFieldName: string | null
    canonicalFieldDisplayName: string | null
    canonicalFieldDataType: string | null
    name: string | null
    displayName: string | null
    dataType: string | null
    description: string | null
    nullable: boolean
    status: string
  }>
}

function computeDiff(
  previousSnapshot: SnapshotShape | null | undefined,
  currentSnapshot: SnapshotShape
) {
  const fields: { added: any[]; removed: any[]; changed: any[] } = {
    added: [],
    removed: [],
    changed: [],
  }
  const entityBindings: { added: any[]; removed: any[] } = {
    added: [],
    removed: [],
  }
  const metadata: Record<string, { before: any; after: any }> = {}

  if (!previousSnapshot) {
    // First version: everything is added
    for (const field of currentSnapshot.fields) {
      fields.added.push({
        fieldId: field.id,
        name: field.canonicalFieldName ?? field.name,
        status: field.status,
        canonicalFieldId: field.canonicalFieldId,
      })
    }
    for (const binding of currentSnapshot.entityBindings) {
      entityBindings.added.push({
        entityId: binding.entityId,
        entityName: binding.entityName,
        side: binding.side,
      })
    }
    return { fields, entityBindings, metadata }
  }

  // --- Field diff ---
  const prevFieldMap = new Map(previousSnapshot.fields.map((f) => [f.id, f]))
  const currFieldMap = new Map(currentSnapshot.fields.map((f) => [f.id, f]))

  for (const [id, field] of currFieldMap) {
    if (!prevFieldMap.has(id)) {
      fields.added.push({
        fieldId: field.id,
        name: field.canonicalFieldName ?? field.name,
        status: field.status,
        canonicalFieldId: field.canonicalFieldId,
      })
    }
  }

  for (const [id, field] of prevFieldMap) {
    if (!currFieldMap.has(id)) {
      fields.removed.push({
        fieldId: field.id,
        name: field.canonicalFieldName ?? field.name,
        status: field.status,
        canonicalFieldId: field.canonicalFieldId,
      })
    }
  }

  for (const [id, currField] of currFieldMap) {
    const prevField = prevFieldMap.get(id)
    if (!prevField) continue

    const changes: Record<string, { before: any; after: any }> = {}
    const compareProps = ['status', 'name', 'displayName', 'dataType', 'description', 'nullable', 'canonicalFieldId'] as const

    for (const prop of compareProps) {
      if (prevField[prop] !== currField[prop]) {
        changes[prop] = { before: prevField[prop], after: currField[prop] }
      }
    }

    if (Object.keys(changes).length > 0) {
      fields.changed.push({
        fieldId: currField.id,
        name: currField.canonicalFieldName ?? currField.name,
        changes,
      })
    }
  }

  // --- Entity binding diff ---
  const bindingKey = (b: { entityId: string; side: string }) => `${b.entityId}:${b.side}`
  const prevBindingSet = new Set(previousSnapshot.entityBindings.map(bindingKey))
  const currBindingSet = new Set(currentSnapshot.entityBindings.map(bindingKey))

  for (const binding of currentSnapshot.entityBindings) {
    if (!prevBindingSet.has(bindingKey(binding))) {
      entityBindings.added.push({
        entityId: binding.entityId,
        entityName: binding.entityName,
        side: binding.side,
      })
    }
  }

  for (const binding of previousSnapshot.entityBindings) {
    if (!currBindingSet.has(bindingKey(binding))) {
      entityBindings.removed.push({
        entityId: binding.entityId,
        entityName: binding.entityName,
        side: binding.side,
      })
    }
  }

  // --- Metadata diff ---
  const metaProps = ['name', 'description', 'direction'] as const
  for (const prop of metaProps) {
    if (previousSnapshot.metadata[prop] !== currentSnapshot.metadata[prop]) {
      metadata[prop] = {
        before: previousSnapshot.metadata[prop],
        after: currentSnapshot.metadata[prop],
      }
    }
  }

  return { fields, entityBindings, metadata }
}
