import { FastifyInstance } from 'fastify'
import * as openapiGenerator from '../services/export/openapi-generator.js'
import * as jsonSchemaGenerator from '../services/export/json-schema-generator.js'
import * as workspaceExport from '../services/export/workspace-export.js'
import * as excelExport from '../services/export/excel-export.js'

const openApiSchema = {
  type: 'object',
  required: ['systemId', 'format'],
  properties: {
    systemId: { type: 'string' },
    format: { type: 'string', enum: ['yaml', 'json'] },
    includeEntityIds: { type: 'array', items: { type: 'string' } },
    versionId: { type: 'string' },
    interfaceVersionId: { type: 'string' },
  },
  additionalProperties: false,
}

const jsonSchemaBodySchema = {
  type: 'object',
  required: ['scope', 'scopeId', 'format'],
  properties: {
    scope: { type: 'string', enum: ['entity', 'interface'] },
    scopeId: { type: 'string' },
    format: { type: 'string', enum: ['json'] },
    versionId: { type: 'string' },
    interfaceVersionId: { type: 'string' },
  },
  additionalProperties: false,
}

export async function exportRoutes(app: FastifyInstance) {
  app.post('/openapi', { schema: { body: openApiSchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await openapiGenerator.generate(workspaceId, request.body as openapiGenerator.OpenApiExportBody)
    reply
      .header('Content-Type', result.contentType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content)
  })

  app.post('/json-schema', { schema: { body: jsonSchemaBodySchema } }, async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await jsonSchemaGenerator.generate(workspaceId, request.body as jsonSchemaGenerator.JsonSchemaExportBody)
    reply
      .header('Content-Type', result.contentType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content)
  })

  app.get('/interface-excel/:interfaceId', async (request, reply) => {
    const { workspaceId, interfaceId } = request.params as { workspaceId: string; interfaceId: string }
    const result = await excelExport.exportInterfaceExcel(workspaceId, interfaceId)
    reply
      .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.buffer)
  })

  app.get('/workspace', async (request, reply) => {
    const { workspaceId } = request.params as { workspaceId: string }
    const result = await workspaceExport.exportWorkspace(workspaceId)
    reply
      .header('Content-Type', result.contentType)
      .header('Content-Disposition', `attachment; filename="${result.filename}"`)
      .send(result.content)
  })
}
