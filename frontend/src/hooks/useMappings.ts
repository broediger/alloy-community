import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type {
  CreateMappingInput,
  UpdateMappingInput,
  MappingFilters,
  PutTransformationRuleInput,
} from '../lib/types.js'

export function useMappings(workspaceId: string | undefined, filters?: MappingFilters) {
  return useQuery({
    queryKey: ['mappings', { workspaceId, ...filters }],
    queryFn: () => api.mappings.list(workspaceId!, filters),
    enabled: !!workspaceId,
  })
}

export function useMapping(workspaceId: string | undefined, mappingId: string | undefined) {
  return useQuery({
    queryKey: ['mappings', workspaceId, mappingId],
    queryFn: () => api.mappings.get(workspaceId!, mappingId!),
    enabled: !!workspaceId && !!mappingId,
  })
}

export function useCreateMapping(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateMappingInput) => api.mappings.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
      qc.invalidateQueries({ queryKey: ['canonical-fields'] })
      qc.invalidateQueries({ queryKey: ['system-fields'] })
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

export function useUpdateMapping(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ mappingId, data }: { mappingId: string; data: UpdateMappingInput }) =>
      api.mappings.update(workspaceId, mappingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
    },
  })
}

export function useDeleteMapping(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mappingId: string) => api.mappings.delete(workspaceId, mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
      qc.invalidateQueries({ queryKey: ['canonical-fields'] })
      qc.invalidateQueries({ queryKey: ['system-fields'] })
      qc.invalidateQueries({ queryKey: ['system-entities'] })
      qc.invalidateQueries({ queryKey: ['systems'] })
    },
  })
}

export function usePutTransformationRule(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      mappingId,
      data,
    }: {
      mappingId: string
      data: PutTransformationRuleInput
    }) => api.transformationRules.put(workspaceId, mappingId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
    },
  })
}

export function useSeedTransformationRuleFromEnum(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mappingId: string) => api.transformationRules.seedFromEnum(workspaceId, mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
    },
  })
}

export function useDeleteTransformationRule(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (mappingId: string) => api.transformationRules.delete(workspaceId, mappingId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['mappings'] })
    },
  })
}
