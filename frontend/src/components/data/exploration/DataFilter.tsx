import { useState, useEffect } from 'react'
import { Filter, Search, X, Plus, Loader2 } from 'lucide-react'
import { filterData, searchData, getUniqueValues, FilterRequest } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  columns: string[]
  onFilterResult: (rows: Record<string, string>[], count: number) => void
}

interface FilterCondition {
  id: string
  column: string
  operator: string
  value: string
}

const operators = [
  { value: 'eq', label: '=' },
  { value: 'ne', label: '≠' },
  { value: 'gt', label: '>' },
  { value: 'lt', label: '<' },
  { value: 'gte', label: '≥' },
  { value: 'lte', label: '≤' },
  { value: 'contains', label: 'contains' },
  { value: 'startswith', label: 'starts with' },
  { value: 'endswith', label: 'ends with' },
]

export default function DataFilter({ datasetId, columns, onFilterResult }: Props) {
  const [filters, setFilters] = useState<FilterCondition[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchColumn, setSearchColumn] = useState('')
  const [loading, setLoading] = useState(false)
  const [uniqueValues, setUniqueValues] = useState<Record<string, string[]>>({})

  const addFilter = () => {
    setFilters([...filters, {
      id: Date.now().toString(),
      column: columns[0] || '',
      operator: 'eq',
      value: ''
    }])
  }

  const removeFilter = (id: string) => {
    setFilters(filters.filter(f => f.id !== id))
  }

  const updateFilter = (id: string, field: keyof FilterCondition, value: string) => {
    setFilters(filters.map(f => f.id === id ? { ...f, [field]: value } : f))
  }

  const loadUniqueValues = async (column: string) => {
    if (uniqueValues[column]) return
    try {
      const result = await getUniqueValues(datasetId, column)
      setUniqueValues(prev => ({ ...prev, [column]: result.values }))
    } catch (err) {
      console.error('Failed to load unique values:', err)
    }
  }

  const applyFilters = async () => {
    setLoading(true)
    try {
      const validFilters = filters.filter(f => f.column && f.value)
      if (validFilters.length > 0) {
        const result = await filterData(datasetId, validFilters.map(f => ({
          column: f.column,
          operator: f.operator,
          value: f.value
        })))
        onFilterResult(result.rows, result.filtered_count)
      }
    } catch (err) {
      console.error('Filter failed:', err)
    } finally {
      setLoading(false)
    }
  }

  const applySearch = async () => {
    if (!searchQuery.trim()) return
    setLoading(true)
    try {
      const result = await searchData(datasetId, searchQuery, searchColumn || undefined)
      onFilterResult(result.rows, result.match_count)
    } catch (err) {
      console.error('Search failed:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySearch()}
            placeholder="Search in data..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <select
          value={searchColumn}
          onChange={(e) => setSearchColumn(e.target.value)}
          className="px-3 py-2 border rounded-lg bg-white"
        >
          <option value="">All columns</option>
          {columns.map(col => (
            <option key={col} value={col}>{col}</option>
          ))}
        </select>
        <button
          onClick={applySearch}
          disabled={loading || !searchQuery.trim()}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {/* Filters */}
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-gray-700">Filters</span>
          </div>
          <button
            onClick={addFilter}
            className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
          >
            <Plus className="w-4 h-4" /> Add filter
          </button>
        </div>

        {filters.length === 0 ? (
          <p className="text-sm text-gray-500">No filters applied. Click "Add filter" to get started.</p>
        ) : (
          <div className="space-y-2">
            {filters.map((filter, idx) => (
              <div key={filter.id} className="flex items-center gap-2">
                {idx > 0 && <span className="text-xs text-gray-500 w-8">AND</span>}
                {idx === 0 && <span className="w-8" />}
                <select
                  value={filter.column}
                  onChange={(e) => {
                    updateFilter(filter.id, 'column', e.target.value)
                    loadUniqueValues(e.target.value)
                  }}
                  className="px-3 py-1.5 border rounded bg-white text-sm"
                >
                  {columns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(filter.id, 'operator', e.target.value)}
                  className="px-3 py-1.5 border rounded bg-white text-sm"
                >
                  {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => updateFilter(filter.id, 'value', e.target.value)}
                  placeholder="Value"
                  className="flex-1 px-3 py-1.5 border rounded text-sm"
                  list={`unique-${filter.id}`}
                />
                {uniqueValues[filter.column] && (
                  <datalist id={`unique-${filter.id}`}>
                    {uniqueValues[filter.column].slice(0, 20).map(v => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                )}
                <button
                  onClick={() => removeFilter(filter.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              onClick={applyFilters}
              disabled={loading || filters.every(f => !f.value)}
              className="mt-2 px-4 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Applying...' : 'Apply Filters'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
