import { useParams, useNavigate } from 'react-router'
import { useWorkspace } from '../../hooks/useWorkspaces.js'
import { useCanonicalEntities } from '../../hooks/useCanonical.js'
import { useSystems } from '../../hooks/useSystems.js'
import { useInterfaces } from '../../hooks/useInterfaces.js'
import { Spinner } from '../../components/ui/Spinner.js'

export function WorkspaceDashboardPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { data: workspace, isLoading } = useWorkspace(workspaceId)
  const { data: entities } = useCanonicalEntities(workspaceId)
  const { data: systems } = useSystems(workspaceId)
  const { data: interfaces } = useInterfaces(workspaceId)

  if (isLoading) return <Spinner />
  if (!workspace) return <div className="text-gray-500">Workspace not found</div>

  const cards = [
    {
      label: 'Canonical Entities',
      value: entities?.total ?? 0,
      path: 'canonical',
    },
    {
      label: 'Systems',
      value: systems?.total ?? 0,
      path: 'systems',
    },
    {
      label: 'Interfaces',
      value: interfaces?.total ?? 0,
      path: 'interfaces',
    },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
        <p className="text-sm text-gray-500 mt-1">/{workspace.slug}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => navigate(`/workspaces/${workspaceId}/${card.path}`)}
            className="bg-white border border-gray-200 rounded-lg p-6 text-left hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer"
          >
            <p className="text-sm font-medium text-gray-500">{card.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{card.value}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
