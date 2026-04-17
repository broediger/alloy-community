import Fastify from 'fastify'
import multipart from '@fastify/multipart'
import { schemaErrorFormatter } from './plugins/schema-error-formatter.js'
import { registerErrorHandler } from './plugins/error-handler.js'
import { registerWorkspaceMiddleware } from './middleware/workspace.js'
import { healthRoutes } from './routes/health.js'
import { workspaceRoutes } from './routes/workspaces.js'
import { canonicalEntityRoutes } from './routes/canonical-entities.js'
import { canonicalFieldRoutes } from './routes/canonical-fields.js'
import { systemRoutes } from './routes/systems.js'
import { systemFieldRoutes } from './routes/system-fields.js'
import { mappingRoutes } from './routes/mappings.js'
import { propagationChainRoutes } from './routes/propagation-chains.js'
import { interfaceRoutes } from './routes/interfaces.js'
import { traceRoutes } from './routes/trace.js'
import { exportRoutes } from './routes/export.js'
import { importRoutes } from './routes/import.js'
import { versionRoutes } from './routes/versions.js'

export function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
    },
    schemaErrorFormatter,
  })

  registerErrorHandler(app)
  app.register(multipart)

  // Health check — outside /api/v1/ prefix
  app.register(healthRoutes)

  // API v1 routes
  app.register(
    async function apiV1(api) {
      registerWorkspaceMiddleware(api)

      api.register(workspaceRoutes, { prefix: '/workspaces' })
      api.register(canonicalEntityRoutes, { prefix: '/workspaces/:workspaceId/canonical-entities' })
      api.register(canonicalFieldRoutes, { prefix: '/workspaces/:workspaceId/canonical-fields' })
      api.register(systemRoutes, { prefix: '/workspaces/:workspaceId/systems' })
      api.register(systemFieldRoutes, { prefix: '/workspaces/:workspaceId/system-fields' })
      api.register(mappingRoutes, { prefix: '/workspaces/:workspaceId/mappings' })
      api.register(propagationChainRoutes, { prefix: '/workspaces/:workspaceId/propagation-chains' })
      api.register(interfaceRoutes, { prefix: '/workspaces/:workspaceId/interfaces' })
      api.register(traceRoutes, { prefix: '/workspaces/:workspaceId/trace' })
      api.register(exportRoutes, { prefix: '/workspaces/:workspaceId/export' })
      api.register(importRoutes, { prefix: '/workspaces/:workspaceId/import' })
      api.register(versionRoutes, { prefix: '/workspaces/:workspaceId/versions' })
    },
    { prefix: '/api/v1' }
  )

  return app
}
