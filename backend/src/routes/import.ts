import { FastifyInstance } from 'fastify'
import * as excelImport from '../services/export/excel-import.js'

export async function importRoutes(app: FastifyInstance) {
  app.post('/interface-excel/:interfaceId', async (request, reply) => {
    const { workspaceId, interfaceId } = request.params as { workspaceId: string; interfaceId: string }

    const data = await request.file()
    if (!data) {
      reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' } })
      return
    }

    const filename = data.filename ?? ''
    if (!filename.endsWith('.xlsx')) {
      reply.status(400).send({ error: { code: 'VALIDATION_ERROR', message: 'File must be .xlsx format' } })
      return
    }

    const buffer = await data.toBuffer()
    const result = await excelImport.importInterfaceExcel(workspaceId, interfaceId, buffer)
    return result
  })
}
