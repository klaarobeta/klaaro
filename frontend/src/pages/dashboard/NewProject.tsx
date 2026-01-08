import { useState } from 'react'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useToast } from '@/hooks/use-toast'

type Step = 'prompt' | 'data-source' | 'confirmation'
type DataSource = 'upload' | 'existing' | 'internet'

export default function NewProject() {
  const navigate = useNavigate()
  const { toast } = useToast()
  
  const [currentStep, setCurrentStep] = useState<Step>('prompt')
  const [projectName, setProjectName] = useState('')
  const [prompt, setPrompt] = useState('')
  const [dataSource, setDataSource] = useState<DataSource>('upload')
  const [isCreating, setIsCreating] = useState(false)

  const steps = [
    { id: 'prompt', label: 'Describe Goal', icon: MessageSquare },
    { id: 'data-source', label: 'Data Source', icon: Database },
    { id: 'confirmation', label: 'Confirm', icon: CheckCircle2 },
  ]

  const currentStepIndex = steps.findIndex(s => s.id === currentStep)

  const handleNext = () => {
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
      setCurrentStep('confirmation')
    }
  }

  const handleBack = () => {
    if (currentStep === 'data-source') setCurrentStep('prompt')
    else if (currentStep === 'confirmation') setCurrentStep('data-source')
  }

  const handleCreateProject = async () => {
    setIsCreating(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    toast({
      title: 'Project Created!',
      description: 'Redirecting to dataset selection...',
    })
    
    setTimeout(() => {
      navigate('/dashboard/datasets')
    }, 1000)
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
                { value: 'internet', icon: Globe, title: 'Find Dataset Online', desc: 'Let AI find relevant public datasets for your project', color: 'text-purple-500', badge: 'AI-Powered' },
              ].map((option) => (
                <label
                  key={option.value}
                  htmlFor={option.value}
                  className={`flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                    dataSource === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <option.icon className={`w-5 h-5 ${option.color}`} />
                      <span className="font-medium">{option.title}</span>
                      {option.badge && (
                        <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">{option.badge}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{option.desc}</p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </div>
        )}

        {/* Step 3: Confirmation */}
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
            </div>

            <div className="p-4 rounded-lg border border-blue-200 bg-blue-50">
              <p className="text-sm text-gray-700">
                <strong>What happens next:</strong> After creating the project, you'll be guided through
                dataset selection, automatic data analysis, and model training.
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
