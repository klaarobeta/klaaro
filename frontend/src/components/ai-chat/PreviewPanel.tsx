import { useState, useEffect } from 'react'
import { BarChart, CheckCircle2, Loader2 } from 'lucide-react'

interface PreviewPanelProps {
  projectId: string
  workflowStatus: any
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export default function PreviewPanel({ projectId, workflowStatus }: PreviewPanelProps) {
  const [visualizationData, setVisualizationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const currentStep = workflowStatus?.status || 'idle'
  const isTrained = currentStep === 'trained'

  // Load visualization when trained
  useEffect(() => {
    if (isTrained && !visualizationData && !loading) {
      loadVisualizationData()
    }
  }, [isTrained, projectId])

  const loadVisualizationData = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/ai/${projectId}/visualization-data`)
      if (response.ok) {
        const data = await response.json()
        setVisualizationData(data)
      }
    } catch (error) {
      console.error('Failed to load visualization:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white p-4 border-b">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Preview</h2>
          {isTrained && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Trained</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Idle state */}
        {!isTrained && currentStep === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center mb-4">
              <BarChart className="w-10 h-10 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Build</h3>
            <p className="text-sm text-gray-500 max-w-sm">
              Results will appear here as your model is being built. Start by describing what you want to predict in the chat.
            </p>
          </div>
        )}

        {/* Trained model visualization */}
        {isTrained && visualizationData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Model Trained Successfully</h3>
            </div>

            {/* Model Info */}
            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Model</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">{visualizationData.model_name}</p>
              
              <div className="grid grid-cols-3 gap-3">
                {visualizationData.metrics && Object.entries(visualizationData.metrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">{key}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {typeof value === 'number' ? value.toFixed(2) : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Regression Plot */}
            {visualizationData.task_type === 'regression' && visualizationData.regression_plot && (
              <div className="bg-gray-50 rounded-lg p-6">
                <h5 className="text-sm font-medium text-gray-700 mb-4">Prediction Quality: Actual vs Predicted</h5>
                <div className="relative h-64 bg-white rounded border">
                  <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid meet">
                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                      </pattern>
                    </defs>
                    <rect width="400" height="200" fill="url(#grid)" />
                    
                    {/* Axes */}
                    <line x1="40" y1="180" x2="380" y2="180" stroke="#374151" strokeWidth="2" />
                    <line x1="40" y1="20" x2="40" y2="180" stroke="#374151" strokeWidth="2" />
                    
                    {/* Perfect prediction line */}
                    <line x1="40" y1="180" x2="380" y2="20" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" opacity="0.5" />
                    <text x="350" y="35" fill="#3b82f6" fontSize="10">Perfect</text>
                    
                    {/* Data points */}
                    {visualizationData.regression_plot.actual.map((actual: number, idx: number) => {
                      const predicted = visualizationData.regression_plot.predicted[idx]
                      const allActual = visualizationData.regression_plot.actual
                      const allPredicted = visualizationData.regression_plot.predicted
                      const maxVal = Math.max(...allActual, ...allPredicted)
                      const minVal = Math.min(...allActual, ...allPredicted)
                      const range = maxVal - minVal || 1
                      
                      const x = 40 + ((actual - minVal) / range) * 340
                      const y = 180 - ((predicted - minVal) / range) * 160
                      
                      return (
                        <circle
                          key={idx}
                          cx={x}
                          cy={y}
                          r="3"
                          fill="#8b5cf6"
                          opacity="0.7"
                        />
                      )
                    })}
                    
                    {/* Labels */}
                    <text x="210" y="198" textAnchor="middle" fontSize="12" fill="#6b7280">Actual Values →</text>
                    <text x="15" y="100" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90 15 100)">← Predicted</text>
                  </svg>
                </div>
                <p className="text-xs text-gray-500 text-center mt-2">
                  Points closer to the blue diagonal line = better predictions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Loading state */}
        {isTrained && !visualizationData && loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Loading visualization...</span>
          </div>
        )}
      </div>
    </div>
  )
}
