import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api.js'

export function useTrace(workspaceId: string | undefined, canonicalFieldId: string | undefined) {
  return useQuery({
    queryKey: ['trace', workspaceId, canonicalFieldId],
    queryFn: () => api.trace.get(workspaceId!, canonicalFieldId!),
    enabled: !!workspaceId && !!canonicalFieldId,
  })
}
