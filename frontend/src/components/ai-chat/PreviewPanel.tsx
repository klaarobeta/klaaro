import { useState, useEffect } from 'react'
import { BarChart, LineChart, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react'

interface PreviewPanelProps {
  projectId: string
  workflowStatus: any
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

export default function PreviewPanel({ projectId, workflowStatus }: PreviewPanelProps) {
  const [visualizationData, setVisualizationData] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const currentStep = workflowStatus?.status || 'idle'
  const workflowLog = workflowStatus?.workflow_log || []

  // Get data from workflow log
  const analysisData = workflowLog.find((log: any) => log.step === 'analysis')?.result
  const preprocessingData = workflowLog.find((log: any) => log.step === 'preprocessing')?.result
  const modelData = workflowLog.find((log: any) => log.step === 'model_generation')?.result

  // Load visualization when trained
  useEffect(() => {
    if (currentStep === 'trained') {
      loadVisualizationData()
    }
  }, [currentStep])

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
          <div className="flex items-center gap-2">
            {currentStep !== 'idle' && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="capitalize">{currentStep}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentStep === 'idle' && (
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

        {/* Analysis Results */}
        {analysisData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Data Analysis</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 font-medium uppercase mb-1">Task Type</p>
                <p className="text-lg font-semibold text-blue-900 capitalize">{analysisData.task_type}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <p className="text-xs text-purple-600 font-medium uppercase mb-1">Target Variable</p>
                <p className="text-lg font-semibold text-purple-900">{analysisData.target_column}</p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Data Quality Issues:</p>
              <div className="space-y-1">
                {analysisData.data_quality?.issues?.map((issue: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-orange-500">•</span>
                    <span>{issue}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Preprocessing Steps:</p>
              <div className="space-y-2">
                {analysisData.preprocessing_steps?.map((step: any, idx: number) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-xs flex items-center justify-center font-medium">
                        {idx + 1}
                      </span>
                      <p className="text-sm font-medium text-gray-900">{step.description}</p>
                    </div>
                    <p className="text-xs text-gray-500 ml-8">
                      Columns: {step.columns?.join(', ')} | Method: {step.method}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preprocessing Results */}
        {preprocessingData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Preprocessing Complete</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-900">{preprocessingData.details?.features_created}</p>
                <p className="text-xs text-green-600 mt-1">Features Created</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-blue-900">{preprocessingData.details?.train_samples}</p>
                <p className="text-xs text-blue-600 mt-1">Training Samples</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-purple-900">{preprocessingData.details?.test_samples}</p>
                <p className="text-xs text-purple-600 mt-1">Test Samples</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-2">Steps Applied:</p>
              <ul className="space-y-1">
                {preprocessingData.details?.steps_applied?.map((step: string, idx: number) => (
                  <li key={idx} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Model Training Results */}
        {modelData && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <h3 className="font-semibold text-gray-900">Model Trained</h3>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-2">Best Model</p>
              <p className="text-2xl font-bold text-gray-900 mb-4">{modelData.model_name}</p>
              
              <div className="grid grid-cols-2 gap-3">
                {modelData.metrics && Object.entries(modelData.metrics).map(([key, value]: [string, any]) => (
                  <div key={key} className="bg-white rounded-lg p-3">
                    <p className="text-xs text-gray-500 uppercase mb-1">{key}</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {typeof value === 'number' ? (value * 100).toFixed(2) + '%' : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Model Visualization */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : visualizationData ? (
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Model Visualization</h4>
                
                {/* Regression Plot */}
                {visualizationData.task_type === 'regression' && visualizationData.regression_plot && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-4">Actual vs Predicted</h5>
                    <div className="relative h-64">
                      <svg className="w-full h-full" viewBox="0 0 400 200">
                        {/* Axes */}
                        <line x1="40" y1="180" x2="380" y2="180" stroke="#d1d5db" strokeWidth="2" />
                        <line x1="40" y1="20" x2="40" y2="180" stroke="#d1d5db" strokeWidth="2" />
                        
                        {/* Regression line (ideal: y=x) */}
                        <line x1="40" y1="180" x2="380" y2="20" stroke="#3b82f6" strokeWidth="2" strokeDasharray="5,5" />
                        
                        {/* Data points */}
                        {visualizationData.regression_plot.actual.map((actual: number, idx: number) => {
                          const predicted = visualizationData.regression_plot.predicted[idx]
                          const maxVal = Math.max(...visualizationData.regression_plot.actual, ...visualizationData.regression_plot.predicted)
                          const minVal = Math.min(...visualizationData.regression_plot.actual, ...visualizationData.regression_plot.predicted)
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
                              opacity="0.6"
                            />
                          )
                        })}
                        
                        {/* Labels */}
                        <text x="200" y="198" textAnchor="middle" className="text-xs fill-gray-600">
                          Actual Values
                        </text>
                        <text x="20" y="100" textAnchor="middle" className="text-xs fill-gray-600" transform="rotate(-90 20 100)">
                          Predicted
                        </text>
                      </svg>
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Points closer to the diagonal line indicate better predictions
                    </p>
                  </div>
                )}

                {/* Classification Confusion Matrix */}
                {visualizationData.task_type === 'classification' && visualizationData.confusion_matrix && (
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h5 className="text-sm font-medium text-gray-700 mb-4">Confusion Matrix</h5>
                    <div className="grid gap-1" style={{ 
                      gridTemplateColumns: `repeat(${visualizationData.confusion_matrix.length}, 1fr)` 
                    }}>
                      {visualizationData.confusion_matrix.map((row: number[], i: number) =>
                        row.map((value: number, j: number) => {
                          const maxValue = Math.max(...visualizationData.confusion_matrix.flat())
                          const intensity = maxValue > 0 ? value / maxValue : 0
                          return (
                            <div
                              key={`${i}-${j}`}
                              className="aspect-square flex items-center justify-center rounded"
                              style={{
                                backgroundColor: `rgba(59, 130, 246, ${intensity})`,
                                color: intensity > 0.5 ? 'white' : '#1f2937'
                              }}
                            >
                              <span className="text-sm font-semibold">{value}</span>
                            </div>
                          )
                        })
                      )}
                    </div>
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Diagonal shows correct predictions, off-diagonal shows errors
                    </p>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
