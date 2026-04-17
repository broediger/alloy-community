import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useInterfaces, useCreateInterface, useUpdateInterface, useDeleteInterface, useInterfaceVersions } from '../../hooks/useInterfaces.js'
import { useSystems, useSystemEntities } from '../../hooks/useSystems.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Select } from '../../components/ui/Select.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { Badge } from '../../components/ui/Badge.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage } from '../../lib/api.js'
import { Textarea } from '../../components/ui/Textarea.js'
import type { InterfaceListItem, InterfaceDirection, InterfaceVersionStatus } from '../../lib/types.js'

const VERSION_BADGE_VARIANT: Record<InterfaceVersionStatus, 'info' | 'success' | 'warning'> = {
  DRAFT: 'info',
  PUBLISHED: 'success',
  DEPRECATED: 'warning',
}

function VersionCell({ workspaceId, interfaceId }: { workspaceId: string; interfaceId: string }) {
  const { data } = useInterfaceVersions(workspaceId, interfaceId)
  const latest = data?.items?.[0]
  if (!latest) return <span className="text-xs text-gray-400">No version</span>
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-sm font-medium">{latest.label}</span>
      <Badge variant={VERSION_BADGE_VARIANT[latest.status]}>{latest.status}</Badge>
    </div>
  )
}

export function InterfaceListPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useInterfaces(workspaceId)
  const { data: systems } = useSystems(workspaceId)
  const createMutation = useCreateInterface(workspaceId!)
  const updateMutation = useUpdateInterface(workspaceId!)
  const deleteMutation = useDeleteInterface(workspaceId!)

  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sourceSystemId, setSourceSystemId] = useState('')
  const [targetSystemId, setTargetSystemId] = useState('')
  const [sourceEntityIds, setSourceEntityIds] = useState<string[]>([])
  const [targetEntityIds, setTargetEntityIds] = useState<string[]>([])
  const [direction, setDirection] = useState<InterfaceDirection>('REQUEST_RESPONSE')

  const { data: sourceEntities } = useSystemEntities(workspaceId, sourceSystemId || undefined)
  const { data: targetEntities } = useSystemEntities(workspaceId, targetSystemId || undefined)

  const [editTarget, setEditTarget] = useState<InterfaceListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<InterfaceListItem | null>(null)

  const systemNameMap = new Map(
    (systems?.items ?? []).map((s) => [s.id, s.name])
  )

  function toggleEntityId(ids: string[], setIds: (v: string[]) => void, entityId: string) {
    if (ids.includes(entityId)) {
      setIds(ids.filter((id) => id !== entityId))
    } else {
      setIds([...ids, entityId])
    }
  }

  async function handleCreate() {
    if (!name.trim() || !sourceSystemId || !targetSystemId) return
    try {
      const iface = await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        sourceSystemId,
        targetSystemId,
        sourceEntityIds: sourceEntityIds.length > 0 ? sourceEntityIds : undefined,
        targetEntityIds: targetEntityIds.length > 0 ? targetEntityIds : undefined,
        direction,
      })
      setDialogOpen(false)
      setName('')
      setDescription('')
      setSourceSystemId('')
      setTargetSystemId('')
      setSourceEntityIds([])
      setTargetEntityIds([])
      toast('success', 'Interface created')
      navigate(`/workspaces/${workspaceId}/interfaces/${iface.id}`)
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      setDeleteTarget(null)
      toast('success', 'Interface deleted')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function openEditInterface(i: InterfaceListItem) {
    setEditTarget(i)
    setEditName(i.name)
    setEditDescription(i.description ?? '')
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim()) return
    try {
      await updateMutation.mutateAsync({
        interfaceId: editTarget.id,
        data: {
          name: editName.trim(),
          description: editDescription.trim() || undefined,
        },
      })
      setEditTarget(null)
      toast('success', 'Interface updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function formatEntityNames(systemName: string, entities: Array<{ id: string; name: string }>) {
    if (entities.length === 0) return systemName
    return `${systemName} / ${entities.map((e) => e.name).join(', ')}`
  }

  const columns: Column<InterfaceListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (i) => <span className="font-medium">{i.name}</span>,
    },
    {
      key: 'source',
      header: 'Source',
      render: (i) => {
        const sysName = i.sourceSystem?.name ?? systemNameMap.get(i.sourceSystemId) ?? i.sourceSystemId
        return (
          <span>
            {sysName}
            {i.sourceEntities.length > 0 && (
              <span className="text-gray-500 ml-1">
                / {i.sourceEntities.map((e) => e.name).join(', ')}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'arrow',
      header: '',
      render: () => <span className="text-gray-400">&rarr;</span>,
      className: 'w-8 text-center',
    },
    {
      key: 'target',
      header: 'Target',
      render: (i) => {
        const sysName = i.targetSystem?.name ?? systemNameMap.get(i.targetSystemId) ?? i.targetSystemId
        return (
          <span>
            {sysName}
            {i.targetEntities.length > 0 && (
              <span className="text-gray-500 ml-1">
                / {i.targetEntities.map((e) => e.name).join(', ')}
              </span>
            )}
          </span>
        )
      },
    },
    {
      key: 'direction',
      header: 'Direction',
      render: (i) => (
        <Badge variant={i.direction === 'EVENT' ? 'warning' : 'info'}>{i.direction}</Badge>
      ),
    },
    {
      key: 'version',
      header: 'Version',
      render: (i) => <VersionCell workspaceId={workspaceId!} interfaceId={i.id} />,
    },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              openEditInterface(i)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              setDeleteTarget(i)
            }}
          >
            Delete
          </Button>
        </div>
      ),
      className: 'w-36',
    },
  ]

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interfaces</h1>
          <p className="text-sm text-gray-500 mt-1">
            Directed contracts between source and target systems
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Create Interface</Button>
      </div>

      <Input
        placeholder="Search interfaces..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <Table
        columns={columns}
        data={(data?.items ?? []).filter((i) => {
          if (!search) return true
          const q = search.toLowerCase()
          return (
            i.name.toLowerCase().includes(q) ||
            (i.sourceSystem?.name ?? '').toLowerCase().includes(q) ||
            (i.targetSystem?.name ?? '').toLowerCase().includes(q)
          )
        })}
        keyFn={(i) => i.id}
        onRowClick={(i) => navigate(`/workspaces/${workspaceId}/interfaces/${i.id}`)}
        emptyMessage="No interfaces yet."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Interface"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !name.trim() ||
                !sourceSystemId ||
                !targetSystemId ||
                sourceSystemId === targetSystemId ||
                createMutation.isPending
              }
            >
              Create
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Lead Sync"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <Select
            label="Source System"
            options={[
              { value: '', label: 'Select source system' },
              ...(systems?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={sourceSystemId}
            onChange={(e) => { setSourceSystemId(e.target.value); setSourceEntityIds([]) }}
          />
          {sourceSystemId && (sourceEntities?.items ?? []).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source Entities</label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {(sourceEntities?.items ?? []).map((entity) => (
                  <label key={entity.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sourceEntityIds.includes(entity.id)}
                      onChange={() => toggleEntityId(sourceEntityIds, setSourceEntityIds, entity.id)}
                      className="rounded border-gray-300"
                    />
                    {entity.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave all unchecked for system-wide scope</p>
            </div>
          )}
          <Select
            label="Target System"
            options={[
              { value: '', label: 'Select target system' },
              ...(systems?.items ?? []).map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={targetSystemId}
            onChange={(e) => { setTargetSystemId(e.target.value); setTargetEntityIds([]) }}
          />
          {targetSystemId && (targetEntities?.items ?? []).length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Entities</label>
              <div className="space-y-1 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
                {(targetEntities?.items ?? []).map((entity) => (
                  <label key={entity.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={targetEntityIds.includes(entity.id)}
                      onChange={() => toggleEntityId(targetEntityIds, setTargetEntityIds, entity.id)}
                      className="rounded border-gray-300"
                    />
                    {entity.name}
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave all unchecked for system-wide scope</p>
            </div>
          )}
          {sourceSystemId && targetSystemId && sourceSystemId === targetSystemId && (
            <p className="text-sm text-red-600">Source and target systems must be different.</p>
          )}
          <Select
            label="Direction"
            options={[
              { value: 'REQUEST_RESPONSE', label: 'Request/Response' },
              { value: 'EVENT', label: 'Event' },
            ]}
            value={direction}
            onChange={(e) => setDirection(e.target.value as InterfaceDirection)}
          />
        </div>
      </Dialog>

      {/* Edit interface dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Interface"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Textarea
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
            rows={3}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Interface"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      >
        <p className="text-sm text-gray-600">
          Delete <strong>{deleteTarget?.name}</strong>? All interface fields will also be removed.
        </p>
      </ConfirmDialog>
    </div>
  )
}
