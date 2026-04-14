import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type {
  CreateInterfaceInput,
  UpdateInterfaceInput,
  CreateInterfaceFieldInput,
  UpdateInterfaceFieldInput,
} from '../lib/types.js'

export function useInterfaces(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['interfaces', { workspaceId }],
    queryFn: () => api.interfaces.list(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useInterface(workspaceId: string | undefined, interfaceId: string | undefined) {
  return useQuery({
    queryKey: ['interfaces', workspaceId, interfaceId],
    queryFn: () => api.interfaces.get(workspaceId!, interfaceId!),
    enabled: !!workspaceId && !!interfaceId,
  })
}

export function useCreateInterface(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInterfaceInput) => api.interfaces.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateInterface(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ interfaceId, data }: { interfaceId: string; data: UpdateInterfaceInput }) =>
      api.interfaces.update(workspaceId, interfaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces'] })
    },
  })
}

export function useDeleteInterface(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (interfaceId: string) => api.interfaces.delete(workspaceId, interfaceId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useCreateInterfaceField(workspaceId: string, interfaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateInterfaceFieldInput) =>
      api.interfaces.createField(workspaceId, interfaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces', workspaceId, interfaceId] })
    },
  })
}

export function useUpdateInterfaceField(workspaceId: string, interfaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: UpdateInterfaceFieldInput }) =>
      api.interfaces.updateField(workspaceId, interfaceId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces', workspaceId, interfaceId] })
    },
  })
}

export function useDeleteInterfaceField(workspaceId: string, interfaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) =>
      api.interfaces.deleteField(workspaceId, interfaceId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['interfaces', workspaceId, interfaceId] })
    },
  })
}

