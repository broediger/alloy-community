import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface JsonSchemaExportBody {
  scope: 'entity' | 'interface'
  scopeId: string
  format: 'json'
  versionId?: string
  interfaceVersionId?: string
}

function dataTypeToJsonSchema(dataType: string): { type: string; format?: string } {
  switch (dataType) {
    case 'STRING':
      return { type: 'string' }
    case 'INTEGER':
      return { type: 'integer' }
    case 'DECIMAL':
      return { type: 'number' }
    case 'BOOLEAN':
      return { type: 'boolean' }
    case 'DATE':
      return { type: 'string', format: 'date' }
    case 'DATETIME':
      return { type: 'string', format: 'date-time' }
    case 'ENUM':
      return { type: 'string' }
    case 'OBJECT':
      return { type: 'object' }
    case 'ARRAY':
      return { type: 'array' }
    default:
      return { type: 'string' }
  }
}

interface EntityResolver {
  entityNameById: Map<string, string>
  fieldsByEntityId: Map<string, any[]>
  definitions: Record<string, any>
  visiting: Set<string>
}

function buildEntityDefinition(entityId: string, resolver: EntityResolver): void {
  const name = resolver.entityNameById.get(entityId)
  if (!name || resolver.definitions[name] || resolver.visiting.has(entityId)) return
  resolver.visiting.add(entityId)

  const fields = resolver.fieldsByEntityId.get(entityId) ?? []
  const props: Record<string, any> = {}
  const required: string[] = []
  for (const f of fields) {
    props[f.name] = buildFieldSchema(f, resolver)
    if (!f.nullable) required.push(f.name)
  }
  resolver.definitions[name] = {
    type: 'object',
    properties: props,
    ...(required.length > 0 ? { required } : {}),
  }
  resolver.visiting.delete(entityId)
}

function buildFieldSchema(field: any, resolver?: EntityResolver): any {
  // Entity reference
  if (field.referencedEntityId && resolver) {
    const refName = resolver.entityNameById.get(field.referencedEntityId)
    if (refName) {
      // Ensure the referenced entity is materialized in definitions
      buildEntityDefinition(field.referencedEntityId, resolver)
      const refSchema = { $ref: `#/definitions/${refName}` }
      if (field.cardinality === 'MANY') {
        return { type: 'array', items: refSchema }
      }
      return refSchema
    }
  }

  // Primitive array
  if (field.dataType === 'ARRAY' && field.itemsDataType) {
    const items = dataTypeToJsonSchema(field.itemsDataType)
    return {
      type: 'array',
      items: { type: items.type, ...(items.format ? { format: items.format } : {}) },
    }
  }

  const { type, format } = dataTypeToJsonSchema(field.dataType)
  const prop: any = { type }

  if (format) prop.format = format
  if (field.description) prop.description = field.description

  // Handle composite
  if (field.isComposite && field.subfields && field.subfields.length > 0) {
    const subProps: Record<string, any> = {}
    for (const sub of field.subfields) {
      const subType = dataTypeToJsonSchema(sub.dataType)
      subProps[sub.name] = {
        type: subType.type,
        ...(subType.format ? { format: subType.format } : {}),
      }
    }
    const objectSchema = { type: 'object', properties: subProps }
    // Composite array
    if (field.cardinality === 'MANY') {
      return { type: 'array', items: objectSchema }
    }
    return objectSchema
  }

  // Handle enum
  if (field.dataType === 'ENUM' && field.enumValues && field.enumValues.length > 0) {
    prop.enum = field.enumValues.map((ev: any) => ev.code)
  }

  // Handle examples
  if (field.examples && field.examples.length > 0) {
    prop.examples = field.examples.map((ex: any) => ex.value)
  }

  return prop
}

export async function generate(workspaceId: string, body: JsonSchemaExportBody): Promise<{ content: string; contentType: string; filename: string }> {
  let fields: any[]
  let schemaTitle: string

  if (body.interfaceVersionId && body.scope === 'interface') {
    // Generate from a frozen interface version snapshot
    const interfaceVersion = await prisma.interfaceVersionSnapshot.findFirst({
      where: {
        version: { id: body.interfaceVersionId, workspaceId },
      },
      include: { version: true },
    })
    if (!interfaceVersion) throw new NotFoundError('Interface version')

    const snapshot = interfaceVersion.snapshot as any
    schemaTitle = snapshot.metadata?.name ?? 'Interface'

    // Build fields from the snapshot's denormalized field data
    fields = snapshot.fields
      ?.filter((f: any) => f.status !== 'EXCLUDED')
      .map((f: any) => ({
        name: f.canonicalFieldName ?? f.name,
        dataType: f.canonicalFieldDataType ?? f.dataType ?? 'STRING',
        description: f.description,
        nullable: f.nullable,
      })) ?? []
  } else if (body.versionId) {
    const version = await prisma.modelVersion.findFirst({
      where: { id: body.versionId, workspaceId },
      include: { snapshot: true },
    })
    if (!version) throw new NotFoundError('Model version')
    if (!version.snapshot) throw new ValidationError([{ field: 'versionId', message: 'Version has no snapshot' }])

    const snapshot = version.snapshot.snapshot as any

    if (body.scope === 'entity') {
      const entity = snapshot.canonicalEntities?.find((e: any) => e.id === body.scopeId)
      if (!entity) throw new NotFoundError('Canonical entity')
      schemaTitle = entity.name
      fields = snapshot.canonicalFields?.filter((f: any) => f.entityId === body.scopeId) ?? []
    } else {
      // Interface scope from snapshot — use live interface to determine which fields
      const iface = await prisma.interface.findFirst({
        where: { id: body.scopeId, workspaceId },
        include: { fields: true },
      })
      if (!iface) throw new NotFoundError('Interface')
      schemaTitle = iface.name
      const fieldIds = new Set(iface.fields.map((f) => f.canonicalFieldId))
      fields = snapshot.canonicalFields?.filter((f: any) => fieldIds.has(f.id)) ?? []
    }
  } else {
    if (body.scope === 'entity') {
      const entity = await prisma.canonicalEntity.findFirst({
        where: { id: body.scopeId, workspaceId },
      })
      if (!entity) throw new NotFoundError('Canonical entity')
      schemaTitle = entity.name

      fields = await prisma.canonicalField.findMany({
        where: { entityId: body.scopeId, workspaceId },
        include: {
          subfields: { orderBy: { position: 'asc' } },
          examples: true,
          enumValues: { orderBy: { position: 'asc' } },
        },
      })
    } else {
      const iface = await prisma.interface.findFirst({
        where: { id: body.scopeId, workspaceId },
        include: {
          fields: {
            include: {
              canonicalField: {
                include: {
                  subfields: { orderBy: { position: 'asc' } },
                  examples: true,
                  enumValues: { orderBy: { position: 'asc' } },
                },
              },
            },
          },
        },
      })
      if (!iface) throw new NotFoundError('Interface')
      schemaTitle = iface.name
      fields = iface.fields.map((f) => f.canonicalField)
    }
  }

  // Build resolver for entity references (only when working from live data)
  let resolver: EntityResolver | undefined
  if (!body.versionId && !body.interfaceVersionId) {
    const allEntities = await prisma.canonicalEntity.findMany({ where: { workspaceId } })
    const allFields = await prisma.canonicalField.findMany({
      where: { workspaceId },
      include: {
        subfields: { orderBy: { position: 'asc' } },
        examples: true,
        enumValues: { orderBy: { position: 'asc' } },
      },
    })
    const fieldsByEntityId = new Map<string, any[]>()
    for (const f of allFields) {
      if (!fieldsByEntityId.has(f.entityId)) fieldsByEntityId.set(f.entityId, [])
      fieldsByEntityId.get(f.entityId)!.push(f)
    }
    resolver = {
      entityNameById: new Map(allEntities.map((e) => [e.id, e.name])),
      fieldsByEntityId,
      definitions: {},
      visiting: new Set(),
    }
  }

  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const field of fields) {
    properties[field.name] = buildFieldSchema(field, resolver)
    if (!field.nullable) {
      required.push(field.name)
    }
  }

  const schema: any = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: schemaTitle,
    ...(resolver && Object.keys(resolver.definitions).length > 0 ? { definitions: resolver.definitions } : {}),
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }

  const content = JSON.stringify(schema, null, 2)
  const filename = `${schemaTitle.toLowerCase().replace(/\s+/g, '-')}-schema.json`

  return { content, contentType: 'application/json', filename }
}
