import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChatPanel from '@/components/ai-chat/ChatPanel'
import PreviewPanel from '@/components/ai-chat/PreviewPanel'

export default function AIChatWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [currentStep, setCurrentStep] = useState<'idle' | 'analysis' | 'preprocessing' | 'model' | 'complete'>('idle')
  const [analysisData, setAnalysisData] = useState<any>(null)
  const [preprocessingData, setPreprocessingData] = useState<any>(null)
  const [modelData, setModelData] = useState<any>(null)
  const [showDevMode, setShowDevMode] = useState(false)

  const handleAnalysisComplete = (data: any) => {
    setAnalysisData(data)
    setCurrentStep('analysis')
  }

  const handlePreprocessingComplete = (data: any) => {
    setPreprocessingData(data)
    setCurrentStep('preprocessing')
  }

  const handleModelComplete = (data: any) => {
    setModelData(data)
    setCurrentStep('complete')
  }

  const handleBack = () => {
    navigate('/dashboard/projects')
  }

  const handleDevMode = () => {
    // Navigate to old project detail page (developer mode)
    navigate(`/dashboard/projects/${projectId}/developer`)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Top Bar */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-lg font-semibold text-gray-900">AI AutoML Workspace</h1>
            <p className="text-xs text-gray-500">Build ML models through conversation</p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleDevMode}
          className="gap-2"
        >
          <Settings className="w-4 h-4" />
          Developer Mode
        </Button>
      </div>

      {/* Split Screen: Chat (Left) | Preview (Right) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Panel - 50% */}
        <div className="w-1/2 border-r">
          <ChatPanel
            projectId={projectId!}
            onAnalysisComplete={handleAnalysisComplete}
            onPreprocessingComplete={handlePreprocessingComplete}
            onModelComplete={handleModelComplete}
          />
        </div>

        {/* Preview Panel - 50% */}
        <div className="w-1/2">
          <PreviewPanel
            projectId={projectId!}
            currentStep={currentStep}
            analysisData={analysisData}
            preprocessingData={preprocessingData}
            modelData={modelData}
          />
        </div>
      </div>
    </div>
  )
}
