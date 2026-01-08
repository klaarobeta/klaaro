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
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { projectService, Project } from '@/services/projectService'
import { analysisService, AnalysisResults } from '@/services/analysisService'
import { preprocessingService, PreprocessingConfig, PreprocessingResults } from '@/services/preprocessingService'
import { trainingService, ModelSelectionResult, ModelSelection, TrainingProgress, TrainingResults } from '@/services/trainingService'
import AnalysisReport from '@/components/analysis/AnalysisReport'
import PreprocessingConfigEditor from '@/components/preprocessing/PreprocessingConfigEditor'
import PreprocessingResultsView from '@/components/preprocessing/PreprocessingResultsView'
import ModelSelectionView from '@/components/training/ModelSelectionView'
import TrainingProgressView from '@/components/training/TrainingProgressView'
import TrainingResultsView from '@/components/training/TrainingResultsView'

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
  preprocessing: { label: 'Preprocessing...', color: 'bg-purple-100 text-purple-700', icon: Loader2, spin: true },
  preprocessed: { label: 'Preprocessed', color: 'bg-purple-100 text-purple-700', icon: CheckCircle2 },
  preprocessing_failed: { label: 'Preprocessing Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  training: { label: 'Training...', color: 'bg-orange-100 text-orange-700', icon: Loader2, spin: true },
  trained: { label: 'Trained', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  training_failed: { label: 'Training Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle },
}

type ViewMode = 'overview' | 'preprocessing'

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
  
  // Preprocessing state
  const [viewMode, setViewMode] = useState<ViewMode>('overview')
  const [preprocessingConfig, setPreprocessingConfig] = useState<PreprocessingConfig | null>(null)
  const [startingPreprocessing, setStartingPreprocessing] = useState(false)
  const [showConfigEditor, setShowConfigEditor] = useState(false)

  // Training state
  const [modelSelection, setModelSelection] = useState<ModelSelectionResult | null>(null)
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress | null>(null)
  const [trainingResults, setTrainingResults] = useState<TrainingResults | null>(null)
  const [selectingModels, setSelectingModels] = useState(false)
  const [startingTraining, setStartingTraining] = useState(false)

  const fetchProject = useCallback(async () => {
    try {
      const proj = await projectService.get(projectId!)
      setProject(proj)
      setSelectedTarget(proj.target_column || undefined)
      
      if (proj.dataset_id) {
        const ds = await projectService.getDataset(projectId!)
        setDataset(ds)
      }
      
      // Load preprocessing config if analyzed
      if (proj.target_column && proj.analysis_results && !proj.preprocessing_results) {
        try {
          const configResult = await preprocessingService.getConfig(projectId!)
          setPreprocessingConfig(configResult.config)
        } catch (e) {
          // Config not available yet
        }
      }

      // Load model selection if preprocessed
      if (proj.preprocessing_results && !proj.preprocessing_results.error) {
        try {
          const selection = await trainingService.getModelSelection(projectId!)
          if (selection) {
            setModelSelection(selection)
          }
        } catch (e) {
          // Selection not available yet
        }
      }

      // Load training results if trained
      if (proj.status === 'trained' || proj.status === 'training') {
        try {
          const status = await trainingService.getTrainingStatus(projectId!)
          if (status.progress) setTrainingProgress(status.progress)
          if (status.results) setTrainingResults(status.results)
        } catch (e) {
          // Results not available yet
        }
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

  // Poll for analysis/preprocessing/training completion
  useEffect(() => {
    if (project?.status === 'analyzing' || project?.status === 'preprocessing' || project?.status === 'training') {
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

  const handleStartPreprocessing = async () => {
    setStartingPreprocessing(true)
    try {
      await preprocessingService.startAuto(projectId!, 0.2, 0)
      toast({ title: 'Preprocessing started', description: 'Preparing your data for training...' })
      await fetchProject()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setStartingPreprocessing(false)
    }
  }

  const handleCustomPreprocessing = async () => {
    if (!preprocessingConfig) return
    
    setStartingPreprocessing(true)
    try {
      await preprocessingService.startCustom(projectId!, preprocessingConfig)
      toast({ title: 'Preprocessing started', description: 'Applying custom configuration...' })
      setShowConfigEditor(false)
      await fetchProject()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setStartingPreprocessing(false)
    }
  }

  const handleContinueToTraining = async () => {
    // Auto-select models when continuing to training
    setSelectingModels(true)
    try {
      const selection = await trainingService.selectModels(projectId!)
      setModelSelection(selection)
      toast({ title: 'Models selected', description: `${selection.recommended_models.length} models recommended for ${selection.task_type}` })
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setSelectingModels(false)
    }
  }

  const handleUpdateModelSelection = async (models: ModelSelection[]) => {
    try {
      await trainingService.updateModelSelection(projectId!, models)
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    }
  }

  const handleStartTraining = async () => {
    setStartingTraining(true)
    try {
      await trainingService.startTraining(projectId!)
      toast({ title: 'Training started', description: 'Training your models in the background...' })
      await fetchProject()
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' })
    } finally {
      setStartingTraining(false)
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
  const hasPreprocessing = project.preprocessing_results && !project.preprocessing_results.error

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
            <p className="text-sm text-gray-500">No dataset linked</p>
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
            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-md capitalize text-sm">
              {project.task_type}
            </span>
          ) : (
            <p className="text-sm text-gray-500">Auto-detect after analysis</p>
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
            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-md text-sm">
              {project.target_column}
            </span>
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
          <div className="text-sm">
            <span className="text-gray-500">Created: </span>
            <span className="text-gray-900">{formatDate(project.created_at)}</span>
          </div>
        </div>
      </div>

      {/* Action Sections based on status */}
      
      {/* Start Analysis CTA */}
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
              {startingAnalysis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Start Analysis
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
              <p className="text-sm text-gray-600">Analyzing your dataset...</p>
            </div>
          </div>
        </div>
      )}

      {/* Preprocessing in Progress */}
      {project.status === 'preprocessing' && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <div>
              <h3 className="font-semibold text-gray-900 mb-1">Preprocessing in Progress</h3>
              <p className="text-sm text-gray-600">Cleaning and transforming your data...</p>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {hasAnalysis && !hasPreprocessing && (
        <>
          <AnalysisReport
            analysis={project.analysis_results as AnalysisResults}
            onSelectTarget={handleSelectTarget}
            selectedTarget={selectedTarget}
          />

          {/* Preprocessing Section */}
          {project.target_column && (
            <>
              {!showConfigEditor ? (
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">Ready for Preprocessing</h3>
                      <p className="text-sm text-gray-600">
                        Target column selected. Preprocess your data to prepare for model training.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowConfigEditor(true)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Customize
                      </Button>
                      <Button 
                        onClick={handleStartPreprocessing}
                        disabled={startingPreprocessing}
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                      >
                        {startingPreprocessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                        Auto Preprocess
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900">Preprocessing Configuration</h3>
                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setShowConfigEditor(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleCustomPreprocessing}
                        disabled={startingPreprocessing || !preprocessingConfig}
                        className="bg-purple-600 hover:bg-purple-700 gap-2"
                      >
                        {startingPreprocessing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        Apply & Run
                      </Button>
                    </div>
                  </div>
                  
                  {preprocessingConfig && (
                    <PreprocessingConfigEditor
                      config={preprocessingConfig}
                      onChange={setPreprocessingConfig}
                      analysisColumns={project.analysis_results?.column_analysis}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Preprocessing Results */}
      {hasPreprocessing && !modelSelection && !trainingResults && (
        <PreprocessingResultsView
          results={project.preprocessing_results as PreprocessingResults}
          onContinue={handleContinueToTraining}
        />
      )}

      {/* Model Selection (after preprocessing, before training) */}
      {hasPreprocessing && modelSelection && !trainingResults && project.status !== 'training' && (
        <ModelSelectionView
          selection={modelSelection}
          onUpdateSelection={handleUpdateModelSelection}
          onStartTraining={handleStartTraining}
          isTraining={startingTraining}
        />
      )}

      {/* Training in Progress */}
      {project.status === 'training' && trainingProgress && (
        <TrainingProgressView progress={trainingProgress} />
      )}

      {/* Training Results */}
      {trainingResults && (
        <TrainingResultsView
          results={trainingResults}
          taskType={project.task_type || 'classification'}
          onContinue={() => toast({ title: 'Coming soon', description: 'Model export will be available in the next update' })}
        />
      )}

      {/* Workflow Progress */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-6">Workflow Progress</h3>
        
        <div className="flex items-center justify-between">
          {[
            { step: 1, label: 'Dataset', status: project.dataset_id ? 'completed' : 'pending' },
            { step: 2, label: 'Analysis', status: hasAnalysis ? 'completed' : project.status === 'analyzing' ? 'active' : 'pending' },
            { step: 3, label: 'Preprocessing', status: hasPreprocessing ? 'completed' : project.status === 'preprocessing' ? 'active' : 'pending' },
            { step: 4, label: 'Training', status: trainingResults ? 'completed' : project.status === 'training' ? 'active' : hasPreprocessing ? 'pending' : 'pending' },
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
