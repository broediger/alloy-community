import type {
  ListResponse,
  Workspace,
  WorkspaceListItem,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  CanonicalEntity,
  CanonicalEntityListItem,
  CreateCanonicalEntityInput,
  UpdateCanonicalEntityInput,
  CanonicalFieldListItem,
  CanonicalFieldDetail,
  CreateCanonicalFieldInput,
  UpdateCanonicalFieldInput,
  CanonicalFieldFilters,
  CanonicalSubfield,
  CreateCanonicalSubfieldInput,
  UpdateCanonicalSubfieldInput,
  CanonicalEnumValue,
  CreateCanonicalEnumValueInput,
  UpdateCanonicalEnumValueInput,
  SystemListItem,
  SystemDetail,
  CreateSystemInput,
  UpdateSystemInput,
  SystemEntityListItem,
  SystemEntityDetail,
  CreateSystemEntityInput,
  UpdateSystemEntityInput,
  SystemField,
  SystemFieldDetail,
  CreateSystemFieldInput,
  UpdateSystemFieldInput,
  SystemFieldFilters,
  Mapping,
  MappingDetail,
  CreateMappingInput,
  UpdateMappingInput,
  MappingFilters,
  PutTransformationRuleInput,
  PropagationChain,
  PropagationChainDetail,
  CreatePropagationChainInput,
  CreatePropagationChainStepInput,
  InterfaceListItem,
  InterfaceDetail,
  CreateInterfaceInput,
  UpdateInterfaceInput,
  CreateInterfaceFieldInput,
  UpdateInterfaceFieldInput,
  InterfaceVersionListItem,
  InterfaceVersionDetail,
  InterfaceVersionDiff,
  CutInterfaceVersionInput,
  UpdateInterfaceVersionStatusInput,
  ExcelImportResult,
  ChatMessageResult,
  HelperRunResult,
  TraceResponse,
  ExportOpenApiInput,
  ExportJsonSchemaInput,
  ApiErrorResponse,
  MeResponse,
  MyWorkspaceItem,
  MemberListItem,
  MemberRole,
  InvitationListItem,
} from './types.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export type { ApiErrorResponse as ApiError }

// Auth token getter — set by AuthProvider on mount.
// Returns null in dev-bypass mode (backend's AUTH_DEV_USER_EMAIL handles identity).
let authTokenGetter: (() => Promise<string | null>) | null = null
export function setAuthTokenGetter(fn: () => Promise<string | null>) {
  authTokenGetter = fn
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { ...options?.headers as Record<string, string> }
  if (options?.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }
  if (authTokenGetter) {
    const token = await authTokenGetter()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse
    throw body
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

async function requestBlob(path: string, options?: RequestInit): Promise<Blob> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (authTokenGetter) {
    const token = await authTokenGetter()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const body = (await response.json()) as ApiErrorResponse
    throw body
  }

  return response.blob()
}

function buildQuery(params: object): string {
  const entries = Object.entries(params).filter(
    (entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1] !== ''
  )
  if (entries.length === 0) return ''
  return '?' + new URLSearchParams(entries).toString()
}

const w = (wId: string) => `/api/v1/workspaces/${wId}`

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  // ── Current user ──
  me: {
    get: () => request<MeResponse>('/api/v1/me'),
    workspaces: () =>
      request<ListResponse<MyWorkspaceItem>>('/api/v1/me/workspaces'),
  },

  // ── Members ──
  members: {
    list: (wId: string) =>
      request<ListResponse<MemberListItem>>(`${w(wId)}/members`),
    updateRole: (wId: string, userId: string, role: MemberRole) =>
      request<unknown>(`${w(wId)}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      }),
    remove: (wId: string, userId: string) =>
      request<void>(`${w(wId)}/members/${userId}`, { method: 'DELETE' }),
  },

  // ── Invitations ──
  invitations: {
    list: (wId: string) =>
      request<ListResponse<InvitationListItem>>(`${w(wId)}/invitations`),
    create: (wId: string, data: { email: string; role: MemberRole }) =>
      request<InvitationListItem>(`${w(wId)}/invitations`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revoke: (wId: string, id: string) =>
      request<void>(`${w(wId)}/invitations/${id}`, { method: 'DELETE' }),
    accept: (token: string) =>
      request<InvitationListItem>('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }),
  },

  // ── Workspaces ──
  workspaces: {
    list: () => request<ListResponse<WorkspaceListItem>>('/api/v1/workspaces'),
    get: (id: string) => request<Workspace>(`/api/v1/workspaces/${id}`),
    create: (data: CreateWorkspaceInput) =>
      request<Workspace>('/api/v1/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: UpdateWorkspaceInput) =>
      request<Workspace>(`/api/v1/workspaces/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (id: string) =>
      request<void>(`/api/v1/workspaces/${id}`, { method: 'DELETE' }),
  },

  // ── Canonical Entities ──
  canonicalEntities: {
    list: (wId: string) =>
      request<ListResponse<CanonicalEntityListItem>>(`${w(wId)}/canonical-entities`),
    get: (wId: string, eId: string) =>
      request<CanonicalEntity>(`${w(wId)}/canonical-entities/${eId}`),
    create: (wId: string, data: CreateCanonicalEntityInput) =>
      request<CanonicalEntity>(`${w(wId)}/canonical-entities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, eId: string, data: UpdateCanonicalEntityInput) =>
      request<CanonicalEntity>(`${w(wId)}/canonical-entities/${eId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, eId: string) =>
      request<void>(`${w(wId)}/canonical-entities/${eId}`, { method: 'DELETE' }),
  },

  // ── Canonical Fields ──
  canonicalFields: {
    list: (wId: string, filters?: CanonicalFieldFilters) =>
      request<ListResponse<CanonicalFieldListItem>>(
        `${w(wId)}/canonical-fields${buildQuery(filters ?? {})}`
      ),
    get: (wId: string, fId: string) =>
      request<CanonicalFieldDetail>(`${w(wId)}/canonical-fields/${fId}`),
    create: (wId: string, data: CreateCanonicalFieldInput) =>
      request<CanonicalFieldDetail>(`${w(wId)}/canonical-fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, fId: string, data: UpdateCanonicalFieldInput) =>
      request<CanonicalFieldDetail>(`${w(wId)}/canonical-fields/${fId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, fId: string) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}`, { method: 'DELETE' }),
  },

  // ── Canonical Subfields ──
  canonicalSubfields: {
    list: (wId: string, fId: string) =>
      request<CanonicalSubfield[]>(`${w(wId)}/canonical-fields/${fId}/subfields`),
    create: (wId: string, fId: string, data: CreateCanonicalSubfieldInput) =>
      request<CanonicalSubfield>(`${w(wId)}/canonical-fields/${fId}/subfields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, fId: string, sfId: string, data: UpdateCanonicalSubfieldInput) =>
      request<CanonicalSubfield>(`${w(wId)}/canonical-fields/${fId}/subfields/${sfId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, fId: string, sfId: string) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}/subfields/${sfId}`, { method: 'DELETE' }),
    reorder: (wId: string, fId: string, ids: string[]) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}/subfields/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      }),
  },

  // ── Canonical Field Examples ──
  canonicalFieldExamples: {
    create: (wId: string, fId: string, value: string) =>
      request<{ id: string; canonicalFieldId: string; value: string; createdAt: string }>(
        `${w(wId)}/canonical-fields/${fId}/examples`,
        { method: 'POST', body: JSON.stringify({ value }) }
      ),
    delete: (wId: string, fId: string, exId: string) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}/examples/${exId}`, { method: 'DELETE' }),
  },

  // ── Canonical Enum Values ──
  canonicalEnumValues: {
    list: (wId: string, fId: string) =>
      request<CanonicalEnumValue[]>(`${w(wId)}/canonical-fields/${fId}/enum-values`),
    create: (wId: string, fId: string, data: CreateCanonicalEnumValueInput) =>
      request<CanonicalEnumValue>(`${w(wId)}/canonical-fields/${fId}/enum-values`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, fId: string, evId: string, data: UpdateCanonicalEnumValueInput) =>
      request<CanonicalEnumValue>(`${w(wId)}/canonical-fields/${fId}/enum-values/${evId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, fId: string, evId: string) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}/enum-values/${evId}`, { method: 'DELETE' }),
    reorder: (wId: string, fId: string, ids: string[]) =>
      request<void>(`${w(wId)}/canonical-fields/${fId}/enum-values/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      }),
  },

  // ── Systems ──
  systems: {
    list: (wId: string) => request<ListResponse<SystemListItem>>(`${w(wId)}/systems`),
    get: (wId: string, sId: string) => request<SystemDetail>(`${w(wId)}/systems/${sId}`),
    create: (wId: string, data: CreateSystemInput) =>
      request<SystemDetail>(`${w(wId)}/systems`, { method: 'POST', body: JSON.stringify(data) }),
    update: (wId: string, sId: string, data: UpdateSystemInput) =>
      request<SystemDetail>(`${w(wId)}/systems/${sId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, sId: string) =>
      request<void>(`${w(wId)}/systems/${sId}`, { method: 'DELETE' }),
  },

  // ── System Entities ──
  systemEntities: {
    list: (wId: string, sId: string) =>
      request<ListResponse<SystemEntityListItem>>(`${w(wId)}/systems/${sId}/entities`),
    get: (wId: string, sId: string, eId: string) =>
      request<SystemEntityDetail>(`${w(wId)}/systems/${sId}/entities/${eId}`),
    create: (wId: string, sId: string, data: CreateSystemEntityInput) =>
      request<SystemEntityDetail>(`${w(wId)}/systems/${sId}/entities`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, sId: string, eId: string, data: UpdateSystemEntityInput) =>
      request<SystemEntityDetail>(`${w(wId)}/systems/${sId}/entities/${eId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, sId: string, eId: string) =>
      request<void>(`${w(wId)}/systems/${sId}/entities/${eId}`, { method: 'DELETE' }),
  },

  // ── System Fields ──
  systemFields: {
    list: (wId: string, filters?: SystemFieldFilters) =>
      request<ListResponse<SystemField>>(`${w(wId)}/system-fields${buildQuery(filters ?? {})}`),
    get: (wId: string, sfId: string) =>
      request<SystemFieldDetail>(`${w(wId)}/system-fields/${sfId}`),
    create: (wId: string, data: CreateSystemFieldInput) =>
      request<SystemField>(`${w(wId)}/system-fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, sfId: string, data: UpdateSystemFieldInput) =>
      request<SystemField>(`${w(wId)}/system-fields/${sfId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, sfId: string) =>
      request<void>(`${w(wId)}/system-fields/${sfId}`, { method: 'DELETE' }),
  },

  // ── Mappings ──
  mappings: {
    list: (wId: string, filters?: MappingFilters) =>
      request<ListResponse<Mapping>>(`${w(wId)}/mappings${buildQuery(filters ?? {})}`),
    get: (wId: string, mId: string) => request<MappingDetail>(`${w(wId)}/mappings/${mId}`),
    create: (wId: string, data: CreateMappingInput) =>
      request<Mapping>(`${w(wId)}/mappings`, { method: 'POST', body: JSON.stringify(data) }),
    update: (wId: string, mId: string, data: UpdateMappingInput) =>
      request<Mapping>(`${w(wId)}/mappings/${mId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, mId: string) =>
      request<void>(`${w(wId)}/mappings/${mId}`, { method: 'DELETE' }),
  },

  // ── Transformation Rules ──
  transformationRules: {
    put: (wId: string, mId: string, data: PutTransformationRuleInput) =>
      request<unknown>(`${w(wId)}/mappings/${mId}/rule`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    seedFromEnum: (wId: string, mId: string) =>
      request<unknown>(`${w(wId)}/mappings/${mId}/rule/seed-from-enum`, {
        method: 'POST',
      }),
    delete: (wId: string, mId: string) =>
      request<void>(`${w(wId)}/mappings/${mId}/rule`, { method: 'DELETE' }),
  },

  // ── Propagation Chains ──
  propagationChains: {
    list: (wId: string, filters?: { canonicalFieldId?: string; systemId?: string }) =>
      request<ListResponse<PropagationChain>>(
        `${w(wId)}/propagation-chains${buildQuery(filters ?? {})}`
      ),
    get: (wId: string, cId: string) =>
      request<PropagationChainDetail>(`${w(wId)}/propagation-chains/${cId}`),
    create: (wId: string, data: CreatePropagationChainInput) =>
      request<PropagationChain>(`${w(wId)}/propagation-chains`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, cId: string) =>
      request<void>(`${w(wId)}/propagation-chains/${cId}`, { method: 'DELETE' }),
    createStep: (wId: string, cId: string, data: CreatePropagationChainStepInput) =>
      request<unknown>(`${w(wId)}/propagation-chains/${cId}/steps`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteStep: (wId: string, cId: string, stepId: string) =>
      request<void>(`${w(wId)}/propagation-chains/${cId}/steps/${stepId}`, { method: 'DELETE' }),
    reorderSteps: (wId: string, cId: string, ids: string[]) =>
      request<void>(`${w(wId)}/propagation-chains/${cId}/steps/reorder`, {
        method: 'PUT',
        body: JSON.stringify({ ids }),
      }),
  },

  // ── Interfaces ──
  interfaces: {
    list: (wId: string) => request<ListResponse<InterfaceListItem>>(`${w(wId)}/interfaces`),
    get: (wId: string, iId: string) => request<InterfaceDetail>(`${w(wId)}/interfaces/${iId}`),
    create: (wId: string, data: CreateInterfaceInput) =>
      request<InterfaceDetail>(`${w(wId)}/interfaces`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (wId: string, iId: string, data: UpdateInterfaceInput) =>
      request<InterfaceDetail>(`${w(wId)}/interfaces/${iId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    delete: (wId: string, iId: string) =>
      request<void>(`${w(wId)}/interfaces/${iId}`, { method: 'DELETE' }),
    createField: (wId: string, iId: string, data: CreateInterfaceFieldInput) =>
      request<unknown>(`${w(wId)}/interfaces/${iId}/fields`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateField: (wId: string, iId: string, ifId: string, data: UpdateInterfaceFieldInput) =>
      request<unknown>(`${w(wId)}/interfaces/${iId}/fields/${ifId}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    deleteField: (wId: string, iId: string, ifId: string) =>
      request<void>(`${w(wId)}/interfaces/${iId}/fields/${ifId}`, { method: 'DELETE' }),
    // Versions
    listVersions: (wId: string, iId: string) =>
      request<ListResponse<InterfaceVersionListItem>>(`${w(wId)}/interfaces/${iId}/versions`),
    getVersion: (wId: string, iId: string, vId: string) =>
      request<InterfaceVersionDetail>(`${w(wId)}/interfaces/${iId}/versions/${vId}`),
    getVersionDiff: (wId: string, iId: string, vId: string) =>
      request<InterfaceVersionDiff>(`${w(wId)}/interfaces/${iId}/versions/${vId}/diff`),
    cutVersion: (wId: string, iId: string, data: CutInterfaceVersionInput) =>
      request<InterfaceVersionListItem>(`${w(wId)}/interfaces/${iId}/versions`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateVersionStatus: (wId: string, iId: string, vId: string, data: UpdateInterfaceVersionStatusInput) =>
      request<InterfaceVersionListItem>(`${w(wId)}/interfaces/${iId}/versions/${vId}/status`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  // ── Trace ──
  trace: {
    get: (wId: string, canonicalFieldId: string) =>
      request<TraceResponse>(`${w(wId)}/trace/${canonicalFieldId}`),
  },

  // ── Export ──
  export: {
    openapi: (wId: string, data: ExportOpenApiInput) =>
      requestBlob(`${w(wId)}/export/openapi`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    jsonSchema: (wId: string, data: ExportJsonSchemaInput) =>
      requestBlob(`${w(wId)}/export/json-schema`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    workspace: (wId: string) => requestBlob(`${w(wId)}/export/workspace`),
    interfaceExcel: (wId: string, iId: string) =>
      requestBlob(`${w(wId)}/export/interface-excel/${iId}`),
  },

  // ── Agents ──
  agents: {
    chat: (wId: string, data: { threadId?: string; message: string }) =>
      request<ChatMessageResult>(`${w(wId)}/agents/chat/message`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    confirmAction: (wId: string, data: { threadId: string; tool: string; args: any }) =>
      request<{ ok: true; result: { issue?: { number: number; url: string } } }>(
        `${w(wId)}/agents/chat/confirm`,
        { method: 'POST', body: JSON.stringify(data) }
      ),
    helperRun: (wId: string, data: { scope: 'workspace' | 'system' | 'entity'; scopeId?: string }) =>
      request<HelperRunResult>(`${w(wId)}/agents/helper/run`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  // ── Import ──
  import: {
    interfaceExcel: (wId: string, iId: string, file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return request<ExcelImportResult>(`${w(wId)}/import/interface-excel/${iId}`, {
        method: 'POST',
        body: formData,
      })
    },
  },
}

export function isApiError(err: unknown): err is ApiErrorResponse {
  return (
    typeof err === 'object' &&
    err !== null &&
    'error' in err &&
    typeof (err as ApiErrorResponse).error?.code === 'string'
  )
}

export function getErrorMessage(err: unknown): string {
  if (isApiError(err)) {
    return err.error.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'An unexpected error occurred'
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
