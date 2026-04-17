import { sql } from '../../lib/sql.js'
import { mapPostgresError } from '../../lib/map-postgres-error.js'

export interface TraceResult {
  canonicalField: {
    id: string
    name: string
    displayName: string
    dataType: string
    entityId: string
    entityName: string
  }
  systems: Array<{
    systemId: string
    systemName: string
    systemType: string
    mappings: Array<{
      mappingId: string
      systemFieldId: string | null
      systemFieldName: string | null
      systemFieldPath: string | null
      entityId: string
      entityName: string
      dataType: string | null
      deprecated: boolean
      transformationRule: {
        type: string
      } | null
    }>
  }>
  propagationChains: Array<{
    chainId: string
    chainName: string
    systemId: string
    systemName: string
    steps: Array<{
      stepId: string
      position: number
      stepType: string
      systemFieldId: string
      systemFieldName: string
      entityName: string
    }>
  }>
  interfaces: Array<{
    interfaceId: string
    interfaceName: string
    direction: string
    sourceSystemId: string
    sourceSystemName: string
    targetSystemId: string
    targetSystemName: string
    status: string
  }>
  conflicts: Array<{
    type: string
    description: string
    systems: Array<{
      systemId: string
      systemName: string
      dataType: string
    }>
  }>
}

export async function traceCanonicalField(workspaceId: string, canonicalFieldId: string): Promise<TraceResult | null> {
  try {
    // Get canonical field info
    const fieldRows = await sql`
      SELECT
        cf.id, cf.name, cf.display_name as "displayName", cf.data_type as "dataType",
        cf.entity_id as "entityId", ce.name as "entityName"
      FROM canonical_fields cf
      JOIN canonical_entities ce ON ce.id = cf.entity_id
      WHERE cf.id = ${canonicalFieldId}
        AND cf.workspace_id = ${workspaceId}
    `

    if (fieldRows.length === 0) {
      return null
    }

    const canonicalField = fieldRows[0] as TraceResult['canonicalField']

    // Get all mappings for this canonical field
    const mappingRows = await sql`
      SELECT
        m.id, m.system_field_id as "systemFieldId", m.deprecated,
        sf.name as "systemFieldName",
        sf.path as "systemFieldPath",
        sf.entity_id as "systemEntityId",
        sf.data_type as "systemFieldDataType",
        se.name as "systemEntityName",
        se.system_id as "systemId",
        s.name as "systemName",
        s.system_type as "systemType",
        tr.type as "ruleType"
      FROM mappings m
      LEFT JOIN system_fields sf ON sf.id = m.system_field_id
      LEFT JOIN system_entities se ON se.id = sf.entity_id
      LEFT JOIN systems s ON s.id = se.system_id
      LEFT JOIN transformation_rules tr ON tr.mapping_id = m.id
      WHERE m.canonical_field_id = ${canonicalFieldId}
        AND m.workspace_id = ${workspaceId}
    `

    // Group mappings by system
    const systemMap = new Map<string, TraceResult['systems'][0]>()
    for (const r of mappingRows as any[]) {
      if (!r.systemId) continue
      if (!systemMap.has(r.systemId)) {
        systemMap.set(r.systemId, {
          systemId: r.systemId,
          systemName: r.systemName,
          systemType: r.systemType,
          mappings: [],
        })
      }
      systemMap.get(r.systemId)!.mappings.push({
        mappingId: r.id,
        systemFieldId: r.systemFieldId,
        systemFieldName: r.systemFieldName,
        systemFieldPath: r.systemFieldPath,
        entityId: r.systemEntityId,
        entityName: r.systemEntityName,
        dataType: r.systemFieldDataType,
        deprecated: r.deprecated,
        transformationRule: r.ruleType ? { type: r.ruleType } : null,
      })
    }
    const systems = Array.from(systemMap.values())

    // Get propagation chains with steps
    const chainRows = await sql`
      SELECT
        pc.id, pc.name, pc.system_id as "systemId",
        s.name as "systemName"
      FROM propagation_chains pc
      JOIN systems s ON s.id = pc.system_id
      WHERE pc.canonical_field_id = ${canonicalFieldId}
        AND pc.workspace_id = ${workspaceId}
    `

    const propagationChains = await Promise.all(
      chainRows.map(async (chain: any) => {
        const stepRows = await sql`
          SELECT
            pcs.id, pcs.position, pcs.step_type as "stepType",
            pcs.system_field_id as "systemFieldId", pcs.notes,
            sf.name as "systemFieldName",
            sf.entity_id as "entityId",
            se.name as "entityName"
          FROM propagation_chain_steps pcs
          JOIN system_fields sf ON sf.id = pcs.system_field_id
          JOIN system_entities se ON se.id = sf.entity_id
          WHERE pcs.chain_id = ${chain.id}
          ORDER BY pcs.position ASC
        `
        return {
          chainId: chain.id,
          chainName: chain.name,
          systemId: chain.systemId,
          systemName: chain.systemName,
          steps: (stepRows as any[]).map((s) => ({
            stepId: s.id,
            position: s.position,
            stepType: s.stepType,
            systemFieldId: s.systemFieldId,
            systemFieldName: s.systemFieldName,
            entityName: s.entityName,
          })),
        }
      })
    )

    // Get interfaces that include this canonical field
    const interfaceRows = await sql`
      SELECT
        i.id, i.name, i.direction,
        i.source_system_id as "sourceSystemId",
        ss.name as "sourceSystemName",
        i.target_system_id as "targetSystemId",
        ts.name as "targetSystemName"
      FROM interface_fields if2
      JOIN interfaces i ON i.id = if2.interface_id
      JOIN systems ss ON ss.id = i.source_system_id
      JOIN systems ts ON ts.id = i.target_system_id
      WHERE if2.canonical_field_id = ${canonicalFieldId}
        AND i.workspace_id = ${workspaceId}
    `

    // Get interface field statuses
    const ifFieldRows = await sql`
      SELECT if2.interface_id as "interfaceId", if2.status
      FROM interface_fields if2
      JOIN interfaces i ON i.id = if2.interface_id
      WHERE if2.canonical_field_id = ${canonicalFieldId}
        AND i.workspace_id = ${workspaceId}
    `
    const ifStatusMap = new Map<string, string>()
    for (const r of ifFieldRows as any[]) {
      ifStatusMap.set(r.interfaceId, r.status)
    }

    const interfaces = (interfaceRows as any[]).map((iface) => ({
      interfaceId: iface.id,
      interfaceName: iface.name,
      direction: iface.direction,
      sourceSystemId: iface.sourceSystemId,
      sourceSystemName: iface.sourceSystemName,
      targetSystemId: iface.targetSystemId,
      targetSystemName: iface.targetSystemName,
      status: ifStatusMap.get(iface.id) ?? 'OPTIONAL',
    }))

    // Conflict detection: TYPE_CONFLICT when two systems map to same canonical field with incompatible dataTypes
    const conflicts: TraceResult['conflicts'] = []
    const systemDataTypes = (mappingRows as any[])
      .filter((r) => r.systemFieldDataType && r.systemId)
      .map((r) => ({
        systemId: r.systemId,
        systemName: r.systemName,
        dataType: r.systemFieldDataType,
      }))

    // Deduplicate by systemId to get one entry per system
    const uniqueSystemTypes = new Map<string, { systemId: string; systemName: string; dataType: string }>()
    for (const s of systemDataTypes) {
      if (!uniqueSystemTypes.has(s.systemId)) {
        uniqueSystemTypes.set(s.systemId, s)
      }
    }
    const dedupedSystemTypes = Array.from(uniqueSystemTypes.values())
    const uniqueDataTypes = new Set(dedupedSystemTypes.map((s) => s.dataType))

    if (uniqueDataTypes.size > 1) {
      conflicts.push({
        type: 'TYPE_CONFLICT',
        description: `Incompatible data types across systems for canonical field '${canonicalField.name}'`,
        systems: dedupedSystemTypes,
      })
    }

    return {
      canonicalField,
      systems,
      propagationChains,
      interfaces,
      conflicts,
    }
  } catch (error) {
    mapPostgresError(error)
  }
}
