import { useState } from 'react'
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react'
import { handleMissingValues } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  columns: string[]
  onComplete: (newDatasetId: string) => void
}

const strategies = [
  { value: 'drop', label: 'Drop rows with missing values', desc: 'Remove entire rows that contain any missing values' },
  { value: 'fill_mean', label: 'Fill with mean', desc: 'Replace missing values with column mean (numeric only)' },
  { value: 'fill_median', label: 'Fill with median', desc: 'Replace missing values with column median (numeric only)' },
  { value: 'fill_mode', label: 'Fill with mode', desc: 'Replace missing values with most frequent value' },
  { value: 'fill_value', label: 'Fill with custom value', desc: 'Replace missing values with a specific value' },
]

export default function MissingValues({ datasetId, columns, onComplete }: Props) {
  const [strategy, setStrategy] = useState('drop')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [fillValue, setFillValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const handleProcess = async () => {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await handleMissingValues(
        datasetId,
        strategy,
        selectedColumns.length > 0 ? selectedColumns : undefined,
        strategy === 'fill_value' ? fillValue : undefined
      )
      setResult(res)
      onComplete(res.processed_dataset.id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg">
        <AlertTriangle className="w-5 h-5" />
        <span className="text-sm">Handle missing or null values in your dataset</span>
      </div>

      {/* Strategy selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Strategy</label>
        <div className="space-y-2">
          {strategies.map(s => (
            <label key={s.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="strategy"
                value={s.value}
                checked={strategy === s.value}
                onChange={(e) => setStrategy(e.target.value)}
                className="mt-1"
              />
              <div>
                <p className="font-medium text-gray-800">{s.label}</p>
                <p className="text-sm text-gray-500">{s.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Custom fill value */}
      {strategy === 'fill_value' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fill Value</label>
          <input
            type="text"
            value={fillValue}
            onChange={(e) => setFillValue(e.target.value)}
            placeholder="Enter value to fill"
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
      )}

      {/* Column selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Apply to columns (leave empty for all)
        </label>
        <div className="flex flex-wrap gap-2">
          {columns.map(col => (
            <button
              key={col}
              onClick={() => toggleColumn(col)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedColumns.includes(col)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      {/* Process button */}
      <button
        onClick={handleProcess}
        disabled={loading || (strategy === 'fill_value' && !fillValue)}
        className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Processing...' : 'Process Missing Values'}
      </button>

      {/* Result */}
      {result && (
        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Processing complete!</p>
            <p className="text-sm">
              Original: {result.original_rows} rows → Processed: {result.processed_rows} rows
              {result.removed_rows > 0 && ` (${result.removed_rows} removed)`}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
    </div>
  )
}
