import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useCanonicalEntities,
  useCreateCanonicalEntity,
  useUpdateCanonicalEntity,
  useDeleteCanonicalEntity,
} from '../../hooks/useCanonical.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { CoverageBar } from '../../components/ui/CoverageBar.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import type { CanonicalEntityListItem } from '../../lib/types.js'

export function CanonicalEntityListPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useCanonicalEntities(workspaceId)
  const createMutation = useCreateCanonicalEntity(workspaceId!)
  const updateMutation = useUpdateCanonicalEntity(workspaceId!)
  const deleteMutation = useDeleteCanonicalEntity(workspaceId!)

  const [search, setSearch] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')

  const [editTarget, setEditTarget] = useState<CanonicalEntityListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editDescription, setEditDescription] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<CanonicalEntityListItem | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  function handleNameChange(value: string) {
    setName(value)
    setSlug(
      value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
    )
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
      })
      setDialogOpen(false)
      setName('')
      setSlug('')
      setDescription('')
      toast('success', 'Entity created')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    try {
      await deleteMutation.mutateAsync(deleteTarget.id)
      toast('success', 'Entity deleted')
      setDeleteTarget(null)
      setDeleteError(null)
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteTarget(null)
      }
    }
  }

  function openEditEntity(e: CanonicalEntityListItem) {
    setEditTarget(e)
    setEditName(e.name)
    setEditSlug(e.slug)
    setEditDescription(e.description ?? '')
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim() || !editSlug.trim()) return
    try {
      await updateMutation.mutateAsync({
        entityId: editTarget.id,
        data: {
          name: editName.trim(),
          slug: editSlug.trim(),
          description: editDescription.trim() || undefined,
        },
      })
      setEditTarget(null)
      toast('success', 'Entity updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  const columns: Column<CanonicalEntityListItem>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (e) => <span className="font-medium">{e.name}</span>,
    },
    {
      key: 'slug',
      header: 'Slug',
      render: (e) => <span className="text-gray-500">{e.slug}</span>,
    },
    {
      key: 'fields',
      header: 'Fields',
      render: (e) => (
        <span>
          {e.mappedFieldCount}/{e.fieldCount}
        </span>
      ),
      className: 'text-center',
    },
    {
      key: 'coverage',
      header: 'Coverage',
      render: (e) => <CoverageBar mapped={e.mappedFieldCount} total={e.fieldCount} />,
      className: 'w-40',
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={(ev) => {
              ev.stopPropagation()
              openEditEntity(e)
            }}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(ev) => {
              ev.stopPropagation()
              setDeleteTarget(e)
              setDeleteError(null)
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
          <h1 className="text-2xl font-bold text-gray-900">Canonical Fields</h1>
          <p className="text-sm text-gray-500 mt-1">Manage canonical entities and their fields</p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Create Entity</Button>
      </div>

      <Input
        placeholder="Search entities..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      <Table
        columns={columns}
        data={(data?.items ?? []).filter((e) => {
          if (!search) return true
          const q = search.toLowerCase()
          return e.name.toLowerCase().includes(q) || e.slug.toLowerCase().includes(q)
        })}
        keyFn={(e) => e.id}
        onRowClick={(e) =>
          navigate(`/workspaces/${workspaceId}/canonical/entities/${e.id}`)
        }
        emptyMessage="No canonical entities yet."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Canonical Entity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Contact"
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="contact"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional description"
          />
        </div>
      </Dialog>

      {/* Edit entity dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Entity"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || !editSlug.trim() || updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input label="Slug" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} />
          <Input
            label="Description"
            value={editDescription}
            onChange={(e) => setEditDescription(e.target.value)}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Entity"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      >
        {deleteError ? (
          <p className="text-sm text-red-600">{deleteError}</p>
        ) : (
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{deleteTarget?.name}</strong>?
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
