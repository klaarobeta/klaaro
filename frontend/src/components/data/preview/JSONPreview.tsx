import { useState, useEffect } from 'react'
import { JSONPreview as JSONPreviewType } from '@/types/dataset'
import { previewJSON } from '@/services/datasetService'
import { Loader2, ChevronRight, ChevronDown } from 'lucide-react'

interface Props {
  datasetId: string
  filename: string
}

interface TreeNodeProps {
  name: string
  value: any
  depth?: number
}

function TreeNode({ name, value, depth = 0 }: TreeNodeProps) {
  const [expanded, setExpanded] = useState(depth < 2)
  
  const isExpandable = typeof value === 'object' && value !== null
  const valueType = Array.isArray(value) ? 'array' : typeof value
  
  const renderValue = () => {
    if (value === null) return <span className="text-gray-400">null</span>
    if (typeof value === 'boolean') return <span className="text-purple-600">{value.toString()}</span>
    if (typeof value === 'number') return <span className="text-blue-600">{value}</span>
    if (typeof value === 'string') {
      const truncated = value.length > 100 ? value.slice(0, 100) + '...' : value
      return <span className="text-green-600">"{truncated}"</span>
    }
    if (Array.isArray(value)) return <span className="text-gray-500">[{value.length} items]</span>
    if (typeof value === 'object') return <span className="text-gray-500">{'{...}'}</span>
    return String(value)
  }

  return (
    <div style={{ marginLeft: depth * 16 }}>
      <div 
        className={`flex items-center gap-1 py-0.5 ${isExpandable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => isExpandable && setExpanded(!expanded)}
      >
        {isExpandable && (
          expanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
        {!isExpandable && <span className="w-4" />}
        <span className="text-gray-700 font-medium">{name}</span>
        <span className="text-gray-400">:</span>
        {!expanded && <span className="ml-1">{renderValue()}</span>}
        {isExpandable && expanded && (
          <span className="text-gray-400 text-xs ml-1">
            {valueType === 'array' ? `[${value.length}]` : `{${Object.keys(value).length}}`}
          </span>
        )}
      </div>
      {isExpandable && expanded && (
        <div>
          {Array.isArray(value) ? (
            value.slice(0, 50).map((item, idx) => (
              <TreeNode key={idx} name={`[${idx}]`} value={item} depth={depth + 1} />
            ))
          ) : (
            Object.entries(value).slice(0, 50).map(([key, val]) => (
              <TreeNode key={key} name={key} value={val} depth={depth + 1} />
            ))
          )}
          {(Array.isArray(value) ? value.length : Object.keys(value).length) > 50 && (
            <div className="text-gray-400 text-sm ml-4">... and more</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function JSONPreview({ datasetId, filename }: Props) {
  const [preview, setPreview] = useState<JSONPreviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await previewJSON(datasetId, 200)
        setPreview(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load preview')
      } finally {
        setLoading(false)
      }
    }
    fetchPreview()
  }, [datasetId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>
  }

  if (!preview) return null

  return (
    <div>
      <div className="mb-3">
        <h4 className="font-medium text-gray-800">{filename}</h4>
        <p className="text-sm text-gray-500">
          {preview.type === 'array' ? `Array with ${preview.total_items} items` : `Object with ${preview.total_items} keys`}
          {preview.truncated && ' (truncated)'}
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50 overflow-x-auto max-h-96 overflow-y-auto font-mono text-sm">
        <TreeNode name="root" value={preview.data} />
      </div>
    </div>
  )
}
