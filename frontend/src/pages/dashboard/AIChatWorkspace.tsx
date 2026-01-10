import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ChatPanel from '@/components/ai-chat/ChatPanel'
import PreviewPanel from '@/components/ai-chat/PreviewPanel'

export default function AIChatWorkspace() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  
  const [workflowStatus, setWorkflowStatus] = useState<any>(null)

  const handleWorkflowUpdate = (status: any) => {
    setWorkflowStatus(status)
  }

  const handleBack = () => {
    navigate('/dashboard/projects')
  }

  const handleDevMode = () => {
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
            <p className="text-xs text-gray-500">Fully automated model building with Claude AI</p>
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

      {/* Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 border-r">
          <ChatPanel
            projectId={projectId!}
            onWorkflowUpdate={handleWorkflowUpdate}
            initialWorkflowStatus={workflowStatus}
          />
        </div>
        <div className="w-1/2">
          <PreviewPanel
            projectId={projectId!}
            workflowStatus={workflowStatus}
          />
        </div>
      </div>
    </div>
  )
}
