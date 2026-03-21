import { Routes, Route, Navigate } from 'react-router-dom'
import { ProjectListPage } from './pages/ProjectListPage'
import { ProjectShell } from './pages/ProjectShell'
import { AssetManagerPage } from './pages/AssetManagerPage'
import { EntityManagerPage } from './pages/EntityManagerPage'
import { EditorPage } from './pages/EditorPage'
import { ProjectSettingsPage } from './pages/ProjectSettingsPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectShell />}>
        <Route path="assets" element={<AssetManagerPage />} />
        <Route path="entities" element={<EntityManagerPage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="settings" element={<ProjectSettingsPage />} />
        <Route index element={<Navigate to="assets" replace />} />
      </Route>
    </Routes>
  )
}
