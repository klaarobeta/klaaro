import { useState, useEffect } from 'react'
import { DatasetStats as DatasetStatsType } from '@/types/dataset'
import { getDatasetStats } from '@/services/datasetService'
import { Loader2, FileText, Hash, Calendar, HardDrive } from 'lucide-react'

interface Props {
  datasetId: string
  filename: string
}

export default function DatasetStats({ datasetId, filename }: Props) {
  const [stats, setStats] = useState<DatasetStatsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await getDatasetStats(datasetId)
        setStats(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
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

  if (!stats) return null

  return (
    <div>
      <div className="mb-4">
        <h4 className="font-medium text-gray-800">{filename}</h4>
        <p className="text-sm text-gray-500">Dataset Statistics</p>
      </div>

      {/* Basic Info */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <HardDrive className="w-4 h-4" />
            <span className="text-xs font-medium">Size</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{stats.size_formatted}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <FileText className="w-4 h-4" />
            <span className="text-xs font-medium">Type</span>
          </div>
          <p className="text-lg font-semibold text-gray-800">{stats.type}</p>
        </div>
        {stats.row_count !== undefined && (
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <Hash className="w-4 h-4" />
              <span className="text-xs font-medium">Rows</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">{stats.row_count.toLocaleString()}</p>
          </div>
        )}
        {stats.column_count !== undefined && (
          <div className="bg-orange-50 rounded-lg p-4">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Hash className="w-4 h-4" />
              <span className="text-xs font-medium">Columns</span>
            </div>
            <p className="text-lg font-semibold text-gray-800">{stats.column_count}</p>
          </div>
        )}
      </div>

      {/* Image Stats */}
      {stats.width !== undefined && (
        <div className="mb-6">
          <h5 className="font-medium text-gray-700 mb-3">Image Properties</h5>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Dimensions</p>
              <p className="font-medium">{stats.width} × {stats.height}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Format</p>
              <p className="font-medium">{stats.format}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Mode</p>
              <p className="font-medium">{stats.mode}</p>
            </div>
          </div>
        </div>
      )}

      {/* Column Stats for CSV */}
      {stats.column_stats && Object.keys(stats.column_stats).length > 0 && (
        <div>
          <h5 className="font-medium text-gray-700 mb-3">Column Statistics</h5>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Column</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Type</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Non-Null</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Null</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Unique</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Min</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Max</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Mean</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {Object.entries(stats.column_stats).map(([col, colStats]) => (
                  <tr key={col} className="hover:bg-gray-50">
                    <td className="px-3 py-2 font-medium text-gray-800">{col}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        colStats.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {colStats.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-600">{colStats.non_null_count}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {colStats.null_count > 0 ? (
                        <span className="text-orange-600">{colStats.null_count}</span>
                      ) : '0'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">{colStats.unique_count}</td>
                    <td className="px-3 py-2 text-gray-600">
                      {colStats.min !== undefined ? colStats.min.toFixed(2) : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {colStats.max !== undefined ? colStats.max.toFixed(2) : '-'}
                    </td>
                    <td className="px-3 py-2 text-gray-600">
                      {colStats.mean !== undefined ? colStats.mean.toFixed(2) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* JSON Stats */}
      {stats.keys && (
        <div>
          <h5 className="font-medium text-gray-700 mb-3">JSON Structure</h5>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-2">
              {stats.item_count !== undefined 
                ? `Array with ${stats.item_count} items`
                : `Object with ${stats.key_count} keys`}
            </p>
            <div className="flex flex-wrap gap-2">
              {stats.keys.map(key => (
                <span key={key} className="px-2 py-1 bg-white border rounded text-sm text-gray-700">
                  {key}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
