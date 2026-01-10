import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Sparkles, CheckCircle2, AlertCircle, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'pending' | 'complete' | 'error'
}

interface ChatPanelProps {
  projectId: string
  onWorkflowUpdate: (status: any) => void
  initialWorkflowStatus?: any
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

export default function ChatPanel({ projectId, onWorkflowUpdate, initialWorkflowStatus }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 **Welcome to AI AutoML!**\n\nI'm powered by Claude AI and I'll build your ML model automatically.\n\n**Just tell me what you want to predict!**\n\nExamples:\n• "Predict house prices"\n• "Classify customer churn"\n• "Forecast sales"\n\nI'll analyze your data, preprocess it, generate the best model, and iterate to improve accuracy - all automatically! 🚀`,
      timestamp: new Date(),
      status: 'complete'
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState<string>('')
  const [workflowStatus, setWorkflowStatus] = useState<any>(initialWorkflowStatus || null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const pollingInterval = useRef<NodeJS.Timeout | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch initial workflow status on mount
  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/${projectId}/workflow-status`)
        if (response.ok) {
          const data = await response.json()
          setWorkflowStatus(data)
          onWorkflowUpdate(data)
          
          // If already trained, show completion message
          if (data.status === 'trained') {
            addMessage('system', `✅ This project has a trained model ready!\n\nYou can:\n• Ask questions about the model\n• Request predictions\n• View results in the preview panel`, { status: 'complete' })
          }
        }
      } catch (error) {
        console.error('Failed to fetch initial status:', error)
      }
    }
    
    fetchInitialStatus()
  }, [projectId])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current)
      }
    }
  }, [])

  const addMessage = (role: 'user' | 'assistant' | 'system', content: string, options?: Partial<ChatMessage>) => {
    const newMessage: ChatMessage = {
      id: Date.now().toString(),
      role,
      content,
      timestamp: new Date(),
      status: 'complete',
      ...options
    }
    setMessages(prev => [...prev, newMessage])
    return newMessage.id
  }

  const updateMessage = (id: string, updates: Partial<ChatMessage>) => {
    setMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ))
  }

  const startWorkflowPolling = (statusMessageId: string) => {
    pollingInterval.current = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/${projectId}/workflow-status`)
        if (!response.ok) return

        const data = await response.json()
        const log = data.workflow_log || []
        const status = data.status

        // Update current step message
        const lastLog = log[log.length - 1]
        if (lastLog) {
          const stepName = lastLog.step
          const stepStatus = lastLog.status
          
          let statusText = ''
          if (stepName === 'initialization') statusText = '📁 Loading your data...'
          else if (stepName === 'analysis') statusText = '🔍 AI analyzing your data with Claude...'
          else if (stepName === 'preprocessing') statusText = '⚙️ Preprocessing data automatically...'
          else if (stepName === 'model_generation') statusText = '🤖 Generating optimal model code...'
          else if (stepName === 'iteration') statusText = '🔄 Iterating to improve accuracy...'
          else if (stepName === 'error') statusText = `❌ Error: ${lastLog.error}`

          if (stepStatus === 'complete') {
            statusText = statusText.replace('...', ' ✅')
          }

          setCurrentWorkflowStep(statusText)
          updateMessage(statusMessageId, { content: statusText, status: 'pending' })
        }

        // Send updates to parent
        setWorkflowStatus(data)
        onWorkflowUpdate(data)

        // Check if complete
        if (status === 'trained') {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current)
          }

          updateMessage(statusMessageId, {
            content: `🎉 **Model trained successfully!**\n\nYour AI model is ready and has been optimized for accuracy through multiple iterations.\n\nCheck the preview panel on the right to see:\n• Model performance metrics\n• Visualizations\n• Download options\n\nYou can now ask me questions about the model or request predictions!`,
            status: 'complete'
          })

          setIsProcessing(false)
          
          toast({
            title: '🎉 Model Ready!',
            description: 'Your AI model has been trained successfully'
          })
        } else if (status === 'failed') {
          if (pollingInterval.current) {
            clearInterval(pollingInterval.current)
          }

          const errorLog = log.find((l: any) => l.step === 'error')
          const errorMsg = errorLog?.error || 'Unknown error'

          updateMessage(statusMessageId, {
            content: `❌ **Build failed**\n\nError: ${errorMsg}\n\nPlease try again or contact support.`,
            status: 'error'
          })

          setIsProcessing(false)

          toast({
            title: 'Build failed',
            description: errorMsg,
            variant: 'destructive'
          })
        }

      } catch (error) {
        console.error('Polling error:', error)
      }
    }, 2000) // Poll every 2 seconds
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    addMessage('user', userMessage)
    setInput('')
    setIsProcessing(true)

    // FIRST CHECK: Is there a trained model?
    const modelIsTrained = workflowStatus?.status === 'trained'
    
    if (modelIsTrained) {
      // Model exists - ALWAYS answer questions, NEVER retrain
      const statusId = addMessage('assistant', '🤔 Analyzing the trained model...', { status: 'pending' })
      
      try {
        const response = await fetch(`${BACKEND_URL}/api/ai/ask-question`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            project_id: projectId, 
            user_prompt: userMessage 
          })
        })

        if (!response.ok) throw new Error('Failed to get answer')

        const data = await response.json()
        
        updateMessage(statusId, {
          content: data.answer,
          status: 'complete'
        })
        
      } catch (error: any) {
        updateMessage(statusId, {
          content: `❌ Error: ${error.message}`,
          status: 'error'
        })
      }
      
      setIsProcessing(false)
      return
    }

    // No trained model - start training
    const statusId = addMessage('assistant', '🚀 Starting automated build...', { status: 'pending' })

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/auto-build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: projectId, 
          user_prompt: userMessage 
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to start build')
      }

      startWorkflowPolling(statusId)

    } catch (error: any) {
      updateMessage(statusId, {
        content: `❌ Failed: ${error.message}`,
        status: 'error'
      })
      setIsProcessing(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-purple-600 p-4 border-b">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-white">AI Assistant</h2>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
              <span>{isProcessing ? 'Building...' : 'Ready'} • Powered by Claude</span>
            </div>
          </div>
          {isProcessing && (
            <div className="flex items-center gap-2 text-white text-xs bg-white/10 px-3 py-1 rounded-full">
              <Zap className="w-3 h-3 animate-pulse" />
              <span>Auto-Building</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role !== 'user' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                {message.status === 'pending' ? (
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : message.status === 'error'
                  ? 'bg-red-100 text-red-900 border border-red-200'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              <div className={`text-xs mt-1 ${message.role === 'user' ? 'text-blue-200' : 'text-gray-500'}`}>
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            {message.role === 'user' && (
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 p-4 border-t bg-gray-50">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isProcessing ? 'AI is building your model...' : 'Describe what you want to predict...'}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isProcessing}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        {isProcessing && currentWorkflowStep && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>{currentWorkflowStep}</span>
          </div>
        )}
        {!isProcessing && (
          <p className="text-xs text-gray-500 mt-2">
            💡 Fully automatic - No approvals needed! Just describe your goal and I'll build the model.
          </p>
        )}
      </div>
    </div>
  )
}
