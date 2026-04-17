import { useState, lazy, Suspense, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useInterface,
  useCreateInterfaceField,
  useUpdateInterfaceField,
  useDeleteInterfaceField,
  useInterfaceVersions,
  useCutInterfaceVersion,
  useUpdateInterfaceVersionStatus,
} from '../../hooks/useInterfaces.js'
import { useCanonicalFields, useCanonicalEntities } from '../../hooks/useCanonical.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage } from '../../lib/api.js'
import { api, triggerDownload } from '../../lib/api.js'
import type { InterfaceFieldResolved, InterfaceFieldStatus, InterfaceVersionStatus, DataType } from '../../lib/types.js'
import { SpecSheetDialog } from './SpecSheetDialog.js'
import { ExcelImportDialog } from './ExcelImportDialog.js'

const SwaggerUI = lazy(() => import('swagger-ui-react'))
import 'swagger-ui-react/swagger-ui.css'

const STATUS_OPTIONS: Array<{ value: InterfaceFieldStatus; label: string }> = [
  { value: 'MANDATORY', label: 'Mandatory' },
  { value: 'OPTIONAL', label: 'Optional' },
  { value: 'EXCLUDED', label: 'Excluded' },
]

const DATA_TYPE_OPTIONS: Array<{ value: DataType; label: string }> = [
  { value: 'STRING', label: 'String' },
  { value: 'INTEGER', label: 'Integer' },
  { value: 'DECIMAL', label: 'Decimal' },
  { value: 'BOOLEAN', label: 'Boolean' },
  { value: 'DATE', label: 'Date' },
  { value: 'DATETIME', label: 'DateTime' },
  { value: 'ENUM', label: 'Enum' },
  { value: 'OBJECT', label: 'Object' },
  { value: 'ARRAY', label: 'Array' },
]

export function InterfaceDetailPage() {
  const { workspaceId, interfaceId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: iface, isLoading } = useInterface(workspaceId, interfaceId)
  const { data: canonicalFields } = useCanonicalFields(workspaceId)
  const { data: canonicalEntities } = useCanonicalEntities(workspaceId)
  const createFieldMutation = useCreateInterfaceField(workspaceId!, interfaceId!)
  const updateFieldMutation = useUpdateInterfaceField(workspaceId!, interfaceId!)
  const deleteFieldMutation = useDeleteInterfaceField(workspaceId!, interfaceId!)

  // Add canonical field dialog
  const [addOpen, setAddOpen] = useState(false)
  const [selectedEntityId, setSelectedEntityId] = useState('')
  const [newCanonicalFieldId, setNewCanonicalFieldId] = useState('')
  const [newStatus, setNewStatus] = useState<InterfaceFieldStatus>('OPTIONAL')

  // Add unlinked field dialog
  const [addUnlinkedOpen, setAddUnlinkedOpen] = useState(false)
  const [ulName, setUlName] = useState('')
  const [ulDisplayName, setUlDisplayName] = useState('')
  const [ulDataType, setUlDataType] = useState<DataType>('STRING')
  const [ulDescription, setUlDescription] = useState('')
  const [ulStatus, setUlStatus] = useState<InterfaceFieldStatus>('OPTIONAL')

  const [exporting, setExporting] = useState(false)

  // Swagger preview
  const [swaggerSpec, setSwaggerSpec] = useState<Record<string, unknown> | null>(null)
  const [swaggerOpen, setSwaggerOpen] = useState(false)

  // Spec sheet
  const [specSheetOpen, setSpecSheetOpen] = useState(false)

  // Field search
  const [fieldSearch, setFieldSearch] = useState('')

  // Excel import
  const [importOpen, setImportOpen] = useState(false)

  // Versioning
  const { data: versionsData } = useInterfaceVersions(workspaceId, interfaceId)
  const cutVersionMutation = useCutInterfaceVersion(workspaceId!, interfaceId!)
  const updateVersionStatusMutation = useUpdateInterfaceVersionStatus(workspaceId!, interfaceId!)
  const [cutVersionOpen, setCutVersionOpen] = useState(false)
  const [versionLabel, setVersionLabel] = useState('')
  const [versionDescription, setVersionDescription] = useState('')

  async function handleAddField() {
    if (!newCanonicalFieldId) return
    try {
      await createFieldMutation.mutateAsync({
        canonicalFieldId: newCanonicalFieldId,
        status: newStatus,
      })
      setAddOpen(false)
      setSelectedEntityId('')
      setNewCanonicalFieldId('')
      setNewStatus('OPTIONAL')
      toast('success', 'Field added to interface')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleAddUnlinkedField() {
    if (!ulName.trim()) return
    try {
      await createFieldMutation.mutateAsync({
        name: ulName.trim(),
        displayName: ulDisplayName.trim() || undefined,
        dataType: ulDataType,
        description: ulDescription.trim() || undefined,
        status: ulStatus,
      })
      setAddUnlinkedOpen(false)
      setUlName('')
      setUlDisplayName('')
      setUlDataType('STRING')
      setUlDescription('')
      setUlStatus('OPTIONAL')
      toast('success', 'Interface field added')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleUpdateStatus(field: InterfaceFieldResolved, status: InterfaceFieldStatus) {
    try {
      await updateFieldMutation.mutateAsync({
        fieldId: field.id,
        data: { status },
      })
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleRemoveField(field: InterfaceFieldResolved) {
    try {
      await deleteFieldMutation.mutateAsync(field.id)
      toast('success', 'Field removed')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleCutVersion() {
    if (!versionLabel.trim()) return
    try {
      await cutVersionMutation.mutateAsync({
        label: versionLabel.trim(),
        description: versionDescription.trim() || undefined,
      })
      setCutVersionOpen(false)
      setVersionLabel('')
      setVersionDescription('')
      toast('success', 'Version created')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleVersionStatusChange(versionId: string, status: 'PUBLISHED' | 'DEPRECATED') {
    try {
      await updateVersionStatusMutation.mutateAsync({ versionId, data: { status } })
      toast('success', status === 'PUBLISHED' ? 'Version published' : 'Version deprecated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  const STATUS_BADGE_VARIANT: Record<InterfaceVersionStatus, 'info' | 'success' | 'warning' | 'default'> = {
    DRAFT: 'info',
    PUBLISHED: 'success',
    DEPRECATED: 'warning',
  }

  async function handleExportOpenApi(format: 'yaml' | 'json') {
    if (!iface) return
    setExporting(true)
    try {
      const blob = await api.export.openapi(workspaceId!, {
        systemId: iface.sourceSystemId,
        format,
      })
      triggerDownload(blob, `openapi-${iface.name}.${format === 'yaml' ? 'yaml' : 'json'}`)
      toast('success', 'OpenAPI spec downloaded')
    } catch (err) {
      toast('error', getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleSwaggerPreview() {
    if (!iface) return
    setExporting(true)
    try {
      const blob = await api.export.openapi(workspaceId!, {
        systemId: iface.sourceSystemId,
        format: 'json',
      })
      const text = await blob.text()
      setSwaggerSpec(JSON.parse(text))
      setSwaggerOpen(true)
    } catch (err) {
      toast('error', getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleExportExcel() {
    if (!iface) return
    setExporting(true)
    try {
      const blob = await api.export.interfaceExcel(workspaceId!, interfaceId!)
      triggerDownload(blob, `interface-${iface.name}.xlsx`)
      toast('success', 'Excel exported')
    } catch (err) {
      toast('error', getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  async function handleExportJsonSchema() {
    if (!iface) return
    setExporting(true)
    try {
      const blob = await api.export.jsonSchema(workspaceId!, {
        scope: 'interface',
        scopeId: interfaceId!,
        format: 'json',
      })
      triggerDownload(blob, `schema-${iface.name}.json`)
      toast('success', 'JSON Schema downloaded')
    } catch (err) {
      toast('error', getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  function mappingCell(
    mapping: InterfaceFieldResolved['sourceMapping'] | InterfaceFieldResolved['targetMapping']
  ) {
    if (!mapping) {
      return <Badge variant="warning">Missing</Badge>
    }
    return (
      <span className="text-sm">
        {mapping.entityName && (
          <span className="text-gray-500">{mapping.entityName}.</span>
        )}
        <span className="font-medium">{mapping.systemFieldName}</span>
      </span>
    )
  }

  // Split fields into linked (canonical) and unlinked (transport/meta)
  const allLinked = (iface?.fields ?? []).filter((f) => f.canonicalFieldId)
  const allUnlinked = (iface?.fields ?? []).filter((f) => !f.canonicalFieldId)

  function fieldMatchesSearch(f: InterfaceFieldResolved, q: string): boolean {
    const haystack = [
      f.canonicalField?.displayName,
      f.canonicalField?.name,
      f.name,
      f.displayName,
      f.sourceMapping?.systemFieldName,
      f.sourceMapping?.entityName,
      f.targetMapping?.systemFieldName,
      f.targetMapping?.entityName,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    if (haystack.includes(q)) return true
    return (f.children ?? []).some((c) => fieldMatchesSearch(c, q))
  }

  const q = fieldSearch.trim().toLowerCase()
  const linkedFields = q ? allLinked.filter((f) => fieldMatchesSearch(f, q)) : allLinked
  const unlinkedFields = q ? allUnlinked.filter((f) => fieldMatchesSearch(f, q)) : allUnlinked

  function renderFieldRow(f: InterfaceFieldResolved, depth: number): ReactNode[] {
    const hasMissing = !f.sourceMapping || !f.targetMapping
    const cf = f.canonicalField
    const isRef = !!cf?.referencedEntityId
    const cardSuffix = cf?.cardinality === 'MANY' ? '[]' : ''
    const indent = depth > 0 ? { paddingLeft: `${1 + depth * 1.5}rem` } : undefined
    const isVirtual = (f as any).virtual

    const rows: ReactNode[] = [
      <tr
        key={f.id}
        className={
          hasMissing && !isRef
            ? 'bg-yellow-50'
            : depth > 0
            ? 'bg-blue-50/30'
            : ''
        }
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900" style={indent}>
          {cf ? `${cf.displayName}${cardSuffix} (${cf.name})` : f.canonicalFieldId}
          {isRef && <span className="ml-2 text-xs text-blue-600">{cf?.cardinality === 'MANY' ? '1:n' : '1:1'} ref</span>}
        </td>
        <td className="px-4 py-3">{isRef ? <span className="text-gray-300">&mdash;</span> : mappingCell(f.sourceMapping)}</td>
        <td className="px-4 py-3">{isRef ? <span className="text-gray-300">&mdash;</span> : mappingCell(f.targetMapping)}</td>
        <td className="px-4 py-3">
          {isVirtual ? (
            <span className="text-xs text-gray-400">{f.status}</span>
          ) : (
            <Select
              options={STATUS_OPTIONS}
              value={f.status}
              onChange={(e) =>
                handleUpdateStatus(f, e.target.value as InterfaceFieldStatus)
              }
              className="w-32"
            />
          )}
        </td>
        <td className="px-4 py-3 text-right">
          {!isVirtual && (
            <Button variant="ghost" size="sm" onClick={() => handleRemoveField(f)}>
              Remove
            </Button>
          )}
        </td>
      </tr>,
    ]

    if (f.children) {
      for (const child of f.children) {
        rows.push(...renderFieldRow(child, depth + 1))
      }
    }
    return rows
  }

  // Filter out already-added canonical fields, then filter by selected entity
  const existingFieldIds = new Set(linkedFields.map((f) => f.canonicalFieldId))
  const availableFields = (canonicalFields?.items ?? []).filter(
    (f) => !existingFieldIds.has(f.id)
  )
  const entitiesWithAvailableFields = (canonicalEntities?.items ?? []).filter(
    (e) => availableFields.some((f) => f.entityId === e.id)
  )
  const fieldsForSelectedEntity = selectedEntityId
    ? availableFields.filter((f) => f.entityId === selectedEntityId)
    : []

  if (isLoading) return <Spinner />
  if (!iface) return <div className="text-gray-500">Interface not found</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate(`/workspaces/${workspaceId}/interfaces`)}
            className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block"
          >
            &larr; Back to interfaces
          </button>
          <h1 className="text-2xl font-bold text-gray-900">{iface.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-gray-600">
              {iface.sourceSystem?.name ?? iface.sourceSystemId}
              {iface.sourceEntities && iface.sourceEntities.length > 0 && (
                <span className="text-gray-500"> / {iface.sourceEntities.map((e: { id: string; name: string }) => e.name).join(', ')}</span>
              )}
            </span>
            <span className="text-gray-400">&rarr;</span>
            <span className="text-sm text-gray-600">
              {iface.targetSystem?.name ?? iface.targetSystemId}
              {iface.targetEntities && iface.targetEntities.length > 0 && (
                <span className="text-gray-500"> / {iface.targetEntities.map((e: { id: string; name: string }) => e.name).join(', ')}</span>
              )}
            </span>
            <Badge variant={iface.direction === 'EVENT' ? 'warning' : 'info'}>
              {iface.direction}
            </Badge>
            {versionsData?.items?.[0] && (
              <>
                <span className="text-gray-300">|</span>
                <Badge variant={STATUS_BADGE_VARIANT[versionsData.items[0].status]}>
                  {versionsData.items[0].label}
                </Badge>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSpecSheetOpen(true)}>
            Spec Sheet
          </Button>
          <Button variant="secondary" size="sm" onClick={handleSwaggerPreview} disabled={exporting}>
            Swagger
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExportOpenApi('yaml')} disabled={exporting}>
            Export YAML
          </Button>
          <Button variant="secondary" size="sm" onClick={() => handleExportOpenApi('json')} disabled={exporting}>
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportJsonSchema} disabled={exporting}>
            JSON Schema
          </Button>
          <Button variant="secondary" size="sm" onClick={handleExportExcel} disabled={exporting}>
            Export Excel
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}>
            Import Excel
          </Button>
          <Button onClick={() => setAddOpen(true)}>Add Field</Button>
        </div>
      </div>

      {iface.description && (
        <p className="text-sm text-gray-600 mb-6">{iface.description}</p>
      )}

      {/* Canonical field contract table */}
      <Input
        placeholder="Search fields..."
        value={fieldSearch}
        onChange={(e) => setFieldSearch(e.target.value)}
        className="mb-4"
      />

      <h2 className="text-lg font-semibold text-gray-800 mb-3">Canonical Fields</h2>
      {linkedFields.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-gray-200 rounded-lg mb-8">
          No canonical fields added yet.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Canonical Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Source Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Target Field
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {linkedFields.flatMap((f) => renderFieldRow(f, 0))}
            </tbody>
          </table>
        </div>
      )}

      {/* Transport / Metadata fields */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Interface Fields</h2>
          <p className="text-xs text-gray-500">Transport and metadata fields not in the canonical model</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setAddUnlinkedOpen(true)}>
          Add Interface Field
        </Button>
      </div>
      {unlinkedFields.length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-gray-200 rounded-lg">
          No interface-level fields. Add transport or metadata fields like processDate, correlationId, etc.
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Description
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {unlinkedFields.map((f) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {f.displayName ? `${f.displayName} (${f.name})` : f.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    <Badge variant="default">{f.dataType}</Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {f.description || <span className="text-gray-300">&mdash;</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Select
                      options={STATUS_OPTIONS}
                      value={f.status}
                      onChange={(e) =>
                        handleUpdateStatus(f, e.target.value as InterfaceFieldStatus)
                      }
                      className="w-32"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveField(f)}>
                      Remove
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Versions */}
      <div className="flex items-center justify-between mb-3 mt-8">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Versions</h2>
          <p className="text-xs text-gray-500">Snapshot history of this interface contract</p>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setCutVersionOpen(true)}
        >
          Cut Version
        </Button>
      </div>
      {(versionsData?.items ?? []).length === 0 ? (
        <div className="text-center py-8 text-gray-500 text-sm border border-gray-200 rounded-lg mb-8">
          No versions yet. Cut a version to snapshot the current contract state.
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg divide-y divide-gray-200 mb-8">
          {(versionsData?.items ?? []).map((v) => (
            <div key={v.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900">{v.label}</span>
                <Badge variant={STATUS_BADGE_VARIANT[v.status]}>{v.status}</Badge>
                <span className="text-xs text-gray-500">{v.fieldCount} fields</span>
                {v.description && (
                  <span className="text-xs text-gray-400">{v.description}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  {new Date(v.createdAt).toLocaleDateString()}
                </span>
                {v.status === 'DRAFT' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleVersionStatusChange(v.id, 'PUBLISHED')}
                    disabled={updateVersionStatusMutation.isPending}
                  >
                    Publish
                  </Button>
                )}
                {v.status === 'PUBLISHED' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVersionStatusChange(v.id, 'DEPRECATED')}
                    disabled={updateVersionStatusMutation.isPending}
                  >
                    Deprecate
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Swagger preview */}
      <Dialog
        open={swaggerOpen}
        onClose={() => setSwaggerOpen(false)}
        title="API Preview"
        wide
        footer={
          <Button variant="secondary" onClick={() => setSwaggerOpen(false)}>
            Close
          </Button>
        }
      >
        {swaggerSpec && (
          <Suspense fallback={<Spinner />}>
            <SwaggerUI spec={swaggerSpec} />
          </Suspense>
        )}
      </Dialog>

      {/* Excel import */}
      <ExcelImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        workspaceId={workspaceId!}
        interfaceId={interfaceId!}
      />

      {/* Spec sheet */}
      {iface && (
        <SpecSheetDialog
          open={specSheetOpen}
          onClose={() => setSpecSheetOpen(false)}
          iface={iface}
          canonicalFields={canonicalFields?.items ?? []}
          canonicalEntities={canonicalEntities?.items ?? []}
        />
      )}

      {/* Cut version dialog */}
      <Dialog
        open={cutVersionOpen}
        onClose={() => setCutVersionOpen(false)}
        title="Cut Version"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCutVersionOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCutVersion}
              disabled={!versionLabel.trim() || cutVersionMutation.isPending}
            >
              {cutVersionMutation.isPending ? 'Creating...' : 'Cut Version'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Version Label"
            value={versionLabel}
            onChange={(e) => setVersionLabel(e.target.value)}
            placeholder="e.g. v1.0, 2026-Q1, beta"
          />
          <Input
            label="Description (optional)"
            value={versionDescription}
            onChange={(e) => setVersionDescription(e.target.value)}
            placeholder="What changed in this version"
          />
        </div>
      </Dialog>

      {/* Add canonical field dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Canonical Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddField}
              disabled={!newCanonicalFieldId || createFieldMutation.isPending}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Select
            label="Entity"
            options={[
              { value: '', label: 'Select an entity' },
              ...entitiesWithAvailableFields.map((e) => ({ value: e.id, label: e.name })),
            ]}
            value={selectedEntityId}
            onChange={(e) => { setSelectedEntityId(e.target.value); setNewCanonicalFieldId('') }}
          />
          <Select
            label="Canonical Field"
            options={[
              { value: '', label: selectedEntityId ? 'Select a field' : 'Select an entity first' },
              ...fieldsForSelectedEntity.map((f) => ({
                value: f.id,
                label: `${f.displayName} (${f.name})`,
              })),
            ]}
            value={newCanonicalFieldId}
            onChange={(e) => setNewCanonicalFieldId(e.target.value)}
            disabled={!selectedEntityId}
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as InterfaceFieldStatus)}
          />
        </div>
      </Dialog>

      {/* Add unlinked field dialog */}
      <Dialog
        open={addUnlinkedOpen}
        onClose={() => setAddUnlinkedOpen(false)}
        title="Add Interface Field"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddUnlinkedOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddUnlinkedField}
              disabled={!ulName.trim() || createFieldMutation.isPending}
            >
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={ulName}
            onChange={(e) => setUlName(e.target.value)}
            placeholder="e.g. processDate, correlationId"
          />
          <Input
            label="Display Name"
            value={ulDisplayName}
            onChange={(e) => setUlDisplayName(e.target.value)}
            placeholder="Optional label"
          />
          <Select
            label="Data Type"
            options={DATA_TYPE_OPTIONS}
            value={ulDataType}
            onChange={(e) => setUlDataType(e.target.value as DataType)}
          />
          <Input
            label="Description"
            value={ulDescription}
            onChange={(e) => setUlDescription(e.target.value)}
            placeholder="Optional description"
          />
          <Select
            label="Status"
            options={STATUS_OPTIONS}
            value={ulStatus}
            onChange={(e) => setUlStatus(e.target.value as InterfaceFieldStatus)}
          />
        </div>
      </Dialog>
    </div>
  )
}
