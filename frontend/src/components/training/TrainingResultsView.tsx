import { useState } from 'react'
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  BarChart2,
  TrendingUp,
  Award,
  Download,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrainingResults, TrainingResult } from '@/services/trainingService'

interface TrainingResultsViewProps {
  results: TrainingResults
  taskType: string
  onContinue?: () => void
}

export default function TrainingResultsView({
  results,
  taskType,
  onContinue
}: TrainingResultsViewProps) {
  const [expandedModels, setExpandedModels] = useState<string[]>([results.best_model?.model_id || ''])

  const toggleModel = (modelId: string) => {
    setExpandedModels(prev =>
      prev.includes(modelId) ? prev.filter(m => m !== modelId) : [...prev, modelId]
    )
  }

  const formatMetric = (value: number, metricName: string): string => {
    if (metricName === 'mse' || metricName === 'rmse' || metricName === 'mae') {
      return value.toFixed(4)
    }
    return (value * 100).toFixed(2) + '%'
  }

  const getMetricLabel = (metric: string): string => {
    const labels: Record<string, string> = {
      accuracy: 'Accuracy',
      precision: 'Precision',
      recall: 'Recall',
      f1_score: 'F1 Score',
      auc_roc: 'AUC-ROC',
      mse: 'MSE',
      rmse: 'RMSE',
      mae: 'MAE',
      r2_score: 'R² Score',
      cv_mean: 'CV Mean',
      cv_std: 'CV Std',
    }
    return labels[metric] || metric
  }

  const primaryMetric = taskType === 'classification' ? 'f1_score' : 'r2_score'

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <Trophy className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Training Complete!</h3>
            <p className="text-sm text-green-700">
              Successfully trained {results.models_successful} of {results.models_trained} models
            </p>
          </div>
          {onContinue && (
            <Button onClick={onContinue} className="bg-green-600 hover:bg-green-700 gap-2">
              Continue <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Best Model Card */}
      {results.best_model && (
        <div className="bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border border-yellow-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-yellow-600" />
            <h3 className="font-semibold text-gray-900">Best Model</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-gray-900">{results.best_model.model_name}</h4>
              <p className="text-sm text-gray-600">Based on {getMetricLabel(primaryMetric)}</p>
            </div>
            <div className="text-right">
              <span className="text-3xl font-bold text-yellow-600">
                {results.best_model.metrics && formatMetric(
                  results.best_model.metrics[primaryMetric],
                  primaryMetric
                )}
              </span>
              <p className="text-sm text-gray-500">{getMetricLabel(primaryMetric)}</p>
            </div>
          </div>
          
          {/* Best Model Metrics */}
          {results.best_model.metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              {Object.entries(results.best_model.metrics)
                .filter(([key]) => !['cv_mean', 'cv_std'].includes(key))
                .map(([metric, value]) => (
                  <div key={metric} className="bg-white/50 rounded-lg p-3">
                    <span className="text-xs text-gray-500">{getMetricLabel(metric)}</span>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatMetric(value, metric)}
                    </p>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* All Models Results */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">All Model Results</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {results.all_results.map((result, index) => {
            const isExpanded = expandedModels.includes(result.model_id)
            const isBest = results.best_model?.model_id === result.model_id

            return (
              <div key={result.model_id} className="">
                <button
                  onClick={() => toggleModel(result.model_id)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-600">
                      {index + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{result.model_name}</span>
                      {isBest && (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                          Best
                        </span>
                      )}
                      {result.status === 'completed' ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {result.status === 'completed' && result.metrics && (
                      <span className="text-sm font-medium text-gray-700">
                        {getMetricLabel(primaryMetric)}: {formatMetric(result.metrics[primaryMetric], primaryMetric)}
                      </span>
                    )}
                    {result.status === 'failed' && (
                      <span className="text-sm text-red-600">Failed</span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 bg-gray-50">
                    {result.status === 'completed' && result.metrics ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.entries(result.metrics).map(([metric, value]) => (
                          <div key={metric} className="bg-white rounded-lg p-3 border border-gray-100">
                            <span className="text-xs text-gray-500">{getMetricLabel(metric)}</span>
                            <p className="text-lg font-semibold text-gray-900">
                              {formatMetric(value, metric)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-red-50 rounded-lg p-4">
                        <p className="text-sm text-red-700">Error: {result.error}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Comparison Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BarChart2 className="w-5 h-5 text-blue-500" />
          <h3 className="font-semibold text-gray-900">Model Comparison</h3>
        </div>
        <div className="space-y-3">
          {results.all_results
            .filter(r => r.status === 'completed' && r.metrics)
            .map(result => {
              const score = result.metrics?.[primaryMetric] || 0
              const maxScore = taskType === 'classification' ? 1 : 1
              const percentage = (score / maxScore) * 100

              return (
                <div key={result.model_id} className="flex items-center gap-4">
                  <span className="w-40 text-sm text-gray-700 truncate">{result.model_name}</span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        results.best_model?.model_id === result.model_id
                          ? 'bg-yellow-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                    />
                  </div>
                  <span className="w-20 text-sm font-medium text-gray-900 text-right">
                    {formatMetric(score, primaryMetric)}
                  </span>
                </div>
              )
            })}
        </div>
      </div>
    </div>
  )
}
