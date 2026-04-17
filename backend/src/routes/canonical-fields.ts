import { FastifyInstance } from 'fastify'
import * as fieldService from '../services/registry/canonical-fields.js'
import * as subfieldService from '../services/registry/canonical-subfields.js'
import * as exampleService from '../services/registry/canonical-examples.js'
import * as enumService from '../services/registry/canonical-enum-values.js'

const createFieldSchema = {
  type: 'object',
  required: ['entityId', 'name', 'displayName', 'dataType'],
  properties: {
    entityId: { type: 'string' },
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
    minValue: { type: 'string' },
    maxValue: { type: 'string' },
    isComposite: { type: 'boolean' },
    compositionPattern: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    referencedEntityId: { type: 'string' },
    cardinality: { type: 'string', enum: ['ONE', 'MANY'] },
    itemsDataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
  },
  additionalProperties: false,
}

const updateFieldSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
    minValue: { type: 'string' },
    maxValue: { type: 'string' },
    isComposite: { type: 'boolean' },
    compositionPattern: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
    referencedEntityId: { type: ['string', 'null'] },
    cardinality: { type: ['string', 'null'], enum: ['ONE', 'MANY', null] },
    itemsDataType: { type: ['string', 'null'], enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY', null] },
  },
  additionalProperties: false,
}

const createSubfieldSchema = {
  type: 'object',
  required: ['name', 'displayName', 'dataType'],
  properties: {
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
  },
  additionalProperties: false,
}

const updateSubfieldSchema = {
  type: 'object',
  properties: {
    name: { type: 'string', minLength: 1 },
    displayName: { type: 'string', minLength: 1 },
    description: { type: 'string' },
    dataType: { type: 'string', enum: ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY'] },
    format: { type: 'string' },
    nullable: { type: 'boolean' },
  },
  additionalProperties: false,
}

const reorderSchema = {
  type: 'object',
  required: ['ids'],
  properties: {
    ids: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false,
}

const createExampleSchema = {
  type: 'object',
  required: ['value'],
  properties: {
    value: { type: 'string' },
  },
  additionalProperties: false,
}

const createEnumValueSchema = {
  type: 'object',
  required: ['code', 'label'],
  properties: {
    code: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
}

const updateEnumValueSchema = {
  type: 'object',
  properties: {
    code: { type: 'string', minLength: 1 },
    label: { type: 'string', minLength: 1 },
  },
  additionalProperties: false,
}

export async function canonicalFieldRoutes(app: FastifyInstance) {
  // Fields CRUD
  app.get('/', async (request) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const query = request.query as Record<string, string>
    return fieldService.list(workspaceId, {
      entityId: query.entityId,
      dataType: query.dataType,
      tags: query.tags,
      mapped: query.mapped,
      search: query.search,
    })
  })

  app.post('/', { schema: { body: createFieldSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await fieldService.create(workspaceId, request.body as fieldService.CreateCanonicalFieldBody)
    reply.status(201)
    return result
  })

  app.get('/:fId', async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    return fieldService.getById(workspaceId, fId)
  })

  app.patch('/:fId', { schema: { body: updateFieldSchema } }, async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    return fieldService.update(workspaceId, fId, request.body as fieldService.UpdateCanonicalFieldBody)
  })

  app.delete('/:fId', async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    return fieldService.remove(workspaceId, fId)
  })

  // Subfields
  app.get('/:fId/subfields', async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    return subfieldService.list(workspaceId, fId)
  })

  app.post('/:fId/subfields', { schema: { body: createSubfieldSchema } }, async (request, reply) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    const result = await subfieldService.create(workspaceId, fId, request.body as subfieldService.CreateSubfieldBody)
    reply.status(201)
    return result
  })

  app.patch('/:fId/subfields/:sfId', { schema: { body: updateSubfieldSchema } }, async (request) => {
    const { workspaceId, fId, sfId } = request.params as { workspaceId: string; fId: string; sfId: string }
    return subfieldService.update(workspaceId, fId, sfId, request.body as subfieldService.UpdateSubfieldBody)
  })

  app.delete('/:fId/subfields/:sfId', async (request) => {
    const { workspaceId, fId, sfId } = request.params as { workspaceId: string; fId: string; sfId: string }
    return subfieldService.remove(workspaceId, fId, sfId)
  })

  app.put('/:fId/subfields/reorder', { schema: { body: reorderSchema } }, async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    const { ids } = request.body as { ids: string[] }
    return subfieldService.reorder(workspaceId, fId, ids)
  })

  // Examples
  app.post('/:fId/examples', { schema: { body: createExampleSchema } }, async (request, reply) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    const result = await exampleService.create(workspaceId, fId, request.body as { value: string })
    reply.status(201)
    return result
  })

  app.delete('/:fId/examples/:exId', async (request) => {
    const { workspaceId, fId, exId } = request.params as { workspaceId: string; fId: string; exId: string }
    return exampleService.remove(workspaceId, fId, exId)
  })

  // Enum Values
  app.get('/:fId/enum-values', async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    return enumService.list(workspaceId, fId)
  })

  app.post('/:fId/enum-values', { schema: { body: createEnumValueSchema } }, async (request, reply) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    const result = await enumService.create(workspaceId, fId, request.body as { code: string; label: string })
    reply.status(201)
    return result
  })

  app.patch('/:fId/enum-values/:evId', { schema: { body: updateEnumValueSchema } }, async (request) => {
    const { workspaceId, fId, evId } = request.params as { workspaceId: string; fId: string; evId: string }
    return enumService.update(workspaceId, fId, evId, request.body as { code?: string; label?: string })
  })

  app.delete('/:fId/enum-values/:evId', async (request) => {
    const { workspaceId, fId, evId } = request.params as { workspaceId: string; fId: string; evId: string }
    return enumService.remove(workspaceId, fId, evId)
  })

  app.put('/:fId/enum-values/reorder', { schema: { body: reorderSchema } }, async (request) => {
    const { workspaceId, fId } = request.params as { workspaceId: string; fId: string }
    const { ids } = request.body as { ids: string[] }
    return enumService.reorder(workspaceId, fId, ids)
  })
}
