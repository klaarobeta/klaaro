import { useState } from 'react'
import { BarChart3, TrendingUp, Target, Zap } from 'lucide-react'
import { TrainingResults } from '@/services/trainingService'

interface ModelVisualizationProps {
  projectId: string
  results: TrainingResults
  taskType: string
  featureNames?: string[]
}

export default function ModelVisualization({
  projectId,
  results,
  taskType,
  featureNames = []
}: ModelVisualizationProps) {
  const [activeTab, setActiveTab] = useState<'comparison' | 'performance' | 'insights'>('comparison')

  // Get top performing models
  const topModels = results.all_results
    .filter(r => r.status === 'completed')
    .slice(0, 5)

  // Calculate metrics for visualization
  const getMetricValue = (model: any, metric: string) => {
    return model.metrics?.[metric] || 0
  }

  const primaryMetric = taskType === 'classification' ? 'f1_score' : 'r2_score'
  const maxMetric = Math.max(...topModels.map(m => Math.abs(getMetricValue(m, primaryMetric))))

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Model Insights & Visualization</h3>
            <p className="text-sm text-gray-500">Explore your model's performance</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <button
          onClick={() => setActiveTab('comparison')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'comparison'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Model Comparison
        </button>
        <button
          onClick={() => setActiveTab('performance')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'performance'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Performance Metrics
        </button>
        <button
          onClick={() => setActiveTab('insights')}
          className={`px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
            activeTab === 'insights'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Key Insights
        </button>
      </div>

      {/* Content */}
      <div className="space-y-6">
        {activeTab === 'comparison' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Top 5 Models Performance</h4>
            
            {/* Performance bars */}
            <div className="space-y-3">
              {topModels.map((model, idx) => {
                const value = getMetricValue(model, primaryMetric)
                const percentage = maxMetric > 0 ? (Math.abs(value) / maxMetric) * 100 : 0
                const isBest = idx === 0

                return (
                  <div key={model.model_id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-medium">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{model.model_name}</span>
                        {isBest && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded font-medium">
                            Best
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {(value * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isBest
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-500'
                            : 'bg-gradient-to-r from-purple-400 to-purple-500'
                        }`}
                        style={{ width: `${Math.max(percentage, 5)}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Radar chart simulation */}
            <div className="mt-6 p-6 bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-900 mb-4">Best Model Metrics Distribution</h5>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {results.best_model?.metrics && Object.entries(results.best_model.metrics).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-lg p-4">
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{key}</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Performance Breakdown</h4>
            
            {/* Metrics grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topModels.map((model, idx) => (
                <div key={model.model_id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium text-gray-900">{model.model_name}</h5>
                    {idx === 0 && (
                      <Zap className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {model.metrics && Object.entries(model.metrics).slice(0, 4).map(([key, value]) => (
                      <div key={key} className="bg-gray-50 rounded p-2">
                        <p className="text-xs text-gray-500">{key}</p>
                        <p className="text-sm font-semibold text-gray-900">
                          {typeof value === 'number' ? (value * 100).toFixed(1) + '%' : value}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Performance summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Target className="w-5 h-5 text-blue-600 mt-0.5" />
                <div>
                  <h5 className="font-medium text-blue-900 mb-1">Performance Summary</h5>
                  <p className="text-sm text-blue-800">
                    Your best model ({results.best_model?.model_name}) achieved{' '}
                    <span className="font-semibold">
                      {(getMetricValue(results.best_model, primaryMetric) * 100).toFixed(2)}%
                    </span>{' '}
                    on the primary metric. This indicates{' '}
                    {getMetricValue(results.best_model, primaryMetric) > 0.8
                      ? 'excellent'
                      : getMetricValue(results.best_model, primaryMetric) > 0.6
                      ? 'good'
                      : 'moderate'}{' '}
                    performance on your {taskType} task.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'insights' && (
          <div className="space-y-4">
            <h4 className="font-medium text-gray-900">Key Insights</h4>
            
            <div className="space-y-3">
              {/* Model selection insight */}
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-green-900 mb-1">Best Model Identified</h5>
                  <p className="text-sm text-green-800">
                    <span className="font-semibold">{results.best_model?.model_name}</span> performed best
                    among {results.models_trained} trained models. It's well-suited for your {taskType} task.
                  </p>
                </div>
              </div>

              {/* Training success insight */}
              <div className="flex items-start gap-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-purple-900 mb-1">Training Success Rate</h5>
                  <p className="text-sm text-purple-800">
                    {results.models_successful} out of {results.models_trained} models trained successfully (
                    {((results.models_successful / results.models_trained) * 100).toFixed(0)}% success rate).
                    All models are ready for deployment.
                  </p>
                </div>
              </div>

              {/* Feature count insight */}
              {featureNames.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Target className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h5 className="font-medium text-blue-900 mb-1">Feature Analysis</h5>
                    <p className="text-sm text-blue-800">
                      Your model uses {featureNames.length} features for prediction. The model has learned
                      patterns from your data and is ready to make predictions on new inputs.
                    </p>
                  </div>
                </div>
              )}

              {/* Recommendation */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
                  <Zap className="w-4 h-4 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-yellow-900 mb-1">Next Steps</h5>
                  <p className="text-sm text-yellow-800">
                    Your model is production-ready! You can now download it, make predictions on new data,
                    or use the chat assistant below to interact with your model naturally.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
