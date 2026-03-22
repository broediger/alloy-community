import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from '../lib/types.js'

export function useWorkspaces() {
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: () => api.workspaces.list(),
  })
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: ['workspaces', id],
    queryFn: () => api.workspaces.get(id!),
    enabled: !!id,
  })
}

export function useCreateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateWorkspaceInput) => api.workspaces.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateWorkspaceInput }) =>
      api.workspaces.update(id, data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      qc.invalidateQueries({ queryKey: ['workspaces', id] })
    },
  })
}

export function useDeleteWorkspace() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.workspaces.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}
