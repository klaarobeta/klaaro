import { useState, useEffect } from 'react'
import {
  Settings,
  ChevronDown,
  ChevronRight,
  Hash,
  Type,
  Target,
  Trash2,
  Sparkles,
  Check,
  X,
  Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PreprocessingConfig, ColumnConfig, SplitConfig } from '@/services/preprocessingService'

interface PreprocessingConfigEditorProps {
  config: PreprocessingConfig
  onChange: (config: PreprocessingConfig) => void
  analysisColumns?: any[]
}

export default function PreprocessingConfigEditor({ 
  config, 
  onChange,
  analysisColumns = []
}: PreprocessingConfigEditorProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['columns', 'split'])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const updateColumn = (columnName: string, updates: Partial<ColumnConfig>) => {
    const newColumns = config.columns.map(col =>
      col.name === columnName ? { ...col, ...updates } : col
    )
    onChange({ ...config, columns: newColumns })
  }

  const updateSplit = (updates: Partial<SplitConfig>) => {
    onChange({ ...config, split: { ...config.split, ...updates } })
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'target': return <Target className="w-4 h-4 text-green-500" />
      case 'drop': return <Trash2 className="w-4 h-4 text-red-500" />
      default: return <Hash className="w-4 h-4 text-blue-500" />
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'target': return 'bg-green-100 text-green-700'
      case 'drop': return 'bg-red-100 text-red-700'
      default: return 'bg-blue-100 text-blue-700'
    }
  }

  const getColumnAnalysis = (columnName: string) => {
    return analysisColumns.find(c => c.name === columnName)
  }

  return (
    <div className="space-y-4">
      {/* Global Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h4 className="font-medium text-gray-900 mb-4">Global Settings</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Remove Duplicates</Label>
              <p className="text-xs text-gray-500">Remove duplicate rows from dataset</p>
            </div>
            <Switch
              checked={config.remove_duplicates}
              onCheckedChange={(checked) => onChange({ ...config, remove_duplicates: checked })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Handle Outliers</Label>
              <p className="text-xs text-gray-500">Clip or remove outlier values</p>
            </div>
            <Switch
              checked={config.handle_outliers}
              onCheckedChange={(checked) => onChange({ ...config, handle_outliers: checked })}
            />
          </div>
        </div>
      </div>

      {/* Train/Test Split */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('split')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Settings className="w-5 h-5 text-purple-500" />
            <span className="font-medium text-gray-900">Train/Test Split</span>
          </div>
          {expandedSections.includes('split') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('split') && (
          <div className="px-4 pb-4 border-t border-gray-100 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Test Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0.1}
                    max={0.5}
                    step={0.05}
                    value={config.split.test_size}
                    onChange={(e) => updateSplit({ test_size: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">
                    ({Math.round(config.split.test_size * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Validation Size</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={0.3}
                    step={0.05}
                    value={config.split.validation_size}
                    onChange={(e) => updateSplit({ validation_size: parseFloat(e.target.value) })}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">
                    ({Math.round(config.split.validation_size * 100)}%)
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Random Seed</Label>
                <Input
                  type="number"
                  min={0}
                  value={config.split.random_state}
                  onChange={(e) => updateSplit({ random_state: parseInt(e.target.value) })}
                  className="w-24"
                />
              </div>
            </div>
            
            {/* Visual representation of split */}
            <div className="mt-4">
              <div className="h-8 rounded-lg overflow-hidden flex">
                <div 
                  className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${(1 - config.split.test_size - config.split.validation_size) * 100}%` }}
                >
                  Train {Math.round((1 - config.split.test_size - config.split.validation_size) * 100)}%
                </div>
                {config.split.validation_size > 0 && (
                  <div 
                    className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                    style={{ width: `${config.split.validation_size * 100}%` }}
                  >
                    Val {Math.round(config.split.validation_size * 100)}%
                  </div>
                )}
                <div 
                  className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                  style={{ width: `${config.split.test_size * 100}%` }}
                >
                  Test {Math.round(config.split.test_size * 100)}%
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Column Configuration */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('columns')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Hash className="w-5 h-5 text-blue-500" />
            <span className="font-medium text-gray-900">Column Configuration</span>
            <span className="text-sm text-gray-500">({config.columns.length} columns)</span>
          </div>
          {expandedSections.includes('columns') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('columns') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <div className="overflow-x-auto">
              <table className="w-full text-sm mt-4">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Column</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Role</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Imputation</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Encoding</th>
                    <th className="text-left py-2 px-2 font-medium text-gray-500">Scaling</th>
                  </tr>
                </thead>
                <tbody>
                  {config.columns.map((col) => {
                    const analysis = getColumnAnalysis(col.name)
                    return (
                      <tr key={col.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            {getRoleIcon(col.role)}
                            <div>
                              <span className="font-medium text-gray-900">{col.name}</span>
                              {analysis && (
                                <span className="ml-2 text-xs text-gray-400">
                                  {analysis.semantic_type}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2">
                          <select
                            value={col.role}
                            onChange={(e) => updateColumn(col.name, { role: e.target.value as any })}
                            className={`px-2 py-1 rounded text-xs font-medium ${getRoleBadgeColor(col.role)}`}
                          >
                            <option value="feature">Feature</option>
                            <option value="target">Target</option>
                            <option value="drop">Drop</option>
                          </select>
                        </td>
                        <td className="py-3 px-2">
                          {col.role !== 'drop' && (
                            <select
                              value={col.imputation?.strategy || 'none'}
                              onChange={(e) => updateColumn(col.name, {
                                imputation: e.target.value === 'none' 
                                  ? undefined 
                                  : { strategy: e.target.value as any }
                              })}
                              className="px-2 py-1 rounded text-xs bg-gray-100 border-0"
                            >
                              <option value="none">None</option>
                              <option value="mean">Mean</option>
                              <option value="median">Median</option>
                              <option value="most_frequent">Mode</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {col.role === 'feature' && analysis?.semantic_type === 'categorical' && (
                            <select
                              value={col.encoding?.method || 'none'}
                              onChange={(e) => updateColumn(col.name, {
                                encoding: e.target.value === 'none' 
                                  ? undefined 
                                  : { method: e.target.value as any, drop_first: true }
                              })}
                              className="px-2 py-1 rounded text-xs bg-gray-100 border-0"
                            >
                              <option value="none">None</option>
                              <option value="onehot">One-Hot</option>
                              <option value="label">Label</option>
                            </select>
                          )}
                        </td>
                        <td className="py-3 px-2">
                          {col.role === 'feature' && analysis?.semantic_type === 'numeric' && (
                            <select
                              value={col.scaling?.method || 'none'}
                              onChange={(e) => updateColumn(col.name, {
                                scaling: e.target.value === 'none' 
                                  ? undefined 
                                  : { method: e.target.value as any }
                              })}
                              className="px-2 py-1 rounded text-xs bg-gray-100 border-0"
                            >
                              <option value="none">None</option>
                              <option value="standard">Standard</option>
                              <option value="minmax">MinMax</option>
                            </select>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Legend</span>
        </div>
        <div className="flex flex-wrap gap-4 text-xs text-gray-600">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-blue-500"></div>
            <span>Feature (used for training)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500"></div>
            <span>Target (prediction column)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500"></div>
            <span>Drop (excluded from training)</span>
          </div>
        </div>
      </div>
    </div>
  )
}
