import { Routes, Route, Navigate } from 'react-router-dom'
import { ProjectListPage } from './pages/ProjectListPage'
import { ProjectShell } from './pages/ProjectShell'
import { AssetManagerPage } from './pages/AssetManagerPage'
import { EditorPage } from './pages/EditorPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<ProjectListPage />} />
      <Route path="/project/:id" element={<ProjectShell />}>
        <Route path="assets" element={<AssetManagerPage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route index element={<Navigate to="assets" replace />} />
      </Route>
    </Routes>
  )
}
