import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'
import { OpenApiBuilder, SchemaObject } from 'openapi3-ts/oas30'
import * as yaml from 'js-yaml'

export interface OpenApiExportBody {
  systemId: string
  format: 'yaml' | 'json'
  includeEntityIds?: string[]
  versionId?: string
}

function dataTypeToOpenApi(dataType: string): { type: string; format?: string } {
  switch (dataType) {
    case 'STRING':
      return { type: 'string' }
    case 'INTEGER':
      return { type: 'integer' }
    case 'DECIMAL':
      return { type: 'number', format: 'double' }
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

export async function generate(workspaceId: string, body: OpenApiExportBody): Promise<{ content: string; contentType: string; filename: string }> {
  const system = await prisma.system.findFirst({
    where: { id: body.systemId, workspaceId },
  })
  if (!system) throw new NotFoundError('System')

  let canonicalEntities: any[]
  let canonicalFields: any[]

  if (body.versionId) {
    // Load from snapshot
    const version = await prisma.modelVersion.findFirst({
      where: { id: body.versionId, workspaceId },
      include: { snapshot: true },
    })
    if (!version) throw new NotFoundError('Model version')
    if (!version.snapshot) throw new ValidationError([{ field: 'versionId', message: 'Version has no snapshot' }])

    const snapshot = version.snapshot.snapshot as any
    canonicalEntities = snapshot.canonicalEntities
    canonicalFields = snapshot.canonicalFields
  } else {
    canonicalEntities = await prisma.canonicalEntity.findMany({
      where: { workspaceId },
    })
    canonicalFields = await prisma.canonicalField.findMany({
      where: { workspaceId },
      include: {
        subfields: { orderBy: { position: 'asc' } },
        examples: true,
        enumValues: { orderBy: { position: 'asc' } },
      },
    })
  }

  // Filter entities if specified
  if (body.includeEntityIds && body.includeEntityIds.length > 0) {
    const entityIdSet = new Set(body.includeEntityIds)
    canonicalEntities = canonicalEntities.filter((e: any) => entityIdSet.has(e.id))
    canonicalFields = canonicalFields.filter((f: any) => entityIdSet.has(f.entityId))
  }

  const builder = OpenApiBuilder.create()
    .addInfo({
      title: `${system.name} API`,
      version: '1.0.0',
      description: system.description ?? undefined,
    })
    .addServer({ url: system.baseUrl ?? 'http://localhost' })

  // Group fields by entity
  const fieldsByEntity = new Map<string, any[]>()
  for (const field of canonicalFields) {
    const entityId = field.entityId
    if (!fieldsByEntity.has(entityId)) fieldsByEntity.set(entityId, [])
    fieldsByEntity.get(entityId)!.push(field)
  }

  // Create schemas for each entity
  for (const entity of canonicalEntities) {
    const entityFields = fieldsByEntity.get(entity.id) ?? []
    const properties: Record<string, SchemaObject> = {}
    const requiredFields: string[] = []

    for (const field of entityFields) {
      const { type, format } = dataTypeToOpenApi(field.dataType)
      const prop: SchemaObject = { type } as SchemaObject

      if (format) prop.format = format
      if (field.nullable) (prop as any).nullable = true
      if (field.description) prop.description = field.description

      // Handle composite fields
      if (field.isComposite && field.subfields && field.subfields.length > 0) {
        prop.type = 'object'
        prop.properties = {}
        for (const sub of field.subfields) {
          const subType = dataTypeToOpenApi(sub.dataType)
          prop.properties[sub.name] = {
            type: subType.type,
            ...(subType.format ? { format: subType.format } : {}),
            ...(sub.nullable ? { nullable: true } : {}),
          } as SchemaObject
        }
      }

      // Handle enum fields
      if (field.dataType === 'ENUM' && field.enumValues && field.enumValues.length > 0) {
        prop.enum = field.enumValues.map((ev: any) => ev.code)
      }

      // Handle examples
      if (field.examples && field.examples.length > 0) {
        prop.example = field.examples[0].value
      }

      if (!field.nullable) {
        requiredFields.push(field.name)
      }

      properties[field.name] = prop
    }

    const schema: SchemaObject = {
      type: 'object',
      properties,
      ...(requiredFields.length > 0 ? { required: requiredFields } : {}),
    }

    builder.addSchema(entity.name, schema)
  }

  const spec = builder.getSpec()
  let content: string
  let contentType: string
  let filename: string

  if (body.format === 'yaml') {
    content = yaml.dump(spec)
    contentType = 'application/x-yaml'
    filename = `${system.name.toLowerCase().replace(/\s+/g, '-')}-openapi.yaml`
  } else {
    content = JSON.stringify(spec, null, 2)
    contentType = 'application/json'
    filename = `${system.name.toLowerCase().replace(/\s+/g, '-')}-openapi.json`
  }

  return { content, contentType, filename }
}
