import { useState, useEffect } from 'react'
import { Dataset } from '@/types/dataset'
import { listDatasets, deleteDataset } from '@/services/datasetService'
import { FileText, Image, FileJson, File, Trash2, Eye, BarChart2, Loader2, Wrench } from 'lucide-react'

interface Props {
  onPreview: (dataset: Dataset) => void
  onStats: (dataset: Dataset) => void
  onExplore?: (dataset: Dataset) => void
  refreshTrigger?: number
}

const categoryIcons: Record<string, any> = {
  csv: FileText,
  json: FileJson,
  image: Image,
  text: File,
  tabular: FileText,
}

const categoryColors: Record<string, string> = {
  csv: 'text-green-600 bg-green-50',
  json: 'text-purple-600 bg-purple-50',
  image: 'text-blue-600 bg-blue-50',
  text: 'text-gray-600 bg-gray-50',
  tabular: 'text-orange-600 bg-orange-50',
}

export default function DatasetList({ onPreview, onStats, onExplore, refreshTrigger }: Props) {
  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('')
  const [deleting, setDeleting] = useState<string | null>(null)

  const fetchDatasets = async () => {
    setLoading(true)
    try {
      const response = await listDatasets(filter || undefined)
      setDatasets(response.datasets)
    } catch (err) {
      console.error('Failed to fetch datasets:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDatasets()
  }, [filter, refreshTrigger])

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dataset?')) return
    
    setDeleting(id)
    try {
      await deleteDataset(id)
      setDatasets(prev => prev.filter(d => d.id !== id))
    } catch (err) {
      console.error('Failed to delete:', err)
    } finally {
      setDeleting(null)
    }
  }

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
  }

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {['', 'csv', 'json', 'image', 'text'].map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${filter === cat 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            {cat || 'All'}
          </button>
        ))}
      </div>

      {/* Dataset list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        </div>
      ) : datasets.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          No datasets found. Upload some files to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {datasets.map(dataset => {
            const Icon = categoryIcons[dataset.category] || File
            const colorClass = categoryColors[dataset.category] || 'text-gray-600 bg-gray-50'
            
            return (
              <div
                key={dataset.id}
                className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow"
              >
                <div className={`p-2 rounded-lg ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-800 truncate">{dataset.filename}</p>
                  <p className="text-xs text-gray-400">
                    {formatSize(dataset.size)} • {formatDate(dataset.uploaded_at)}
                  </p>
                </div>
                
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onPreview(dataset)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                    title="Preview"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onStats(dataset)}
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg"
                    title="Statistics"
                  >
                    <BarChart2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(dataset.id)}
                    disabled={deleting === dataset.id}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                    title="Delete"
                  >
                    {deleting === dataset.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
