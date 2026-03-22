import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useWorkspaces, useCreateWorkspace, useUpdateWorkspace } from '../../hooks/useWorkspaces.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Dialog } from '../../components/ui/Dialog.js'
import { Table, type Column } from '../../components/ui/Table.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage } from '../../lib/api.js'
import type { WorkspaceListItem } from '../../lib/types.js'

export function WorkspaceListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data, isLoading } = useWorkspaces()
  const createMutation = useCreateWorkspace()
  const updateMutation = useUpdateWorkspace()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugError, setSlugError] = useState('')

  const [editTarget, setEditTarget] = useState<WorkspaceListItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editSlug, setEditSlug] = useState('')
  const [editSlugError, setEditSlugError] = useState('')

  const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  function handleNameChange(value: string) {
    setName(value)
    const autoSlug = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    setSlug(autoSlug)
    setSlugError('')
  }

  function handleSlugChange(value: string) {
    setSlug(value)
    if (value && !slugRegex.test(value)) {
      setSlugError('Slug must be lowercase letters, numbers, and hyphens only')
    } else {
      setSlugError('')
    }
  }

  async function handleCreate() {
    if (!name.trim() || !slug.trim()) return
    if (!slugRegex.test(slug)) {
      setSlugError('Invalid slug format')
      return
    }
    try {
      const ws = await createMutation.mutateAsync({ name: name.trim(), slug: slug.trim() })
      setDialogOpen(false)
      setName('')
      setSlug('')
      toast('success', `Workspace "${ws.name}" created`)
      navigate(`/workspaces/${ws.id}`)
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  function openEditWorkspace(w: WorkspaceListItem) {
    setEditTarget(w)
    setEditName(w.name)
    setEditSlug(w.slug)
    setEditSlugError('')
  }

  async function handleSaveEdit() {
    if (!editTarget || !editName.trim() || !editSlug.trim()) return
    if (!slugRegex.test(editSlug)) {
      setEditSlugError('Invalid slug format')
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: editTarget.id,
        data: { name: editName.trim(), slug: editSlug.trim() },
      })
      setEditTarget(null)
      toast('success', 'Workspace updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  const columns: Column<WorkspaceListItem>[] = [
    { key: 'name', header: 'Name', render: (w) => <span className="font-medium">{w.name}</span> },
    { key: 'slug', header: 'Slug', render: (w) => <span className="text-gray-500">{w.slug}</span> },
    {
      key: 'fields',
      header: 'Canonical Fields',
      render: (w) => w.canonicalFieldCount,
      className: 'text-center',
    },
    {
      key: 'systems',
      header: 'Systems',
      render: (w) => w.systemCount,
      className: 'text-center',
    },
    {
      key: 'interfaces',
      header: 'Interfaces',
      render: (w) => w.interfaceCount,
      className: 'text-center',
    },
    {
      key: 'actions',
      header: '',
      render: (w) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={(ev) => {
            ev.stopPropagation()
            openEditWorkspace(w)
          }}
        >
          Edit
        </Button>
      ),
      className: 'w-20',
    },
  ]

  if (isLoading) return <Spinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your integration workspaces
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>Create Workspace</Button>
      </div>

      <Table
        columns={columns}
        data={data?.items ?? []}
        keyFn={(w) => w.id}
        onRowClick={(w) => navigate(`/workspaces/${w.id}`)}
        emptyMessage="No workspaces yet. Create one to get started."
      />

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Create Workspace"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!name.trim() || !slug.trim() || !!slugError || createMutation.isPending}
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
            placeholder="My Integration Project"
          />
          <Input
            label="Slug"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            error={slugError}
            placeholder="my-integration-project"
          />
        </div>
      </Dialog>

      {/* Edit workspace dialog */}
      <Dialog
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        title="Edit Workspace"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || !editSlug.trim() || !!editSlugError || updateMutation.isPending}
            >
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input label="Name" value={editName} onChange={(e) => setEditName(e.target.value)} />
          <Input
            label="Slug"
            value={editSlug}
            onChange={(e) => {
              setEditSlug(e.target.value)
              setEditSlugError(
                e.target.value && !slugRegex.test(e.target.value)
                  ? 'Slug must be lowercase letters, numbers, and hyphens only'
                  : ''
              )
            }}
            error={editSlugError}
          />
        </div>
      </Dialog>
    </div>
  )
}
