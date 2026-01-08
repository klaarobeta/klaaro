import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Database,
  Brain,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Settings,
  Play,
  Trash2,
  Table2,
  RefreshCw,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { projectService, Project } from '@/services/projectService'
import { analysisService, AnalysisResults } from '@/services/analysisService'
import AnalysisReport from '@/components/analysis/AnalysisReport'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

interface Dataset {
  id: string
  filename: string
  size: number
  type: string
  category: string
  uploaded_at: string
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType; spin?: boolean }> = {
  created: { label: 'Created', color: 'bg-gray-100 text-gray-700', icon: Clock },
  dataset_linked: { label: 'Dataset Linked', color: 'bg-blue-100 text-blue-700', icon: Database },
  analyzing: { label: 'Analyzing...', color: 'bg-yellow-100 text-yellow-700', icon: Loader2, spin: true },
  analyzed: { label: 'Analyzed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  analysis_failed: { label: 'Analysis Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  preprocessing: { label: 'Preprocessing', color: 'bg-purple-100 text-purple-700', icon: Settings },
  training: { label: 'Training', color: 'bg-orange-100 text-orange-700', icon: Brain },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [project, setProject] = useState<Project | null>(null)
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [startingAnalysis, setStartingAnalysis] = useState(false)
  const [selectedTarget, setSelectedTarget] = useState<string | undefined>(undefined)
  const [settingTarget, setSettingTarget] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const proj = await projectService.get(projectId!)
      setProject(proj)
      setSelectedTarget(proj.target_column || undefined)
      
      if (proj.dataset_id) {
        const ds = await projectService.getDataset(projectId!)
        setDataset(ds)
      }
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      navigate('/dashboard/projects')
    }
  }, [projectId, navigate, toast])

  useEffect(() => {
    if (projectId) {
      setLoading(true)
      fetchProject().finally(() => setLoading(false))
    }
  }, [projectId, fetchProject])

  // Poll for analysis completion
  useEffect(() => {
    if (project?.status === 'analyzing') {
      const interval = setInterval(async () => {
        await fetchProject()
      }, 2000)
      return () => clearInterval(interval)
    }
  }, [project?.status, fetchProject])

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return
    
    setDeleting(true)
    try {
      await projectService.delete(projectId!)
      toast({ title: 'Project deleted' })
      navigate('/dashboard/projects')
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
      setDeleting(false)
    }
  }

  const handleStartAnalysis = async () => {
    if (!project?.dataset_id) {
      toast({ title: 'No dataset linked', description: 'Please link a dataset first', variant: 'destructive' })
      return
    }

    setStartingAnalysis(true)
    try {
      await analysisService.startAnalysis(projectId!)
      toast({ title: 'Analysis started', description: 'This may take a few moments...' })
      await fetchProject()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setStartingAnalysis(false)
    }
  }

  const handleSelectTarget = async (column: string) => {
    setSelectedTarget(column)
    setSettingTarget(true)
    try {
      await analysisService.setTargetColumn(projectId!, column)
      toast({ title: 'Target column set', description: `"${column}" will be used as the prediction target` })
      await fetchProject()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSettingTarget(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Project not found</h2>
        <Link to="/dashboard/projects">
          <Button variant="outline">Back to Projects</Button>
        </Link>
      </div>
    )
  }

  const status = statusConfig[project.status] || statusConfig.created
  const StatusIcon = status.icon
  const hasAnalysis = project.analysis_results && !project.analysis_results.error

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3 mb-2">
            <Link to="/dashboard/projects">
              <Button variant="ghost" size="sm" className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Back
              </Button>
            </Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          <p className="text-gray-500">{project.description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={fetchProject}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting} className="text-red-600 hover:text-red-700">
            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Status Badge */}
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${status.color}`}>
        <StatusIcon className={`w-4 h-4 ${status.spin ? 'animate-spin' : ''}`} />
        <span className="text-sm font-medium">{status.label}</span>
      </div>

      {/* Project Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Dataset Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Dataset</h3>
          </div>
          
          {dataset ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Table2 className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-900 truncate">{dataset.filename}</span>
              </div>
              <div className="text-sm text-gray-500">
                {formatSize(dataset.size)} • {dataset.category.toUpperCase()}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">
              <p>No dataset linked</p>
              <Link to="/dashboard/datasets" className="text-blue-500 hover:underline">
                Upload a dataset
              </Link>
            </div>
          )}
        </div>

        {/* Task Type Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Brain className="w-5 h-5 text-purple-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Task Type</h3>
          </div>
          
          {project.task_type ? (
            <div className="text-sm">
              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md capitalize">
                {project.task_type}
              </span>
              {project.analysis_results?.task_confidence && (
                <span className="text-gray-500 ml-2">
                  {Math.round(project.analysis_results.task_confidence * 100)}% confident
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Will be auto-detected after analysis</p>
          )}
        </div>

        {/* Target Column Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Target</h3>
          </div>
          
          {project.target_column ? (
            <div className="text-sm">
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md">
                {project.target_column}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select after analysis</p>
          )}
        </div>

        {/* Timeline Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              <Clock className="w-5 h-5 text-gray-500" />
            </div>
            <h3 className="font-semibold text-gray-900">Timeline</h3>
          </div>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Created</span>
              <span className="text-gray-900">{formatDate(project.created_at)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Section - Start Analysis */}
      {project.status === 'dataset_linked' && (
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Ready to Analyze</h3>
              <p className="text-sm text-gray-600">
                Your dataset is linked. Start the analysis to auto-detect task type and get data quality insights.
              </p>
            </div>
            <Button 
              onClick={handleStartAnalysis} 
              disabled={startingAnalysis}
              className="bg-blue-600 hover:bg-blue-700 gap-2"
            >
              {startingAnalysis ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Starting...</>
              ) : (
                <><Play className="w-4 h-4" /> Start Analysis</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Analysis in Progress */}
      {project.status === 'analyzing' && (
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-yellow-600" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Analysis in Progress</h3>
              <p className="text-sm text-gray-600">
                Analyzing your dataset... This usually takes a few seconds.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Failed */}
      {project.status === 'analysis_failed' && (
        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl border border-red-200 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Analysis Failed</h3>
                <p className="text-sm text-gray-600">
                  {project.analysis_results?.error || 'An error occurred during analysis'}
                </p>
              </div>
            </div>
            <Button onClick={handleStartAnalysis} variant="outline" className="gap-2">
              <RefreshCw className="w-4 h-4" /> Retry
            </Button>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {hasAnalysis && (
        <>
          <AnalysisReport
            analysis={project.analysis_results as AnalysisResults}
            onSelectTarget={handleSelectTarget}
            selectedTarget={selectedTarget}
          />

          {/* Next Step CTA */}
          {project.target_column && (
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Ready for Preprocessing</h3>
                  <p className="text-sm text-gray-600">
                    Target column selected. Proceed to configure preprocessing and start training.
                  </p>
                </div>
                <Button className="bg-green-600 hover:bg-green-700 gap-2">
                  Continue to Preprocessing <ArrowRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Workflow Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Workflow Progress</h3>
        
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: 'Dataset', status: project.dataset_id ? 'completed' : 'pending' },
            { step: 2, label: 'Analysis', status: hasAnalysis ? 'completed' : project.status === 'analyzing' ? 'active' : 'pending' },
            { step: 3, label: 'Preprocessing', status: project.preprocessing_config ? 'completed' : project.status === 'preprocessing' ? 'active' : 'pending' },
            { step: 4, label: 'Training', status: project.model_id ? 'completed' : project.status === 'training' ? 'active' : 'pending' },
            { step: 5, label: 'Complete', status: project.status === 'completed' ? 'completed' : 'pending' },
          ].map((item, index, arr) => (
            <div key={item.step} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  item.status === 'completed' ? 'bg-green-500 text-white' :
                  item.status === 'active' ? 'bg-blue-500 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {item.status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : item.status === 'active' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <span>{item.step}</span>
                  )}
                </div>
                <span className={`text-xs mt-2 ${
                  item.status === 'pending' ? 'text-gray-400' : 'text-gray-700'
                }`}>
                  {item.label}
                </span>
              </div>
              {index < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  item.status === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
