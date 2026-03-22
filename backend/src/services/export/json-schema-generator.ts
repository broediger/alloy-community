import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface JsonSchemaExportBody {
  scope: 'entity' | 'interface'
  scopeId: string
  format: 'json'
  versionId?: string
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

function buildFieldSchema(field: any): any {
  const { type, format } = dataTypeToJsonSchema(field.dataType)
  const prop: any = { type }

  if (format) prop.format = format
  if (field.description) prop.description = field.description

  // Handle composite
  if (field.isComposite && field.subfields && field.subfields.length > 0) {
    prop.type = 'object'
    prop.properties = {}
    for (const sub of field.subfields) {
      const subType = dataTypeToJsonSchema(sub.dataType)
      prop.properties[sub.name] = {
        type: subType.type,
        ...(subType.format ? { format: subType.format } : {}),
      }
    }
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

  if (body.versionId) {
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

  const properties: Record<string, any> = {}
  const required: string[] = []

  for (const field of fields) {
    properties[field.name] = buildFieldSchema(field)
    if (!field.nullable) {
      required.push(field.name)
    }
  }

  const schema: any = {
    $schema: 'http://json-schema.org/draft-07/schema#',
    title: schemaTitle,
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
  }

  const content = JSON.stringify(schema, null, 2)
  const filename = `${schemaTitle.toLowerCase().replace(/\s+/g, '-')}-schema.json`

  return { content, contentType: 'application/json', filename }
}
