import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type {
  CreateSystemInput,
  UpdateSystemInput,
  CreateSystemEntityInput,
  UpdateSystemEntityInput,
  CreateSystemFieldInput,
  UpdateSystemFieldInput,
  SystemFieldFilters,
} from '../lib/types.js'

// ── Systems ──

export function useSystems(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['systems', { workspaceId }],
    queryFn: () => api.systems.list(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useSystem(workspaceId: string | undefined, systemId: string | undefined) {
  return useQuery({
    queryKey: ['systems', workspaceId, systemId],
    queryFn: () => api.systems.get(workspaceId!, systemId!),
    enabled: !!workspaceId && !!systemId,
  })
}

export function useCreateSystem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSystemInput) => api.systems.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['systems'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

export function useUpdateSystem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ systemId, data }: { systemId: string; data: UpdateSystemInput }) =>
      api.systems.update(workspaceId, systemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

export function useDeleteSystem(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (systemId: string) => api.systems.delete(workspaceId, systemId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['systems'] })
      qc.invalidateQueries({ queryKey: ['workspaces'] })
    },
  })
}

// ── System Entities ──

export function useSystemEntities(workspaceId: string | undefined, systemId: string | undefined) {
  return useQuery({
    queryKey: ['system-entities', { workspaceId, systemId }],
    queryFn: () => api.systemEntities.list(workspaceId!, systemId!),
    enabled: !!workspaceId && !!systemId,
  })
}

export function useSystemEntity(
  workspaceId: string | undefined,
  systemId: string | undefined,
  entityId: string | undefined
) {
  return useQuery({
    queryKey: ['system-entities', workspaceId, systemId, entityId],
    queryFn: () => api.systemEntities.get(workspaceId!, systemId!, entityId!),
    enabled: !!workspaceId && !!systemId && !!entityId,
  })
}

export function useCreateSystemEntity(workspaceId: string, systemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSystemEntityInput) =>
      api.systemEntities.create(workspaceId, systemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

export function useUpdateSystemEntity(workspaceId: string, systemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: UpdateSystemEntityInput }) =>
      api.systemEntities.update(workspaceId, systemId, entityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-entities'] })
    },
  })
}

export function useDeleteSystemEntity(workspaceId: string, systemId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entityId: string) =>
      api.systemEntities.delete(workspaceId, systemId, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

// ── System Fields ──

export function useSystemFields(workspaceId: string | undefined, filters?: SystemFieldFilters) {
  return useQuery({
    queryKey: ['system-fields', { workspaceId, ...filters }],
    queryFn: () => api.systemFields.list(workspaceId!, filters),
    enabled: !!workspaceId,
  })
}

export function useSystemField(workspaceId: string | undefined, fieldId: string | undefined) {
  return useQuery({
    queryKey: ['system-fields', workspaceId, fieldId],
    queryFn: () => api.systemFields.get(workspaceId!, fieldId!),
    enabled: !!workspaceId && !!fieldId,
  })
}

export function useCreateSystemField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateSystemFieldInput) => api.systemFields.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-fields'] })
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

export function useUpdateSystemField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: UpdateSystemFieldInput }) =>
      api.systemFields.update(workspaceId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-fields'] })
      qc.invalidateQueries({ queryKey: ['system-entities'] })
    },
  })
}

export function useDeleteSystemField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) => api.systemFields.delete(workspaceId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['system-fields'] })
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}
