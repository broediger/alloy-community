import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError } from '../../errors/index.js'
import * as interfaceService from '../interfaces/interfaces.js'

export async function exportInterfaceExcel(workspaceId: string, interfaceId: string) {
  const iface = await interfaceService.getById(workspaceId, interfaceId)

  // Load canonical fields and entities for grouping + descriptions
  const canonicalFields = await prisma.canonicalField.findMany({
    where: { workspaceId },
    include: { entity: { select: { id: true, name: true } } },
  })
  const cfEntityMap = new Map(canonicalFields.map((f) => [f.id, f.entity.name]))
  const cfDescMap = new Map(canonicalFields.map((f) => [f.id, f.description]))

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Interface Manager'
  wb.created = new Date()

  // ── Sheet 1: Metadata ──
  const meta = wb.addWorksheet('Metadata')
  meta.columns = [{ width: 20 }, { width: 60 }]
  const metaRows: [string, string][] = [
    ['Interface Name', iface.name],
    ['Description', iface.description ?? ''],
    ['Source System', iface.sourceSystem?.name ?? iface.sourceSystemId],
    ['Target System', iface.targetSystem?.name ?? iface.targetSystemId],
    ['Direction', iface.direction],
    ['Source Entities', (iface.sourceEntities ?? []).map((e: any) => e.name).join(', ')],
    ['Target Entities', (iface.targetEntities ?? []).map((e: any) => e.name).join(', ')],
    ['Exported At', new Date().toISOString()],
    ['Interface ID', iface.id],
  ]
  for (const [label, value] of metaRows) {
    const row = meta.addRow([label, value])
    row.getCell(1).font = { bold: true }
  }

  // ── Sheet 2: Fields ──
  const fields = wb.addWorksheet('Fields')
  const fieldHeaders = [
    'Field', 'Path', 'Entity', 'Data Type', 'Max Length', 'Status',
    'Nullable', 'Source System Field', 'Target System Field',
    'Source Rule Type', 'Target Rule Type', 'Description', 'Linked',
  ]
  const headerRow = fields.addRow(fieldHeaders)
  headerRow.font = { bold: true }
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }

  fields.columns = [
    { width: 22 }, { width: 22 }, { width: 18 }, { width: 12 }, { width: 10 },
    { width: 14 }, { width: 10 }, { width: 28 }, { width: 28 },
    { width: 16 }, { width: 16 }, { width: 40 }, { width: 8 },
  ]

  // Separate linked and unlinked, group linked by entity
  const linked = iface.fields.filter((f: any) => f.canonicalFieldId)
  const unlinked = iface.fields.filter((f: any) => !f.canonicalFieldId)

  type EntityGroup = { name: string; fields: any[] }
  const groups = new Map<string, EntityGroup>()
  for (const f of linked) {
    const entityName = cfEntityMap.get(f.canonicalFieldId!) ?? 'Unknown'
    if (!groups.has(entityName)) groups.set(entityName, { name: entityName, fields: [] })
    groups.get(entityName)!.fields.push(f)
  }
  const sortedGroups = [...groups.values()].sort((a, b) => a.name.localeCompare(b.name))

  function mappingLabel(m: any): string {
    if (!m) return ''
    return m.entityName ? `${m.entityName}.${m.systemFieldName}` : m.systemFieldName ?? ''
  }

  // Write linked field rows with entity section headers
  for (const group of sortedGroups) {
    const sectionRow = fields.addRow([group.name])
    sectionRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
    sectionRow.font = { bold: true, color: { argb: 'FF2E7D32' } }
    fields.mergeCells(sectionRow.number, 1, sectionRow.number, fieldHeaders.length)

    for (const f of group.fields) {
      const srcRule = f.sourceMapping?.transformationRule?.type ?? ''
      const tgtRule = f.targetMapping?.transformationRule?.type ?? ''
      fields.addRow([
        f.canonicalField?.displayName ?? '',
        f.canonicalField?.name ?? '',
        group.name,
        f.canonicalField?.dataType ?? '',
        f.maxLength ?? '',
        f.status,
        f.nullable ? 'Yes' : 'No',
        mappingLabel(f.sourceMapping),
        mappingLabel(f.targetMapping),
        srcRule,
        tgtRule,
        cfDescMap.get(f.canonicalFieldId!) ?? '',
        'Yes',
      ])
    }
  }

  // Write unlinked field rows
  if (unlinked.length > 0) {
    const sectionRow = fields.addRow(['Interface Fields (Transport / Metadata)'])
    sectionRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } }
    sectionRow.font = { bold: true, color: { argb: 'FF616161' } }
    fields.mergeCells(sectionRow.number, 1, sectionRow.number, fieldHeaders.length)

    for (const f of unlinked) {
      fields.addRow([
        f.displayName ?? f.name ?? '',
        f.name ?? '',
        '',
        f.dataType ?? '',
        f.maxLength ?? '',
        f.status,
        f.nullable ? 'Yes' : 'No',
        '',
        '',
        '',
        '',
        f.description ?? '',
        'No',
      ])
    }
  }

  // Add data validation for Status column
  const dataRowStart = 2
  const dataRowEnd = fields.rowCount
  if (dataRowEnd >= dataRowStart) {
    fields.getColumn(6).eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber > 1 && cell.value && typeof cell.value === 'string' && ['MANDATORY', 'OPTIONAL', 'EXCLUDED'].includes(cell.value)) {
        cell.dataValidation = {
          type: 'list',
          allowBlank: false,
          formulae: ['"MANDATORY,OPTIONAL,EXCLUDED"'],
        }
      }
    })
  }

  // ── Sheet 3: Value Maps ──
  const vmSheet = wb.addWorksheet('Value Maps')
  const vmHeader = vmSheet.addRow(['Field Path', 'Side', 'From Value', 'To Value', 'Bidirectional'])
  vmHeader.font = { bold: true }
  vmHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
  vmSheet.columns = [{ width: 22 }, { width: 10 }, { width: 20 }, { width: 20 }, { width: 14 }]

  for (const f of linked) {
    const fieldPath = f.canonicalField?.name ?? ''
    for (const [side, mapping] of [['SOURCE', f.sourceMapping], ['TARGET', f.targetMapping]] as const) {
      if (!mapping?.transformationRule || mapping.transformationRule.type !== 'VALUE_MAP') continue
      for (const entry of mapping.transformationRule.valueMapEntries ?? []) {
        vmSheet.addRow([fieldPath, side, entry.fromValue, entry.toValue, entry.bidirectional ? 'Yes' : 'No'])
      }
    }
  }

  // ── Sheet 4: Type Casts ──
  const tcSheet = wb.addWorksheet('Type Casts')
  const tcHeader = tcSheet.addRow(['Field Path', 'Side', 'From Type', 'To Type'])
  tcHeader.font = { bold: true }
  tcHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F0F0' } }
  tcSheet.columns = [{ width: 22 }, { width: 10 }, { width: 16 }, { width: 16 }]

  for (const f of linked) {
    const fieldPath = f.canonicalField?.name ?? ''
    for (const [side, mapping] of [['SOURCE', f.sourceMapping], ['TARGET', f.targetMapping]] as const) {
      if (!mapping?.transformationRule || mapping.transformationRule.type !== 'TYPE_CAST') continue
      const config = mapping.transformationRule.config as any
      tcSheet.addRow([fieldPath, side, config?.from ?? '', config?.to ?? ''])
    }
  }

  // Generate buffer
  const buffer = await wb.xlsx.writeBuffer()
  const now = new Date().toISOString().slice(0, 10)
  const slug = iface.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const filename = `interface-${slug}-${now}.xlsx`

  return { buffer: Buffer.from(buffer), filename }
}
