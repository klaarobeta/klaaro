import { useState } from 'react'
import {
  BarChart2,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Target,
  Lightbulb,
  Table2,
  Hash,
  Type,
  Calendar,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnalysisResults, ColumnAnalysis, Issue, Suggestion, TargetCandidate } from '@/services/analysisService'

interface AnalysisReportProps {
  analysis: AnalysisResults
  onSelectTarget: (column: string) => void
  selectedTarget?: string
}

export default function AnalysisReport({ analysis, onSelectTarget, selectedTarget }: AnalysisReportProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['quality', 'target', 'issues'])
  const [expandedColumns, setExpandedColumns] = useState<string[]>([])

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  const toggleColumn = (column: string) => {
    setExpandedColumns(prev =>
      prev.includes(column) ? prev.filter(c => c !== column) : [...prev, column]
    )
  }

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100'
    if (score >= 60) return 'text-yellow-600 bg-yellow-100'
    return 'text-red-600 bg-red-100'
  }

  const getSemanticIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-4 h-4 text-blue-500" />
      case 'categorical': return <Type className="w-4 h-4 text-purple-500" />
      case 'datetime': return <Calendar className="w-4 h-4 text-orange-500" />
      case 'text': return <Type className="w-4 h-4 text-gray-500" />
      default: return <Table2 className="w-4 h-4 text-gray-400" />
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'high': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'medium': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <Info className="w-4 h-4 text-blue-500" />
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'required': return 'bg-red-100 text-red-700'
      case 'recommended': return 'bg-yellow-100 text-yellow-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Quality Score */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Data Quality</span>
            <BarChart2 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-end gap-2">
            <span className={`text-3xl font-bold px-2 py-1 rounded ${getQualityColor(analysis.data_quality_score)}`}>
              {analysis.data_quality_score}
            </span>
            <span className="text-gray-500 mb-1">/ 100</span>
          </div>
        </div>

        {/* Task Type */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Detected Task</span>
            <Target className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold capitalize">{analysis.task_type}</span>
            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
              {Math.round(analysis.task_confidence * 100)}% confident
            </span>
          </div>
        </div>

        {/* Dataset Size */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Dataset Size</span>
            <Table2 className="w-5 h-5 text-gray-400" />
          </div>
          <div>
            <span className="text-xl font-bold">{analysis.total_rows.toLocaleString()}</span>
            <span className="text-gray-500"> rows × </span>
            <span className="text-xl font-bold">{analysis.total_columns}</span>
            <span className="text-gray-500"> cols</span>
          </div>
        </div>

        {/* Issues */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">Issues Found</span>
            <AlertTriangle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="flex items-center gap-3">
            {analysis.issue_summary.high > 0 && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertCircle className="w-4 h-4" /> {analysis.issue_summary.high}
              </span>
            )}
            {analysis.issue_summary.medium > 0 && (
              <span className="flex items-center gap-1 text-yellow-600">
                <AlertTriangle className="w-4 h-4" /> {analysis.issue_summary.medium}
              </span>
            )}
            {analysis.issue_summary.low > 0 && (
              <span className="flex items-center gap-1 text-blue-600">
                <Info className="w-4 h-4" /> {analysis.issue_summary.low}
              </span>
            )}
            {analysis.issues.length === 0 && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircle2 className="w-4 h-4" /> None
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Target Column Selection */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('target')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-900">Select Target Column</span>
            {selectedTarget && (
              <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                {selectedTarget}
              </span>
            )}
          </div>
          {expandedSections.includes('target') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('target') && (
          <div className="px-4 pb-4 border-t border-gray-100">
            <p className="text-sm text-gray-500 mt-3 mb-4">
              Select the column you want to predict. We've suggested candidates based on your data.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {analysis.target_candidates.map((candidate) => (
                <button
                  key={candidate.column}
                  onClick={() => onSelectTarget(candidate.column)}
                  className={`p-3 rounded-lg border text-left transition-colors ${
                    selectedTarget === candidate.column
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900 truncate">{candidate.column}</span>
                    {selectedTarget === candidate.column && (
                      <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {candidate.unique_values} unique values
                    {candidate.suggested_task && (
                      <span className="ml-2 px-1.5 py-0.5 bg-gray-100 rounded capitalize">
                        {candidate.suggested_task}
                      </span>
                    )}
                  </div>
                </button>
              ))}
              
              {/* Show other columns */}
              {analysis.column_analysis
                .filter(col => !analysis.target_candidates.find(t => t.column === col.name))
                .slice(0, 6)
                .map((col) => (
                  <button
                    key={col.name}
                    onClick={() => onSelectTarget(col.name)}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      selectedTarget === col.name
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900 truncate">{col.name}</span>
                      {selectedTarget === col.name && (
                        <CheckCircle2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-xs text-gray-500">
                      {col.unique_count} unique • {col.semantic_type}
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Issues Section */}
      {analysis.issues.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <button
            onClick={() => toggleSection('issues')}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <span className="font-semibold text-gray-900">Data Issues ({analysis.issues.length})</span>
            </div>
            {expandedSections.includes('issues') ? (
              <ChevronDown className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronRight className="w-5 h-5 text-gray-400" />
            )}
          </button>
          
          {expandedSections.includes('issues') && (
            <div className="px-4 pb-4 border-t border-gray-100 space-y-3 mt-3">
              {analysis.issues.map((issue, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-lg border-l-4 ${
                    issue.severity === 'high' ? 'border-red-500 bg-red-50' :
                    issue.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                    'border-blue-500 bg-blue-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getSeverityIcon(issue.severity)}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{issue.message}</p>
                      <p className="text-xs text-gray-600 mt-1">{issue.suggestion}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Suggestions Section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('suggestions')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            <span className="font-semibold text-gray-900">Recommendations ({analysis.suggestions.length})</span>
          </div>
          {expandedSections.includes('suggestions') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('suggestions') && (
          <div className="px-4 pb-4 border-t border-gray-100 space-y-3 mt-3">
            {analysis.suggestions.map((suggestion, idx) => (
              <div key={idx} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-gray-900">{suggestion.title}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{suggestion.description}</p>
                    {suggestion.columns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {suggestion.columns.slice(0, 5).map(col => (
                          <span key={col} className="px-2 py-0.5 bg-white border border-gray-200 rounded text-xs">
                            {col}
                          </span>
                        ))}
                        {suggestion.columns.length > 5 && (
                          <span className="text-xs text-gray-500">+{suggestion.columns.length - 5} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Column Details */}
      <div className="bg-white rounded-xl border border-gray-200">
        <button
          onClick={() => toggleSection('columns')}
          className="w-full flex items-center justify-between p-4 text-left"
        >
          <div className="flex items-center gap-3">
            <Table2 className="w-5 h-5 text-blue-500" />
            <span className="font-semibold text-gray-900">Column Details ({analysis.total_columns})</span>
          </div>
          {expandedSections.includes('columns') ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </button>
        
        {expandedSections.includes('columns') && (
          <div className="px-4 pb-4 border-t border-gray-100 mt-3">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Column</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Type</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Missing</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Unique</th>
                    <th className="text-left py-2 px-3 font-medium text-gray-500">Stats</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.column_analysis.map((col) => (
                    <tr key={col.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-3">
                        <div className="flex items-center gap-2">
                          {getSemanticIcon(col.semantic_type)}
                          <span className="font-medium text-gray-900">{col.name}</span>
                        </div>
                      </td>
                      <td className="py-2 px-3">
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs capitalize">
                          {col.semantic_type}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <span className={col.missing_pct > 20 ? 'text-red-600' : col.missing_pct > 0 ? 'text-yellow-600' : 'text-green-600'}>
                          {col.missing_pct}%
                        </span>
                      </td>
                      <td className="py-2 px-3">{col.unique_count.toLocaleString()}</td>
                      <td className="py-2 px-3 text-gray-500 text-xs">
                        {col.semantic_type === 'numeric' && col.mean !== undefined && (
                          <span>μ={col.mean.toFixed(2)}, σ={col.std?.toFixed(2)}</span>
                        )}
                        {col.semantic_type === 'categorical' && col.top_values && (
                          <span>Top: {Object.keys(col.top_values)[0]}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
