import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { trainingService } from '@/services/trainingService'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ModelChatAgentProps {
  projectId: string
  taskType: string
  featureNames: string[]
  modelName: string
  targetColumn: string
}

export default function ModelChatAgent({
  projectId,
  taskType,
  featureNames,
  modelName,
  targetColumn
}: ModelChatAgentProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hi! I'm your AI assistant trained on the **${modelName}** model. I can help you make predictions by answering questions in natural language. Just describe your input and I'll predict the ${targetColumn}!\n\nFor example, try asking:\n• "What would be the ${targetColumn} for a house with 2000 sqft, 3 bedrooms, 2 bathrooms?"\n• "Predict ${targetColumn} for 1500 square feet"\n• Just describe your scenario naturally!`,
      timestamp: new Date()
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Parse natural language to extract features
  const parseUserQuery = (query: string): Record<string, any> | null => {
    const lowerQuery = query.toLowerCase()
    const extractedFeatures: Record<string, any> = {}

    // Common patterns for feature extraction
    const patterns = [
      // Numbers followed by feature names
      { regex: /(\d+)\s*(sqft|square\s*feet?|sq\s*ft)/i, feature: 'sqft_living' },
      { regex: /(\d+)\s*(bedrooms?|beds?|br)/i, feature: 'bedrooms' },
      { regex: /(\d+)\s*(bathrooms?|baths?|ba)/i, feature: 'bathrooms' },
      { regex: /(\d+)\s*(floors?)/i, feature: 'floors' },
      { regex: /(\d+)\s*(grade)/i, feature: 'grade' },
      { regex: /(\d+)\s*(condition)/i, feature: 'condition' },
      { regex: /(\d+)\s*(view)/i, feature: 'view' },
      { regex: /(\d+)\s*(lot|lot\s*size)/i, feature: 'sqft_lot' },
      { regex: /(waterfront|ocean\s*view|water)/i, feature: 'waterfront', value: 1 },
      { regex: /(\d{4})\s*(built|year)/i, feature: 'yr_built' },
      { regex: /(\d{4})\s*(renovated)/i, feature: 'yr_renovated' },
      { regex: /zipcode\s*(\d{5})/i, feature: 'zipcode' },
    ]

    // Extract features using patterns
    patterns.forEach(({ regex, feature, value }) => {
      const match = query.match(regex)
      if (match) {
        extractedFeatures[feature] = value !== undefined ? value : parseFloat(match[1])
      }
    })

    // If no features extracted, try to find any numbers
    if (Object.keys(extractedFeatures).length === 0) {
      const numbers = query.match(/\d+/g)
      if (numbers && numbers.length > 0) {
        // Map to most common features
        if (numbers[0]) extractedFeatures['sqft_living'] = parseFloat(numbers[0])
        if (numbers[1]) extractedFeatures['bedrooms'] = parseFloat(numbers[1])
        if (numbers[2]) extractedFeatures['bathrooms'] = parseFloat(numbers[2])
      }
    }

    return Object.keys(extractedFeatures).length > 0 ? extractedFeatures : null
  }

  // Generate default values for missing features
  const fillMissingFeatures = (extracted: Record<string, any>): Record<string, any> => {
    const defaults: Record<string, any> = {
      bedrooms: 3,
      bathrooms: 2,
      sqft_living: 1800,
      sqft_lot: 5000,
      floors: 1,
      waterfront: 0,
      view: 0,
      condition: 3,
      grade: 7,
      yr_built: 2000,
      yr_renovated: 0,
      zipcode: '98001',
      lat: 47.5,
      long: -122.3,
    }

    const complete: Record<string, any> = { ...defaults }
    
    // Override with extracted values
    Object.keys(extracted).forEach(key => {
      complete[key] = extracted[key]
    })

    return complete
  }

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Parse user query
      const extracted = parseUserQuery(input)
      
      if (!extracted) {
        // Couldn't extract features
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I couldn't understand your query. Please try describing your scenario with specific values.\n\nFor example:\n• "Predict for 2000 sqft, 3 bedrooms, 2 bathrooms"\n• "What's the ${targetColumn} for a house with 1500 square feet?"`,
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
        setIsLoading(false)
        return
      }

      // Fill missing features with defaults
      const completeFeatures = fillMissingFeatures(extracted)

      // Make prediction
      const result = await trainingService.predict(projectId, [completeFeatures])

      // Format response
      const prediction = result.predictions[0]
      const extractedList = Object.entries(extracted)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')

      let responseText = `Based on your input (${extractedList}), `
      
      if (taskType === 'classification') {
        responseText += `the model predicts: **${prediction}**`
      } else {
        responseText += `the model predicts the ${targetColumn} to be: **${
          typeof prediction === 'number' ? prediction.toFixed(2) : prediction
        }**`
      }

      responseText += `\n\n*Model used: ${result.model_name}*`
      responseText += `\n\n💡 Note: I filled in default values for features you didn't specify. Ask me anything else!`

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error: any) {
      toast({
        title: 'Prediction failed',
        description: error.message,
        variant: 'destructive'
      })

      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error making the prediction: ${error.message}. Please try again.`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl border-2 border-blue-200 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-white">AI Model Assistant</h3>
            <p className="text-xs text-white/80">Ask questions in natural language</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="h-[400px] overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {message.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
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
        {isLoading && (
          <div className="flex gap-3 justify-start">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center flex-shrink-0">
              <Bot className="w-4 h-4 text-white" />
            </div>
            <div className="bg-gray-100 rounded-2xl px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-gray-600" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask me to predict ${targetColumn}...`}
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          💡 Tip: Describe your scenario naturally. I'll extract the features and make a prediction!
        </p>
      </div>
    </div>
  )
}
