import { Dialog } from './ui/Dialog.js'
import { Button } from './ui/Button.js'
import type { ReactNode } from 'react'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  children: ReactNode
  confirmLabel?: string
  confirmVariant?: 'primary' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  confirmVariant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={onConfirm} disabled={loading}>
            {loading ? 'Processing...' : confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Dialog>
  )
}
