import { useState, useEffect } from 'react'
import {
  CheckCircle2,
  Table2,
  BarChart2,
  Database,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PreprocessingResults } from '@/services/preprocessingService'

interface PreprocessingResultsViewProps {
  results: PreprocessingResults
  onContinue: () => void
}

export default function PreprocessingResultsView({ results, onContinue }: PreprocessingResultsViewProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['summary', 'preview'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const formatShape = (shape: number[] | null) => {
    if (!shape) return 'N/A'
    return `${shape[0].toLocaleString()} × ${shape[1]}`
  }

  return (
    <div className="space-y-6">
      {/* Success Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-green-900">Preprocessing Complete!</h3>
            <p className="text-sm text-green-700">
              Your data has been cleaned, encoded, and split into training and test sets.
            </p>
          </div>
          <Button onClick={onContinue} className="bg-green-600 hover:bg-green-700 gap-2">
            Continue to Training <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Features</span>
            <Table2 className="w-5 h-5 text-gray-400" />
          </div>
          <span className="text-2xl font-bold text-gray-900">{results.stats.total_features}</span>
          <p className="text-xs text-gray-500 mt-1">columns after encoding</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Training Samples</span>
            <Database className="w-5 h-5 text-blue-500" />
          </div>
          <span className="text-2xl font-bold text-blue-600">{results.stats.train_samples.toLocaleString()}</span>
          <p className="text-xs text-gray-500 mt-1">
            {results.sample_data.X_train_shape && formatShape(results.sample_data.X_train_shape)}
          </p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Test Samples</span>
            <Database className="w-5 h-5 text-green-500" />
          </div>
          <span className="text-2xl font-bold text-green-600">{results.stats.test_samples.toLocaleString()}</span>
          <p className="text-xs text-gray-500 mt-1">
            {results.sample_data.X_test_shape && formatShape(results.sample_data.X_test_shape)}
          </p>
        </div>
        
        {results.stats.val_samples > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Validation Samples</span>
              <Database className="w-5 h-5 text-yellow-500" />
            </div>
            <span className="text-2xl font-bold text-yellow-600">{results.stats.val_samples.toLocaleString()}</span>
            <p className="text-xs text-gray-500 mt-1">
              {results.sample_data.X_val_shape && formatShape(results.sample_data.X_val_shape)}
            </p>
          </div>
        )}
        
        {results.stats.duplicates_removed !== undefined && results.stats.duplicates_removed > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Duplicates Removed</span>
              <BarChart2 className="w-5 h-5 text-orange-500" />
            </div>
            <span className="text-2xl font-bold text-orange-600">{results.stats.duplicates_removed}</span>
            <p className="text-xs text-gray-500 mt-1">rows cleaned</p>
          </div>
        )}
      </div>

      {/* Feature Names */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('features')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Table2 className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900">Feature Names ({results.feature_names.length})</span>
          </div>
          {expandedSections.includes('features') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('features') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="flex flex-wrap gap-2 mt-4">
              {results.feature_names.map((name, idx) => (
                <span
                  key={idx}
                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono"
                >
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Data Preview */}
      {results.sample_data.X_train_preview && (
        <div className="bg-white rounded-xl border border-gray-200">
          <button
            onClick={() => toggleSection('preview')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-900">Data Preview (First 5 rows)</span>
            </div>
            {expandedSections.includes('preview') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.includes('preview') && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="overflow-x-auto mt-4">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-medium text-gray-500">#</th>
                      {Object.keys(results.sample_data.X_train_preview).map(col => (
                        <th key={col} className="text-left py-2 px-2 font-medium text-gray-500 truncate max-w-[100px]">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.keys(Object.values(results.sample_data.X_train_preview)[0] || {}).map((idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-2 text-gray-400">{idx}</td>
                        {Object.keys(results.sample_data.X_train_preview).map(col => {
                          const value = results.sample_data.X_train_preview![col][idx]
                          return (
                            <td key={col} className="py-2 px-2 font-mono text-gray-700">
                              {typeof value === 'number' ? value.toFixed(4) : String(value)}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Configuration Summary */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('config')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <BarChart2 className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900">Applied Transformations</span>
          </div>
          {expandedSections.includes('config') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('config') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="space-y-3 mt-4">
              {/* Split info */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <span className="text-sm font-medium text-gray-700">Train/Test Split: </span>
                <span className="text-sm text-gray-600">
                  {Math.round((1 - results.config.split.test_size - results.config.split.validation_size) * 100)}% train
                  {results.config.split.validation_size > 0 && `, ${Math.round(results.config.split.validation_size * 100)}% val`}
                  , {Math.round(results.config.split.test_size * 100)}% test
                </span>
              </div>
              
              {/* Column transformations */}
              <div className="space-y-2">
                {results.config.columns.filter(c => c.role === 'feature').map(col => {
                  const transforms = []
                  if (col.imputation) transforms.push(`Impute: ${col.imputation.strategy}`)
                  if (col.encoding) transforms.push(`Encode: ${col.encoding.method}`)
                  if (col.scaling) transforms.push(`Scale: ${col.scaling.method}`)
                  
                  if (transforms.length === 0) return null
                  
                  return (
                    <div key={col.name} className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-gray-700">{col.name}:</span>
                      <div className="flex gap-1">
                        {transforms.map((t, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
