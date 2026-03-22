import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/index.js'

export async function exportWorkspace(workspaceId: string) {
  const workspace = await prisma.workspace.findUnique({
    where: { id: workspaceId },
  })
  if (!workspace) throw new NotFoundError('Workspace')

  const [
    canonicalEntities,
    canonicalFields,
    canonicalSubfields,
    canonicalExamples,
    canonicalEnumValues,
    systems,
    systemEntities,
    systemFields,
    systemEntityRelationships,
    mappings,
    transformationRules,
    valueMapEntries,
    composeRuleFields,
    decomposeRuleFields,
    propagationChains,
    propagationChainSteps,
    interfaces,
    interfaceFields,
    modelVersions,
  ] = await Promise.all([
    prisma.canonicalEntity.findMany({ where: { workspaceId } }),
    prisma.canonicalField.findMany({ where: { workspaceId } }),
    prisma.canonicalSubfield.findMany({ where: { workspaceId } }),
    prisma.canonicalFieldExample.findMany({
      where: { canonicalField: { workspaceId } },
    }),
    prisma.canonicalEnumValue.findMany({
      where: { canonicalField: { workspaceId } },
    }),
    prisma.system.findMany({ where: { workspaceId } }),
    prisma.systemEntity.findMany({ where: { workspaceId } }),
    prisma.systemField.findMany({ where: { workspaceId } }),
    prisma.systemEntityRelationship.findMany({ where: { workspaceId } }),
    prisma.mapping.findMany({ where: { workspaceId } }),
    prisma.transformationRule.findMany({
      where: { mapping: { workspaceId } },
    }),
    prisma.valueMapEntry.findMany({
      where: { rule: { mapping: { workspaceId } } },
    }),
    prisma.composeRuleField.findMany({
      where: { rule: { mapping: { workspaceId } } },
    }),
    prisma.decomposeRuleField.findMany({
      where: { rule: { mapping: { workspaceId } } },
    }),
    prisma.propagationChain.findMany({ where: { workspaceId } }),
    prisma.propagationChainStep.findMany({
      where: { chain: { workspaceId } },
    }),
    prisma.interface.findMany({ where: { workspaceId } }),
    prisma.interfaceField.findMany({
      where: { interface: { workspaceId } },
    }),
    prisma.modelVersion.findMany({
      where: { workspaceId },
      include: { snapshot: true, diffs: true },
    }),
  ])

  const exportData = {
    workspace,
    canonicalEntities,
    canonicalFields,
    canonicalSubfields,
    canonicalExamples,
    canonicalEnumValues,
    systems,
    systemEntities,
    systemFields,
    systemEntityRelationships,
    mappings,
    transformationRules,
    valueMapEntries,
    composeRuleFields,
    decomposeRuleFields,
    propagationChains,
    propagationChainSteps,
    interfaces,
    interfaceFields,
    modelVersions,
    exportedAt: new Date().toISOString(),
  }

  const content = JSON.stringify(exportData, null, 2)
  const now = new Date().toISOString().slice(0, 10)
  const filename = `workspace-${workspace.slug}-${now}.json`

  return { content, contentType: 'application/json', filename }
}
