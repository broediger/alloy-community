import { Routes, Route, Navigate } from 'react-router'
import { Layout } from './components/Layout.js'
import { WorkspaceListPage } from './pages/workspaces/WorkspaceListPage.js'
import { WorkspaceDashboardPage } from './pages/workspaces/WorkspaceDashboardPage.js'
import { WorkspaceSettingsPage } from './pages/workspaces/WorkspaceSettingsPage.js'
import { CanonicalEntityListPage } from './pages/canonical/CanonicalEntityListPage.js'
import { CanonicalEntityDetailPage } from './pages/canonical/CanonicalEntityDetailPage.js'
import { CanonicalFieldDetailPage } from './pages/canonical/CanonicalFieldDetailPage.js'
import { SystemListPage } from './pages/systems/SystemListPage.js'
import { SystemDetailPage } from './pages/systems/SystemDetailPage.js'
import { SystemEntityDetailPage } from './pages/systems/SystemEntityDetailPage.js'
import { MappingListPage } from './pages/mappings/MappingListPage.js'
import { InterfaceListPage } from './pages/interfaces/InterfaceListPage.js'
import { InterfaceDetailPage } from './pages/interfaces/InterfaceDetailPage.js'
import { TraceViewPage } from './pages/trace/TraceViewPage.js'

export default function App() {
  return (
    <Routes>
      {/* Layout wraps all pages */}
      <Route element={<Layout />}>
        {/* Workspace list (home) */}
        <Route path="/" element={<WorkspaceListPage />} />

        {/* Workspace scoped routes */}
        <Route path="/workspaces/:workspaceId">
          <Route index element={<WorkspaceDashboardPage />} />
          <Route path="settings" element={<WorkspaceSettingsPage />} />

          {/* Canonical */}
          <Route path="canonical" element={<CanonicalEntityListPage />} />
          <Route path="canonical/entities/:entityId" element={<CanonicalEntityDetailPage />} />
          <Route path="canonical/fields/:fieldId" element={<CanonicalFieldDetailPage />} />

          {/* Systems */}
          <Route path="systems" element={<SystemListPage />} />
          <Route path="systems/:systemId" element={<SystemDetailPage />} />
          <Route
            path="systems/:systemId/entities/:entityId"
            element={<SystemEntityDetailPage />}
          />

          {/* Mappings */}
          <Route path="mappings" element={<MappingListPage />} />

          {/* Interfaces */}
          <Route path="interfaces" element={<InterfaceListPage />} />
          <Route path="interfaces/:interfaceId" element={<InterfaceDetailPage />} />

          {/* Trace */}
          <Route path="trace/:fieldId" element={<TraceViewPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
