import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Bot, User, Sparkles, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  status?: 'pending' | 'complete' | 'error'
  needsApproval?: boolean
  step?: string
}

interface ChatPanelProps {
  projectId: string
  onAnalysisComplete: (analysis: any) => void
  onPreprocessingComplete: (result: any) => void
  onModelComplete: (result: any) => void
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

export default function ChatPanel({
  projectId,
  onAnalysisComplete,
  onPreprocessingComplete,
  onModelComplete
}: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `👋 Hi! I'm your AI AutoML assistant powered by Claude.\n\nI'll help you build a machine learning model from your data. Just tell me what you want to predict!\n\n**For example:**\n• "Build a house price predictor"\n• "Predict customer churn"\n• "Classify images"\n\nWhat would you like to build?`,
      timestamp: new Date(),
      status: 'complete'
    }
  ])
  const [input, setInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStep, setCurrentStep] = useState<'idle' | 'analysis' | 'preprocessing' | 'training'>('idle')
  const [awaitingApproval, setAwaitingApproval] = useState(false)
  const [pendingAction, setPendingAction] = useState<{step: string, data: any} | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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

  // Step 1: AI Analysis
  const handleAnalysis = async (userPrompt: string) => {
    setCurrentStep('analysis')
    setIsProcessing(true)

    const thinkingId = addMessage('assistant', '🤔 Analyzing your data with AI...', { status: 'pending' })

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/analyze-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projectId, user_prompt: userPrompt })
      })

      if (!response.ok) throw new Error('Analysis failed')

      const result = await response.json()
      const analysis = result.analysis

      updateMessage(thinkingId, { 
        content: `✅ Analysis complete!\n\n**Task Type:** ${analysis.task_type}\n**Target Variable:** ${analysis.target_column}\n**Confidence:** ${analysis.confidence}\n\n**Reasoning:** ${analysis.reasoning}\n\n**Data Quality Issues:**\n${analysis.data_quality.issues.map((issue: string) => `• ${issue}`).join('\n')}\n\n**Preprocessing Plan:**\n${analysis.preprocessing_steps.map((step: any, idx: number) => `${idx + 1}. ${step.description}`).join('\n')}\n\n**Recommended Models:** ${analysis.recommended_models.join(', ')}\n\n---\n\n✋ **Ready to proceed with preprocessing?**\nType **"yes"**, **"approve"**, or **"continue"** to proceed.`,
        status: 'complete',
        needsApproval: true
      })

      setAwaitingApproval(true)
      setPendingAction({ step: 'preprocessing', data: analysis })
      onAnalysisComplete(analysis)

    } catch (error: any) {
      updateMessage(thinkingId, { 
        content: `❌ Analysis failed: ${error.message}`,
        status: 'error'
      })
      toast({
        title: 'Analysis failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setCurrentStep('idle')
    }
  }

  // Step 2: Apply Preprocessing
  const handlePreprocessing = async () => {
    setCurrentStep('preprocessing')
    setIsProcessing(true)
    setAwaitingApproval(false)

    const thinkingId = addMessage('assistant', '⚙️ Preprocessing your data...', { status: 'pending' })

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/apply-preprocessing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: projectId, 
          step: 'preprocessing',
          approved: true 
        })
      })

      if (!response.ok) throw new Error('Preprocessing failed')

      const result = await response.json()

      updateMessage(thinkingId, { 
        content: `✅ Preprocessing complete!\n\n**Features Created:** ${result.details.features_created}\n**Training Samples:** ${result.details.train_samples}\n**Test Samples:** ${result.details.test_samples}\n\n**Steps Applied:**\n${result.details.steps_applied.map((step: string) => `• ${step}`).join('\n')}\n\n---\n\n✋ **Ready to generate and train the model?**\nType **"yes"** to proceed.`,
        status: 'complete',
        needsApproval: true
      })

      setAwaitingApproval(true)
      setPendingAction({ step: 'training', data: result })
      onPreprocessingComplete(result)

    } catch (error: any) {
      updateMessage(thinkingId, { 
        content: `❌ Preprocessing failed: ${error.message}`,
        status: 'error'
      })
      toast({
        title: 'Preprocessing failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setCurrentStep('idle')
    }
  }

  // Step 3: Generate and Train Model
  const handleModelGeneration = async () => {
    setCurrentStep('training')
    setIsProcessing(true)
    setAwaitingApproval(false)

    const thinkingId = addMessage('assistant', '🚀 Generating optimal model code with AI...', { status: 'pending' })

    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/generate-model`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          project_id: projectId,
          user_requirements: 'Generate the most accurate model',
          approved_preprocessing: pendingAction?.data || {}
        })
      })

      if (!response.ok) throw new Error('Model generation failed')

      const result = await response.json()

      let metricsText = ''
      if (result.metrics) {
        metricsText = Object.entries(result.metrics)
          .map(([key, value]) => `• ${key}: ${typeof value === 'number' ? (value * 100).toFixed(2) + '%' : value}`)
          .join('\n')
      }

      updateMessage(thinkingId, { 
        content: `✅ Model trained successfully!\n\n**Model:** ${result.model_name}\n\n**Performance Metrics:**\n${metricsText}\n\n**Cross-Validation:**\n• Mean Score: ${result.cv_mean ? (result.cv_mean * 100).toFixed(2) + '%' : 'N/A'}\n• Std Dev: ${result.cv_std ? (result.cv_std * 100).toFixed(2) + '%' : 'N/A'}\n\n---\n\n🎉 **Your model is ready!**\n\nCheck the preview panel on the right to see the model visualization.\n\nYou can now:\n• Download the trained model\n• Make predictions\n• Ask me questions about the model`,
        status: 'complete'
      })

      onModelComplete(result)
      setPendingAction(null)

      toast({
        title: '🎉 Model ready!',
        description: `${result.model_name} trained successfully`
      })

    } catch (error: any) {
      updateMessage(thinkingId, { 
        content: `❌ Model generation failed: ${error.message}`,
        status: 'error'
      })
      toast({
        title: 'Model generation failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
      setCurrentStep('idle')
    }
  }

  const handleSend = async () => {
    if (!input.trim() || isProcessing) return

    const userMessage = input.trim()
    addMessage('user', userMessage)
    setInput('')

    // Check if user is approving
    const approvalWords = ['yes', 'approve', 'continue', 'proceed', 'ok', 'sure']
    const isApproval = approvalWords.some(word => userMessage.toLowerCase().includes(word))

    if (awaitingApproval && isApproval && pendingAction) {
      if (pendingAction.step === 'preprocessing') {
        await handlePreprocessing()
      } else if (pendingAction.step === 'training') {
        await handleModelGeneration()
      }
    } else if (currentStep === 'idle' && !awaitingApproval) {
      // Initial prompt - start analysis
      await handleAnalysis(userMessage)
    } else {
      // User said something else
      addMessage('assistant', `I'm ${awaitingApproval ? 'waiting for your approval' : 'processing'}. ${awaitingApproval ? 'Please type "yes" to continue.' : 'Please wait...'}`)
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
          <div>
            <h2 className="font-semibold text-white">AI Assistant</h2>
            <div className="flex items-center gap-2 text-xs text-white/80">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span>Powered by Claude</span>
            </div>
          </div>
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
            placeholder={
              awaitingApproval 
                ? 'Type "yes" to approve...' 
                : 'Type your message...'
            }
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
        {currentStep !== 'idle' && (
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
            <Clock className="w-3 h-3" />
            <span>Processing: {currentStep}</span>
          </div>
        )}
      </div>
    </div>
  )
}
