import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles,
  MessageSquare,
  Database,
  Upload,
  Globe,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  FileText,
  Table2,
  Image,
  Check,
  RefreshCw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'
import { projectService, Project } from '@/services/projectService'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

type Step = 'prompt' | 'data-source' | 'select-dataset' | 'confirmation'
type DataSource = 'upload' | 'existing' | 'internet'

interface Dataset {
  id: string
  filename: string
  size: number
  type: string
  category: string
  uploaded_at: string
}

export default function NewProject() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState<Step>('prompt')
  const [projectName, setProjectName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('upload')
  const [isCreating, setIsCreating] = useState(false)
  const [createdProject, setCreatedProject] = useState<Project | null>(null)
  
  // Dataset selection state
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loadingDatasets, setLoadingDatasets] = useState(false)
  const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const steps = [
    { id: 'prompt', label: 'Describe Goal', icon: MessageSquare },
    { id: 'data-source', label: 'Data Source', icon: Database },
    { id: 'select-dataset', label: 'Select Dataset', icon: FileText },
    { id: 'confirmation', label: 'Confirm', icon: CheckCircle2 },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  // Fetch datasets when moving to select-dataset step
  useEffect(() => {
    if (currentStep === 'select-dataset' && dataSource === 'existing') {
      fetchDatasets()
    }
  }, [currentStep, dataSource])

  const fetchDatasets = async () => {
    setLoadingDatasets(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/datasets/list?category=csv`)
      const data = await response.json()
      setDatasets(data.datasets || [])
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to load datasets', variant: 'destructive' })
    } finally {
      setLoadingDatasets(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploadingFile(true)
    const formData = new FormData()
    formData.append('file', files[0])

    try {
      const response = await fetch(`${BACKEND_URL}/api/datasets/upload`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const dataset = await response.json()
        toast({ title: 'Upload Successful', description: `${files[0].name} has been uploaded` })
        setSelectedDatasetId(dataset.id)
        setDatasets(prev => [dataset, ...prev])
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Upload failed')
      }
    } catch (error: any) {
      toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' })
    } finally {
      setUploadingFile(false)
    }
  }

  const handleNext = async () => {
    if (currentStep === 'prompt') {
      if (!projectName.trim()) {
        toast({ title: 'Project name required', variant: 'destructive' })
        return
      }
      if (!prompt.trim()) {
        toast({ title: 'Please describe your goal', variant: 'destructive' })
        return
      }
      setCurrentStep('data-source')
    } else if (currentStep === 'data-source') {
      setCurrentStep('select-dataset')
    } else if (currentStep === 'select-dataset') {
      if (dataSource !== 'internet' && !selectedDatasetId) {
        toast({ title: 'Please select or upload a dataset', variant: 'destructive' })
        return
      }
      setCurrentStep('confirmation')
    }
  }

  const handleBack = () => {
    if (currentStep === 'data-source') setCurrentStep('prompt')
    else if (currentStep === 'select-dataset') setCurrentStep('data-source')
    else if (currentStep === 'confirmation') setCurrentStep('select-dataset')
  }

  const handleCreateProject = async () => {
    setIsCreating(true)
    
    try {
      // Create the project
      const project = await projectService.create({
        name: projectName,
        description: prompt,
        data_source: dataSource
      })
      
      setCreatedProject(project)
      
      // Link dataset if selected
      if (selectedDatasetId) {
        await projectService.linkDataset(project.id, selectedDatasetId)
      }
      
      toast({
        title: 'Project Created!',
        description: 'Redirecting to data analysis...',
      })
      
      // Navigate to the project's analysis page (Part 4)
      setTimeout(() => {
        navigate(`/dashboard/projects/${project.id}`)
      }, 1000)
      
    } catch (error: any) {
      toast({
        title: 'Failed to create project',
        description: error.message,
        variant: 'destructive'
      })
      setIsCreating(false)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'csv':
      case 'tabular':
        return <Table2 className="w-5 h-5 text-emerald-500" />
      case 'image':
        return <Image className="w-5 h-5 text-purple-500" />
      default:
        return <FileText className="w-5 h-5 text-blue-500" />
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-blue-500" />
          <h1 className="text-2xl font-bold text-gray-900">New AutoML Project</h1>
        </div>
        <p className="text-gray-500">Describe what you want to build and we'll handle the rest</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                index <= currentStepIndex
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`text-sm font-medium hidden sm:block ${
                index <= currentStepIndex ? 'text-gray-900' : 'text-gray-500'
              }`}>
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mx-4 ${
                index < currentStepIndex ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Step 1: Prompt */}
        {currentStep === 'prompt' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Describe Your Goal</h3>
              <p className="text-sm text-gray-500">Tell us what you want to predict or classify. Be as specific as possible.</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="project-name">Project Name</Label>
              <Input
                id="project-name"
                placeholder="e.g., Customer Churn Prediction"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">What do you want to build?</Label>
              <Textarea
                id="prompt"
                placeholder="Example: I want to predict whether a customer will churn based on their usage patterns, subscription type, and support ticket history."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[150px]"
              />
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-900 mb-2">Example prompts:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• "Predict house prices based on location, size, and amenities"</li>
                <li>• "Classify emails as spam or not spam based on content"</li>
                <li>• "Segment customers into groups based on purchase behavior"</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 2: Data Source */}
        {currentStep === 'data-source' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Choose Data Source</h3>
              <p className="text-sm text-gray-500">Select where your training data will come from</p>
            </div>
            
            <RadioGroup value={dataSource} onValueChange={(v) => setDataSource(v as DataSource)} className="space-y-4">
              {[
                { value: 'upload', icon: Upload, title: 'Upload New Dataset', desc: 'Upload CSV, JSON, or Excel files from your computer', color: 'text-blue-500' },
                { value: 'existing', icon: Database, title: 'Use Existing Dataset', desc: 'Choose from datasets you\'ve already uploaded', color: 'text-emerald-500' },
                { value: 'internet', icon: Globe, title: 'Find Dataset Online', desc: 'Let AI find relevant public datasets for your project', color: 'text-purple-500', badge: 'Coming Soon', disabled: true },
              ].map((option) => (
                <label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    option.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  } ${
                    dataSource === option.value && !option.disabled
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" disabled={option.disabled} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <span className="font-medium">{option.title}</span>
                      {option.badge && (
                        <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded-full">{option.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Select Dataset */}
        {currentStep === 'select-dataset' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {dataSource === 'upload' ? 'Upload Your Dataset' : 'Select a Dataset'}
              </h3>
              <p className="text-sm text-gray-500">
                {dataSource === 'upload' 
                  ? 'Upload a CSV file with your training data'
                  : 'Choose from your existing datasets'
                }
              </p>
            </div>

            {/* Upload Section */}
            {dataSource === 'upload' && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <Upload className="w-10 h-10 text-gray-400 mx-auto mb-4" />
                  <p className="text-sm text-gray-600 mb-4">Drag and drop or click to upload</p>
                  <Input
                    type="file"
                    accept=".csv,.json,.xlsx"
                    onChange={handleFileUpload}
                    disabled={uploadingFile}
                    className="max-w-xs mx-auto"
                  />
                  {uploadingFile && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">Uploading...</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 text-center">Supported: CSV, JSON, XLSX (max 100MB)</p>
              </div>
            )}

            {/* Existing Datasets Section */}
            {dataSource === 'existing' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">
                    {datasets.length} datasets available
                  </span>
                  <Button variant="ghost" size="sm" onClick={fetchDatasets} disabled={loadingDatasets}>
                    <RefreshCw className={`w-4 h-4 mr-2 ${loadingDatasets ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                
                {loadingDatasets ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                  </div>
                ) : datasets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No datasets found</p>
                    <p className="text-sm">Upload a dataset first in the Datasets section</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {datasets.map((dataset) => (
                      <label
                        key={dataset.id}
                        className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                          selectedDatasetId === dataset.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="dataset"
                          value={dataset.id}
                          checked={selectedDatasetId === dataset.id}
                          onChange={() => setSelectedDatasetId(dataset.id)}
                          className="sr-only"
                        />
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          selectedDatasetId === dataset.id ? 'bg-blue-100' : 'bg-gray-100'
                        }`}>
                          {getCategoryIcon(dataset.category)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{dataset.filename}</p>
                          <p className="text-sm text-gray-500">{formatSize(dataset.size)} • {dataset.category.toUpperCase()}</p>
                        </div>
                        {selectedDatasetId === dataset.id && (
                          <Check className="w-5 h-5 text-blue-500" />
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Show selected dataset info */}
            {selectedDatasetId && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-700">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-medium">Dataset selected</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {currentStep === 'confirmation' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Confirm Project Details</h3>
              <p className="text-sm text-gray-500">Review your project configuration before creating</p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Project Name</p>
                <p className="font-medium text-gray-900">{projectName}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Goal Description</p>
                <p className="text-gray-900">{prompt}</p>
              </div>
              
              <div className="p-4 rounded-lg bg-gray-50">
                <p className="text-sm text-gray-500">Data Source</p>
                <p className="font-medium text-gray-900 flex items-center gap-2">
                  {dataSource === 'upload' && <><Upload className="w-4 h-4" /> Upload New Dataset</>}
                  {dataSource === 'existing' && <><Database className="w-4 h-4" /> Use Existing Dataset</>}
                  {dataSource === 'internet' && <><Globe className="w-4 h-4" /> Find Dataset Online</>}
                </p>
              </div>

              {selectedDatasetId && (
                <div className="p-4 rounded-lg bg-gray-50">
                  <p className="text-sm text-gray-500">Selected Dataset</p>
                  <p className="font-medium text-gray-900">
                    {datasets.find(d => d.id === selectedDatasetId)?.filename || 'Uploaded file'}
                  </p>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-sm text-gray-700">
                <strong>What happens next:</strong> After creating the project, we'll automatically analyze your dataset,
                detect the task type (classification/regression/clustering), and prepare the data for training.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={handleBack} disabled={currentStep === 'prompt'} className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        {currentStep !== 'confirmation' ? (
          <Button onClick={handleNext} className="gap-2">
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button onClick={handleCreateProject} disabled={isCreating} className="gap-2 bg-blue-600 hover:bg-blue-700">
            {isCreating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</>
            ) : (
              <><Sparkles className="w-4 h-4" /> Create Project</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
