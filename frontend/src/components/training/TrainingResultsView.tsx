import { useState } from 'react'
import {
  Trophy,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  BarChart3,
  Download,
  Package,
  Award,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { TrainingResults, TrainingResult } from '@/services/trainingService'
import { trainingService } from '@/services/trainingService'

interface TrainingResultsViewProps {
  projectId: string
  results: TrainingResults
  taskType: string
}

export default function TrainingResultsView({
  projectId,
  results,
  taskType,
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
    if (metricName.includes('cv_')) {
      return (value * 100).toFixed(2) + '%'
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
      cv_std: 'CV Std Dev',
    }
    return labels[metric] || metric
  }

  // Get primary metric for comparison
  const getPrimaryMetric = (result: TrainingResult): number => {
    if (taskType === 'classification') {
      return result.metrics?.f1_score || result.metrics?.accuracy || 0
    } else {
      return result.metrics?.r2_score || 0
    }
  }

  const getPrimaryMetricName = (): string => {
    return taskType === 'classification' ? 'F1 Score' : 'R² Score'
  }

  // Prepare data for bar chart
  const successfulResults = results.all_results.filter(r => r.status === 'completed')
  const maxMetricValue = Math.max(...successfulResults.map(r => Math.abs(getPrimaryMetric(r))))

  const handleDownloadModel = (modelId: string) => {
    const url = trainingService.getDownloadModelUrl(projectId, modelId)
    window.open(url, '_blank')
  }

  const handleDownloadPipeline = () => {
    const url = trainingService.getDownloadPipelineUrl(projectId)
    window.open(url, '_blank')
  }

  return (
    <div className="space-y-6">
      {/* Header with Downloads */}
      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl border border-green-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900 mb-1">Training Complete!</h3>
              <p className="text-gray-600">
                {results.models_successful} of {results.models_trained} models trained successfully
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleDownloadModel(results.best_model?.model_id || '')}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Best Model
            </Button>
            <Button
              size="sm"
              onClick={handleDownloadPipeline}
              className="bg-green-600 hover:bg-green-700 gap-2"
            >
              <Package className="w-4 h-4" />
              Complete Pipeline
            </Button>
          </div>
        </div>
      </div>

      {/* Best Model Card */}
      {results.best_model && (
        <div className="bg-white rounded-xl border-2 border-yellow-300 p-6">
          <div className="flex items-center gap-3 mb-4">
            <Award className="w-6 h-6 text-yellow-500" />
            <h4 className="text-lg font-semibold text-gray-900">Best Model</h4>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-1">Model</p>
              <p className="font-semibold text-gray-900">{results.best_model.model_name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-1">{getPrimaryMetricName()}</p>
              <p className="text-2xl font-bold text-green-600">
                {formatMetric(getPrimaryMetric(results.best_model), getPrimaryMetricName())}
              </p>
            </div>
            <div className="flex items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadModel(results.best_model?.model_id || '')}
                className="w-full gap-2"
              >
                <Download className="w-4 h-4" />
                Download Model
              </Button>
            </div>
          </div>

          {/* Best Model Metrics */}
          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-3">
            {results.best_model.metrics && Object.entries(results.best_model.metrics).map(([key, value]) => (
              <div key={key} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">{getMetricLabel(key)}</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatMetric(value as number, key)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PART 12 & 13: Model Comparison Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-blue-500" />
          <h4 className="text-lg font-semibold text-gray-900">Model Performance Comparison</h4>
        </div>

        {/* Bar Chart */}
        <div className="space-y-3 mb-6">
          {successfulResults.map((result, idx) => {
            const metricValue = getPrimaryMetric(result)
            const isNegative = metricValue < 0
            const barWidth = maxMetricValue > 0 ? (Math.abs(metricValue) / maxMetricValue) * 100 : 0
            const isBest = result.model_id === results.best_model?.model_id

            return (
              <div key={result.model_id} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {result.model_name}
                    </span>
                    {isBest && (
                      <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-medium rounded">
                        Best
                      </span>
                    )}
                  </div>
                  <span className={`text-sm font-semibold ${
                    isNegative ? 'text-red-600' : 'text-green-600'
                  }`}>
                    {formatMetric(metricValue, getPrimaryMetricName())}
                  </span>
                </div>
                <div className="h-8 bg-gray-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full ${
                      isBest ? 'bg-gradient-to-r from-yellow-400 to-yellow-500' :
                      isNegative ? 'bg-gradient-to-r from-red-400 to-red-500' :
                      'bg-gradient-to-r from-blue-400 to-blue-500'
                    } transition-all duration-500 flex items-center justify-end px-3`}
                    style={{ width: `${Math.max(barWidth, 5)}%` }}
                  >
                    {barWidth > 15 && (
                      <span className="text-xs font-medium text-white">
                        {formatMetric(metricValue, getPrimaryMetricName())}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Metrics Comparison Table */}
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                {successfulResults[0]?.metrics && Object.keys(successfulResults[0].metrics).slice(0, 4).map(metric => (
                  <th key={metric} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {getMetricLabel(metric)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {results.all_results.map((result) => (
                <tr key={result.model_id} className={result.model_id === results.best_model?.model_id ? 'bg-yellow-50' : ''}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{result.model_name}</span>
                      {result.model_id === results.best_model?.model_id && (
                        <Trophy className="w-4 h-4 text-yellow-500" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {result.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                        <CheckCircle2 className="w-3 h-3" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                        <XCircle className="w-3 h-3" />
                        Failed
                      </span>
                    )}
                  </td>
                  {result.metrics && Object.entries(result.metrics).slice(0, 4).map(([key, value]) => (
                    <td key={key} className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {formatMetric(value as number, key)}
                    </td>
                  ))}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {result.status === 'completed' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadModel(result.model_id)}
                        className="gap-2"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          💡 <strong>Next Steps:</strong> Download the complete pipeline to use this model in production, 
          or use the prediction feature below to test it with new data.
        </p>
      </div>
    </div>
  )
}
