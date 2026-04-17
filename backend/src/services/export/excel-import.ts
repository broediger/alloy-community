import ExcelJS from 'exceljs'
import { prisma } from '../../lib/prisma.js'
import { NotFoundError, ValidationError } from '../../errors/index.js'

export interface ImportResult {
  created: number
  updated: number
  unchanged: number
  warnings: Array<{ row: number; field: string; message: string }>
  errors: Array<{ row: number; field: string; message: string }>
}

const VALID_STATUSES = ['MANDATORY', 'OPTIONAL', 'EXCLUDED']
const VALID_DATA_TYPES = ['STRING', 'INTEGER', 'DECIMAL', 'BOOLEAN', 'DATE', 'DATETIME', 'ENUM', 'OBJECT', 'ARRAY']

function cellStr(row: ExcelJS.Row, col: number): string {
  const val = row.getCell(col).value
  if (val == null) return ''
  return String(val).trim()
}

function cellInt(row: ExcelJS.Row, col: number): number | null {
  const val = row.getCell(col).value
  if (val == null || val === '') return null
  const n = Number(val)
  return Number.isInteger(n) && n > 0 ? n : null
}

export async function importInterfaceExcel(
  workspaceId: string,
  interfaceId: string,
  buffer: Buffer
): Promise<ImportResult> {
  // Verify interface exists
  const iface = await prisma.interface.findFirst({
    where: { id: interfaceId, workspaceId },
  })
  if (!iface) throw new NotFoundError('Interface')

  // Parse workbook
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(buffer as any)

  const metaSheet = wb.getWorksheet('Metadata')
  const fieldsSheet = wb.getWorksheet('Fields')

  if (!fieldsSheet) {
    throw new ValidationError([{ field: 'file', message: "Workbook must contain a 'Fields' sheet" }])
  }

  // Validate interface ID from metadata if present
  if (metaSheet) {
    const excelInterfaceId = cellStr(metaSheet.getRow(9), 2)
    if (excelInterfaceId && excelInterfaceId !== interfaceId) {
      throw new ValidationError([{
        field: 'interfaceId',
        message: `Excel was exported from a different interface (${excelInterfaceId})`,
      }])
    }
  }

  // Build lookup maps
  const canonicalFields = await prisma.canonicalField.findMany({
    where: { workspaceId },
    include: { entity: { select: { id: true, name: true } } },
  })
  // Key: "EntityName.fieldName" (case-insensitive lookup)
  const cfLookup = new Map<string, string>()
  for (const cf of canonicalFields) {
    cfLookup.set(`${cf.entity.name}.${cf.name}`.toLowerCase(), cf.id)
  }

  // Existing interface fields
  const existingFields = await prisma.interfaceField.findMany({
    where: { interfaceId },
  })
  const existingLinkedMap = new Map(
    existingFields.filter((f) => f.canonicalFieldId).map((f) => [f.canonicalFieldId!, f])
  )
  const existingUnlinkedMap = new Map(
    existingFields.filter((f) => !f.canonicalFieldId && f.name).map((f) => [f.name!, f])
  )

  // Source/target system fields for validation warnings
  const sourceSystemFields = await prisma.systemField.findMany({
    where: { workspaceId, entity: { systemId: iface.sourceSystemId } },
    include: { entity: { select: { name: true } } },
  })
  const targetSystemFields = await prisma.systemField.findMany({
    where: { workspaceId, entity: { systemId: iface.targetSystemId } },
    include: { entity: { select: { name: true } } },
  })
  const srcFieldSet = new Set(sourceSystemFields.map((f) => `${f.entity.name}.${f.name}`.toLowerCase()))
  const tgtFieldSet = new Set(targetSystemFields.map((f) => `${f.entity.name}.${f.name}`.toLowerCase()))

  // Parse rows
  const errors: ImportResult['errors'] = []
  const warnings: ImportResult['warnings'] = []
  const actions: Array<{
    type: 'create-linked' | 'update-linked' | 'create-unlinked' | 'update-unlinked' | 'unchanged'
    row: number
    canonicalFieldId?: string
    existingId?: string
    data?: any
  }> = []

  const seenKeys = new Map<string, number>() // for duplicate detection

  fieldsSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return // skip header

    const field = cellStr(row, 1)
    const path = cellStr(row, 2)
    const entity = cellStr(row, 3)
    const dataType = cellStr(row, 4)
    const maxLength = cellInt(row, 5)
    const status = cellStr(row, 6)
    const nullable = cellStr(row, 7)
    const srcField = cellStr(row, 8)
    const tgtField = cellStr(row, 9)
    const description = cellStr(row, 12)
    const linked = cellStr(row, 13)

    // Skip section header rows (merged cells or no Path)
    if (!path && !field) return
    if (!path) return

    // Validate status
    if (!status || !VALID_STATUSES.includes(status)) {
      errors.push({ row: rowNumber, field: 'Status', message: `Invalid status '${status}'. Must be MANDATORY, OPTIONAL, or EXCLUDED` })
      return
    }

    const isLinked = linked.toLowerCase() === 'yes'

    if (isLinked) {
      // Resolve canonical field
      if (!entity) {
        errors.push({ row: rowNumber, field: 'Entity', message: 'Entity is required for linked fields' })
        return
      }
      const key = `${entity}.${path}`.toLowerCase()

      // Duplicate check
      if (seenKeys.has(key)) {
        errors.push({ row: rowNumber, field: 'Path', message: `Duplicate field — same as row ${seenKeys.get(key)}` })
        return
      }
      seenKeys.set(key, rowNumber)

      const canonicalFieldId = cfLookup.get(key)
      if (!canonicalFieldId) {
        errors.push({ row: rowNumber, field: 'Path', message: `Canonical field '${entity}.${path}' not found in workspace` })
        return
      }

      // Source/target field warnings
      if (srcField && !srcFieldSet.has(srcField.toLowerCase())) {
        warnings.push({ row: rowNumber, field: 'Source System Field', message: `System field '${srcField}' not found in source system` })
      }
      if (tgtField && !tgtFieldSet.has(tgtField.toLowerCase())) {
        warnings.push({ row: rowNumber, field: 'Target System Field', message: `System field '${tgtField}' not found in target system` })
      }

      const existing = existingLinkedMap.get(canonicalFieldId)
      if (existing) {
        // Check if anything changed
        if (existing.status === status && existing.maxLength === maxLength) {
          actions.push({ type: 'unchanged', row: rowNumber })
        } else {
          actions.push({
            type: 'update-linked',
            row: rowNumber,
            existingId: existing.id,
            data: { status, maxLength },
          })
        }
      } else {
        actions.push({
          type: 'create-linked',
          row: rowNumber,
          canonicalFieldId,
          data: { status, maxLength },
        })
      }
    } else {
      // Unlinked field
      if (!dataType || !VALID_DATA_TYPES.includes(dataType)) {
        errors.push({ row: rowNumber, field: 'Data Type', message: `Invalid data type '${dataType}'` })
        return
      }

      const key = `unlinked:${path}`.toLowerCase()
      if (seenKeys.has(key)) {
        errors.push({ row: rowNumber, field: 'Path', message: `Duplicate unlinked field — same as row ${seenKeys.get(key)}` })
        return
      }
      seenKeys.set(key, rowNumber)

      const existing = existingUnlinkedMap.get(path)
      const newData = {
        name: path,
        displayName: field || null,
        dataType,
        description: description || null,
        nullable: nullable.toLowerCase() !== 'no',
        maxLength,
        status,
      }

      if (existing) {
        const changed =
          existing.status !== status ||
          existing.maxLength !== maxLength ||
          existing.dataType !== dataType ||
          existing.description !== (description || null) ||
          existing.nullable !== newData.nullable ||
          existing.displayName !== (field || null)

        if (changed) {
          actions.push({ type: 'update-unlinked', row: rowNumber, existingId: existing.id, data: newData })
        } else {
          actions.push({ type: 'unchanged', row: rowNumber })
        }
      } else {
        actions.push({ type: 'create-unlinked', row: rowNumber, data: newData })
      }
    }
  })

  // If any errors, reject entirely
  if (errors.length > 0) {
    return { created: 0, updated: 0, unchanged: 0, warnings, errors }
  }

  // Write phase — all-or-nothing
  let created = 0
  let updated = 0
  let unchanged = 0

  await prisma.$transaction(async (tx) => {
    for (const action of actions) {
      switch (action.type) {
        case 'create-linked':
          await tx.interfaceField.create({
            data: {
              interfaceId,
              canonicalFieldId: action.canonicalFieldId!,
              status: action.data.status,
              maxLength: action.data.maxLength,
            },
          })
          created++
          break
        case 'update-linked':
          await tx.interfaceField.update({
            where: { id: action.existingId! },
            data: {
              status: action.data.status,
              maxLength: action.data.maxLength,
            },
          })
          updated++
          break
        case 'create-unlinked':
          await tx.interfaceField.create({
            data: {
              interfaceId,
              canonicalFieldId: null,
              name: action.data.name,
              displayName: action.data.displayName,
              dataType: action.data.dataType,
              description: action.data.description,
              nullable: action.data.nullable,
              maxLength: action.data.maxLength,
              status: action.data.status as any,
            },
          })
          created++
          break
        case 'update-unlinked':
          await tx.interfaceField.update({
            where: { id: action.existingId! },
            data: {
              displayName: action.data.displayName,
              dataType: action.data.dataType,
              description: action.data.description,
              nullable: action.data.nullable,
              maxLength: action.data.maxLength,
              status: action.data.status,
            },
          })
          updated++
          break
        case 'unchanged':
          unchanged++
          break
      }
    }
  })

  return { created, updated, unchanged, warnings, errors }
}
