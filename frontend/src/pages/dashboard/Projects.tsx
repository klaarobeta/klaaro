import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  Plus,
  Search,
  Loader2,
  MoreVertical,
  Trash2,
  Eye,
  Clock,
  Database,
  Brain,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { projectService, Project } from '@/services/projectService'

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  created: { label: 'Created', color: 'bg-gray-100 text-gray-700', icon: Clock },
  dataset_linked: { label: 'Dataset Linked', color: 'bg-blue-100 text-blue-700', icon: Database },
  analyzing: { label: 'Analyzing', color: 'bg-yellow-100 text-yellow-700', icon: Loader2 },
  preprocessing: { label: 'Preprocessing', color: 'bg-purple-100 text-purple-700', icon: Brain },
  training: { label: 'Training', color: 'bg-orange-100 text-orange-700', icon: Brain },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

export default function Projects() {
  const { toast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const data = await projectService.list()
      setProjects(data.projects)
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load projects', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!confirm('Are you sure you want to delete this project?')) return
    
    try {
      await projectService.delete(projectId)
      toast({ title: 'Project deleted' })
      setProjects(prev => prev.filter(p => p.id !== projectId))
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-500">Manage all your AutoML projects</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchProjects} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Link to="/dashboard/new-project">
            <Button><Plus className="w-4 h-4 mr-2" />New Project</Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Projects List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 py-20 text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No projects found' : 'No projects yet'}
          </h3>
          <p className="text-gray-500 mb-4 max-w-md mx-auto">
            {searchQuery
              ? 'Try a different search term'
              : 'Create your first AutoML project to start building AI models.'}
          </p>
          {!searchQuery && (
            <Link to="/dashboard/new-project">
              <Button><Plus className="w-4 h-4 mr-2" />Create First Project</Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const status = statusConfig[project.status] || statusConfig.created
            const StatusIcon = status.icon
            
            return (
              <Link key={project.id} to={`/dashboard/projects/${project.id}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-blue-300 hover:shadow-sm transition-all h-full">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                      <FolderOpen className="w-5 h-5 text-blue-500" />
                    </div>
                    <button
                      onClick={(e) => handleDelete(project.id, e)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-1 truncate">{project.name}</h3>
                  <p className="text-sm text-gray-500 mb-4 line-clamp-2">{project.description}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                      <StatusIcon className={`w-3 h-3 ${project.status === 'analyzing' || project.status === 'training' ? 'animate-spin' : ''}`} />
                      {status.label}
                    </div>
                    <span className="text-xs text-gray-400">{formatDate(project.created_at)}</span>
                  </div>
                  
                  {project.task_type && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-500">Task: </span>
                      <span className="text-xs font-medium text-gray-700 capitalize">{project.task_type}</span>
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
