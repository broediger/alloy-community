import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router'
import {
  useWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '../../hooks/useWorkspaces.js'
import { Button } from '../../components/ui/Button.js'
import { Input } from '../../components/ui/Input.js'
import { Spinner } from '../../components/ui/Spinner.js'
import { ConfirmDialog } from '../../components/ConfirmDialog.js'
import { useToast } from '../../components/ui/Toast.js'
import { getErrorMessage, isApiError } from '../../lib/api.js'
import { api, triggerDownload } from '../../lib/api.js'

export function WorkspaceSettingsPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { data: workspace, isLoading } = useWorkspace(workspaceId)
  const updateMutation = useUpdateWorkspace()
  const deleteMutation = useDeleteWorkspace()

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteDetails, setDeleteDetails] = useState<Array<{ type: string; count: number }>>([])
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    if (workspace) {
      setName(workspace.name)
      setSlug(workspace.slug)
    }
  }, [workspace])

  if (isLoading) return <Spinner />
  if (!workspace || !workspaceId) return <div className="text-gray-500">Workspace not found</div>

  async function handleSave() {
    try {
      await updateMutation.mutateAsync({ id: workspaceId!, data: { name, slug } })
      toast('success', 'Workspace updated')
    } catch (err) {
      toast('error', getErrorMessage(err))
    }
  }

  async function handleDelete() {
    try {
      await deleteMutation.mutateAsync(workspaceId!)
      toast('success', 'Workspace deleted')
      navigate('/')
    } catch (err) {
      if (isApiError(err) && err.error.code === 'DELETE_CONFLICT') {
        setDeleteError(err.error.message)
        const details = (err.error.details ?? []) as Array<{ type: string; count: number }>
        setDeleteDetails(details)
      } else {
        toast('error', getErrorMessage(err))
        setDeleteOpen(false)
      }
    }
  }

  async function handleExportWorkspace() {
    setExporting(true)
    try {
      const blob = await api.export.workspace(workspaceId!)
      const date = new Date().toISOString().slice(0, 10)
      triggerDownload(blob, `workspace-${workspace!.slug}-${date}.json`)
      toast('success', 'Workspace exported')
    } catch (err) {
      toast('error', getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Workspace Settings</h1>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General</h2>
        <div className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Export</h2>
        <p className="text-sm text-gray-600 mb-4">
          Download a full JSON dump of this workspace for backup or migration.
        </p>
        <Button variant="secondary" onClick={handleExportWorkspace} disabled={exporting}>
          {exporting ? 'Exporting...' : 'Export Workspace'}
        </Button>
      </div>

      <div className="bg-white border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm text-gray-600 mb-4">
          Deleting a workspace removes all data permanently. This cannot be undone.
        </p>
        <Button
          variant="danger"
          onClick={() => {
            setDeleteError(null)
            setDeleteDetails([])
            setDeleteOpen(true)
          }}
        >
          Delete Workspace
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Delete Workspace"
        confirmLabel="Delete"
        loading={deleteMutation.isPending}
      >
        {deleteError ? (
          <div>
            <p className="text-sm text-red-600 mb-3">{deleteError}</p>
            {deleteDetails.length > 0 && (
              <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                {deleteDetails.map((d) => (
                  <li key={d.type}>
                    {d.count} {d.type}
                  </li>
                ))}
              </ul>
            )}
            <p className="text-sm text-gray-500 mt-3">
              Please remove these items before deleting the workspace.
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-600">
            Are you sure you want to delete <strong>{workspace.name}</strong>? This action cannot be
            undone.
          </p>
        )}
      </ConfirmDialog>
    </div>
  )
}
