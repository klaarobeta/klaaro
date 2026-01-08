import { useState } from 'react'
import { Loader2, CheckCircle, Hash } from 'lucide-react'
import { encodeData } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  columns: string[]
  onComplete: (newDatasetId: string) => void
}

const methods = [
  { value: 'label', label: 'Label Encoding', desc: 'Convert categories to numbers (0, 1, 2, ...)', example: 'red→0, blue→1, green→2' },
  { value: 'onehot', label: 'One-Hot Encoding', desc: 'Create binary columns for each category', example: 'color → color_red, color_blue, color_green' },
  { value: 'ordinal', label: 'Ordinal Encoding', desc: 'Similar to label encoding with preserved order', example: 'low→0, medium→1, high→2' },
]

export default function Encoding({ datasetId, columns, onComplete }: Props) {
  const [method, setMethod] = useState('label')
  const [selectedColumns, setSelectedColumns] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const toggleColumn = (col: string) => {
    setSelectedColumns(prev => 
      prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]
    )
  }

  const handleProcess = async () => {
    if (selectedColumns.length === 0) {
      setError('Please select at least one column')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await encodeData(datasetId, method, selectedColumns)
      setResult(res)
      onComplete(res.processed_dataset.id)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to encode')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-purple-600 bg-purple-50 p-3 rounded-lg">
        <Hash className="w-5 h-5" />
        <span className="text-sm">Encode categorical variables for ML models</span>
      </div>

      {/* Method selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Encoding Method</label>
        <div className="space-y-2">
          {methods.map(m => (
            <label key={m.value} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
              <input
                type="radio"
                name="method"
                value={m.value}
                checked={method === m.value}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{m.label}</p>
                <p className="text-sm text-gray-500">{m.desc}</p>
                <code className="text-xs bg-gray-100 px-1 rounded">{m.example}</code>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Column selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select categorical columns to encode *
        </label>
        <div className="flex flex-wrap gap-2">
          {columns.map(col => (
            <button
              key={col}
              onClick={() => toggleColumn(col)}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                selectedColumns.includes(col)
                  ? 'bg-purple-600 text-white'
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
        disabled={loading || selectedColumns.length === 0}
        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Encoding...' : 'Encode Data'}
      </button>

      {/* Result */}
      {result && (
        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Encoding complete!</p>
            <p className="text-sm">Method: {method}</p>
            {result.new_columns && (
              <p className="text-xs mt-1">New columns: {result.new_columns.length}</p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
    </div>
  )
}
