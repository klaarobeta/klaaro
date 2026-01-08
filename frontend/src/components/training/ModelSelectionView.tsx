import { useState } from 'react'
import {
  Brain,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  Zap,
  Clock,
  Target,
  Info,
  Settings,
  Play,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { ModelSelection, ModelSelectionResult } from '@/services/trainingService'

interface ModelSelectionViewProps {
  selection: ModelSelectionResult
  onUpdateSelection: (models: ModelSelection[]) => void
  onStartTraining: () => void
  isTraining: boolean
}

export default function ModelSelectionView({
  selection,
  onUpdateSelection,
  onStartTraining,
  isTraining
}: ModelSelectionViewProps) {
  const [expanded, setExpanded] = useState<string[]>(['high'])
  const [models, setModels] = useState<ModelSelection[]>(selection.recommended_models)

  const toggleExpand = (section: string) => {
    setExpanded(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const toggleModel = (modelId: string) => {
    const updated = models.map(m =>
      m.model_id === modelId ? { ...m, selected: !m.selected } : m
    )
    setModels(updated)
    onUpdateSelection(updated)
  }

  const selectedCount = models.filter(m => m.selected).length

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 1: return 'High Priority'
      case 2: return 'Medium Priority'
      case 3: return 'Low Priority'
      default: return 'Other'
    }
  }

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-green-600 bg-green-50'
      case 2: return 'text-yellow-600 bg-yellow-50'
      case 3: return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-500 bg-gray-50'
    }
  }

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'low': return 'bg-green-100 text-green-700'
      case 'medium': return 'bg-yellow-100 text-yellow-700'
      case 'high': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getSpeedIcon = (speed: string) => {
    switch (speed) {
      case 'very_fast':
      case 'fast':
        return <Zap className="w-4 h-4 text-green-500" />
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'slow':
        return <Clock className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  // Group models by priority
  const groupedModels = models.reduce((acc, model) => {
    const key = model.priority.toString()
    if (!acc[key]) acc[key] = []
    acc[key].push(model)
    return acc
  }, {} as Record<string, ModelSelection[]>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
              <Brain className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Model Selection</h3>
              <p className="text-sm text-gray-600">
                {selectedCount} of {models.length} models selected for {selection.task_type}
              </p>
            </div>
          </div>
          <Button
            onClick={onStartTraining}
            disabled={selectedCount === 0 || isTraining}
            className="bg-orange-600 hover:bg-orange-700 gap-2"
          >
            {isTraining ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Start Training
          </Button>
        </div>
      </div>

      {/* Selection Reasoning */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
        <div className="flex items-start gap-2">
          <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium text-blue-900">Selection Reasoning:</span>
            <p className="text-sm text-blue-700 mt-1">{selection.selection_reasoning}</p>
          </div>
        </div>
      </div>

      {/* Data Characteristics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm text-gray-500">Training Samples</span>
          <p className="text-xl font-bold text-gray-900">{selection.data_characteristics.train_samples.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm text-gray-500">Test Samples</span>
          <p className="text-xl font-bold text-gray-900">{selection.data_characteristics.test_samples.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm text-gray-500">Features</span>
          <p className="text-xl font-bold text-gray-900">{selection.data_characteristics.total_features}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <span className="text-sm text-gray-500">Quality Score</span>
          <p className="text-xl font-bold text-gray-900">{selection.data_characteristics.quality_score}/100</p>
        </div>
      </div>

      {/* Model Groups */}
      {[1, 2, 3].map(priority => {
        const priorityModels = groupedModels[priority.toString()] || []
        if (priorityModels.length === 0) return null

        const key = priority.toString()
        const isExpanded = expanded.includes(key)

        return (
          <div key={priority} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleExpand(key)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-sm font-medium ${getPriorityColor(priority)}`}>
                  {getPriorityLabel(priority)}
                </span>
                <span className="text-gray-500">
                  {priorityModels.length} model{priorityModels.length > 1 ? 's' : ''}
                </span>
              </div>
              {isExpanded ? (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronRight className="w-5 h-5 text-gray-400" />
              )}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100">
                {priorityModels.map(model => (
                  <div
                    key={model.model_id}
                    className={`flex items-center justify-between p-4 border-b border-gray-100 last:border-b-0 ${
                      model.selected ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <Switch
                        checked={model.selected}
                        onCheckedChange={() => toggleModel(model.model_id)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-medium ${
                            model.selected ? 'text-gray-900' : 'text-gray-500'
                          }`}>
                            {model.name}
                          </span>
                          {model.selected && (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{model.reason}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      {/* Quick Actions */}
      <div className="flex items-center justify-between bg-gray-50 rounded-lg p-4">
        <span className="text-sm text-gray-600">Quick Actions:</span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const updated = models.map(m => ({ ...m, selected: true }))
              setModels(updated)
              onUpdateSelection(updated)
            }}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const updated = models.map(m => ({ ...m, selected: m.priority === 1 }))
              setModels(updated)
              onUpdateSelection(updated)
            }}
          >
            High Priority Only
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const updated = models.map(m => ({ ...m, selected: false }))
              setModels(updated)
              onUpdateSelection(updated)
            }}
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  )
}
