import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api.js'
import type {
  CreateCanonicalEntityInput,
  UpdateCanonicalEntityInput,
  CreateCanonicalFieldInput,
  UpdateCanonicalFieldInput,
  CanonicalFieldFilters,
  CreateCanonicalSubfieldInput,
  UpdateCanonicalSubfieldInput,
  CreateCanonicalEnumValueInput,
  UpdateCanonicalEnumValueInput,
} from '../lib/types.js'

// ── Entities ──

export function useCanonicalEntities(workspaceId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-entities', { workspaceId }],
    queryFn: () => api.canonicalEntities.list(workspaceId!),
    enabled: !!workspaceId,
  })
}

export function useCanonicalEntity(workspaceId: string | undefined, entityId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-entities', workspaceId, entityId],
    queryFn: () => api.canonicalEntities.get(workspaceId!, entityId!),
    enabled: !!workspaceId && !!entityId,
  })
}

export function useCreateCanonicalEntity(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCanonicalEntityInput) =>
      api.canonicalEntities.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-entities', { workspaceId }] })
    },
  })
}

export function useUpdateCanonicalEntity(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ entityId, data }: { entityId: string; data: UpdateCanonicalEntityInput }) =>
      api.canonicalEntities.update(workspaceId, entityId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-entities'] })
    },
  })
}

export function useDeleteCanonicalEntity(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (entityId: string) => api.canonicalEntities.delete(workspaceId, entityId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-entities'] })
    },
  })
}

// ── Fields ──

export function useCanonicalFields(
  workspaceId: string | undefined,
  filters?: CanonicalFieldFilters
) {
  return useQuery({
    queryKey: ['canonical-fields', { workspaceId, ...filters }],
    queryFn: () => api.canonicalFields.list(workspaceId!, filters),
    enabled: !!workspaceId,
  })
}

export function useCanonicalField(workspaceId: string | undefined, fieldId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-fields', workspaceId, fieldId],
    queryFn: () => api.canonicalFields.get(workspaceId!, fieldId!),
    enabled: !!workspaceId && !!fieldId,
  })
}

export function useCreateCanonicalField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCanonicalFieldInput) =>
      api.canonicalFields.create(workspaceId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-fields'] })
      qc.invalidateQueries({ queryKey: ['canonical-entities'] })
    },
  })
}

export function useUpdateCanonicalField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ fieldId, data }: { fieldId: string; data: UpdateCanonicalFieldInput }) =>
      api.canonicalFields.update(workspaceId, fieldId, data),
    onSuccess: (_data, { fieldId }) => {
      qc.invalidateQueries({ queryKey: ['canonical-fields'] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useDeleteCanonicalField(workspaceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (fieldId: string) => api.canonicalFields.delete(workspaceId, fieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-fields'] })
      qc.invalidateQueries({ queryKey: ['canonical-entities'] })
    },
  })
}

// ── Subfields ──

export function useCanonicalSubfields(workspaceId: string | undefined, fieldId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-subfields', workspaceId, fieldId],
    queryFn: () => api.canonicalSubfields.list(workspaceId!, fieldId!),
    enabled: !!workspaceId && !!fieldId,
  })
}

export function useCreateCanonicalSubfield(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCanonicalSubfieldInput) =>
      api.canonicalSubfields.create(workspaceId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-subfields', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useUpdateCanonicalSubfield(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      subfieldId,
      data,
    }: {
      subfieldId: string
      data: UpdateCanonicalSubfieldInput
    }) => api.canonicalSubfields.update(workspaceId, fieldId, subfieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-subfields', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useDeleteCanonicalSubfield(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (subfieldId: string) =>
      api.canonicalSubfields.delete(workspaceId, fieldId, subfieldId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-subfields', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useReorderCanonicalSubfields(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) => api.canonicalSubfields.reorder(workspaceId, fieldId, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-subfields', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

// ── Examples ──

export function useCreateCanonicalFieldExample(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (value: string) =>
      api.canonicalFieldExamples.create(workspaceId, fieldId, value),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useDeleteCanonicalFieldExample(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (exId: string) =>
      api.canonicalFieldExamples.delete(workspaceId, fieldId, exId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

// ── Enum Values ──

export function useCanonicalEnumValues(workspaceId: string | undefined, fieldId: string | undefined) {
  return useQuery({
    queryKey: ['canonical-enum-values', workspaceId, fieldId],
    queryFn: () => api.canonicalEnumValues.list(workspaceId!, fieldId!),
    enabled: !!workspaceId && !!fieldId,
  })
}

export function useCreateCanonicalEnumValue(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateCanonicalEnumValueInput) =>
      api.canonicalEnumValues.create(workspaceId, fieldId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-enum-values', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useUpdateCanonicalEnumValue(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      enumValueId,
      data,
    }: {
      enumValueId: string
      data: UpdateCanonicalEnumValueInput
    }) => api.canonicalEnumValues.update(workspaceId, fieldId, enumValueId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-enum-values', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useDeleteCanonicalEnumValue(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enumValueId: string) =>
      api.canonicalEnumValues.delete(workspaceId, fieldId, enumValueId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-enum-values', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}

export function useReorderCanonicalEnumValues(workspaceId: string, fieldId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (ids: string[]) =>
      api.canonicalEnumValues.reorder(workspaceId, fieldId, ids),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['canonical-enum-values', workspaceId, fieldId] })
      qc.invalidateQueries({ queryKey: ['canonical-fields', workspaceId, fieldId] })
    },
  })
}
