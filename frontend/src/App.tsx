import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Toaster } from '@/components/ui/toaster'

// Pages
import LandingPage from '@/pages/LandingPage'
import DashboardLayout from '@/components/layout/DashboardLayout'
import DashboardHome from '@/pages/dashboard/DashboardHome'
import NewProject from '@/pages/dashboard/NewProject'
import DataUploadPage from '@/pages/DataUploadPage'
import Models from '@/pages/dashboard/Models'
import Experiments from '@/pages/dashboard/Experiments'
import Pipelines from '@/pages/dashboard/Pipelines'
import Monitoring from '@/pages/dashboard/Monitoring'
import Projects from '@/pages/dashboard/Projects'
import ProjectDetail from '@/pages/dashboard/ProjectDetail'
import AIChatWorkspace from '@/pages/dashboard/AIChatWorkspace'
import Settings from '@/pages/dashboard/Settings'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            
            {/* Protected Dashboard Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardHome />} />
              <Route path="new-project" element={<NewProject />} />
              <Route path="datasets" element={<DataUploadPage />} />
              <Route path="models" element={<Models />} />
              <Route path="experiments" element={<Experiments />} />
              <Route path="pipelines" element={<Pipelines />} />
              <Route path="monitoring" element={<Monitoring />} />
              <Route path="projects" element={<Projects />} />
              <Route path="projects/:projectId" element={<ProjectDetail />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  )
}

export default App
