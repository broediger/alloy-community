import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Dialog } from '../../components/ui/Dialog.js'
import { Button } from '../../components/ui/Button.js'
import { Badge } from '../../components/ui/Badge.js'
import { api, getErrorMessage } from '../../lib/api.js'
import type { ExcelImportResult } from '../../lib/types.js'

interface ExcelImportDialogProps {
  open: boolean
  onClose: () => void
  workspaceId: string
  interfaceId: string
}

export function ExcelImportDialog({ open, onClose, workspaceId, interfaceId }: ExcelImportDialogProps) {
  const qc = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<ExcelImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const importMutation = useMutation({
    mutationFn: (f: File) => api.import.interfaceExcel(workspaceId, interfaceId, f),
    onSuccess: (data) => {
      setResult(data)
      if (data.errors.length === 0) {
        qc.invalidateQueries({ queryKey: ['interfaces', workspaceId, interfaceId] })
      }
    },
    onError: (err) => {
      setError(getErrorMessage(err))
    },
  })

  function handleClose() {
    setFile(null)
    setResult(null)
    setError(null)
    onClose()
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) {
      setFile(f)
      setResult(null)
      setError(null)
    }
  }

  function handleImport() {
    if (!file) return
    importMutation.mutate(file)
  }

  const hasErrors = result && result.errors.length > 0
  const hasWarnings = result && result.warnings.length > 0
  const isSuccess = result && result.errors.length === 0

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      title="Import Interface from Excel"
      wide
      footer={
        <>
          <Button variant="secondary" onClick={handleClose}>
            {isSuccess ? 'Done' : 'Cancel'}
          </Button>
          {!result && (
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
            >
              {importMutation.isPending ? 'Importing...' : 'Import'}
            </Button>
          )}
        </>
      }
    >
      {/* File picker */}
      {!result && !error && (
        <div className="space-y-4">
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx"
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div>
                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                <p className="text-xs text-gray-500 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-500">Click to select an .xlsx file</p>
                <p className="text-xs text-gray-400 mt-1">Must be an Interface Manager export file</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
          {/* Summary */}
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="success">{result.created}</Badge>
              <span className="text-sm text-gray-600">created</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info">{result.updated}</Badge>
              <span className="text-sm text-gray-600">updated</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default">{result.unchanged}</Badge>
              <span className="text-sm text-gray-600">unchanged</span>
            </div>
          </div>

          {/* Errors */}
          {hasErrors && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <p className="text-sm font-medium text-red-800">
                  {result.errors.length} error{result.errors.length > 1 ? 's' : ''} — import was rejected
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-red-100">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <span className="text-red-600 font-mono">Row {e.row}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-600">{e.field}:</span>
                    <span className="text-red-700 ml-1">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {hasWarnings && (
            <div className="border border-yellow-200 rounded-lg overflow-hidden">
              <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200">
                <p className="text-sm font-medium text-yellow-800">
                  {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-yellow-100">
                {result.warnings.map((w, i) => (
                  <div key={i} className="px-4 py-2 text-sm">
                    <span className="text-yellow-600 font-mono">Row {w.row}</span>
                    <span className="text-gray-400 mx-2">|</span>
                    <span className="text-gray-600">{w.field}:</span>
                    <span className="text-yellow-700 ml-1">{w.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isSuccess && !hasWarnings && (
            <p className="text-sm text-green-700">Import completed successfully.</p>
          )}
        </div>
      )}
    </Dialog>
  )
}
