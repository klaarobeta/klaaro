import { useState, useEffect } from 'react'
import { CSVPreview as CSVPreviewType } from '@/types/dataset'
import { previewCSV } from '@/services/datasetService'
import { Loader2, ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  datasetId: string
  filename: string
}

export default function CSVPreview({ datasetId, filename }: Props) {
  const [preview, setPreview] = useState<CSVPreviewType | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(0)
  const rowsPerPage = 20

  useEffect(() => {
    const fetchPreview = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await previewCSV(datasetId, 500) // Fetch more rows for pagination
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
    return (
      <div className="text-center py-12 text-red-500">
        {error}
      </div>
    )
  }

  if (!preview) return null

  const totalPages = Math.ceil(preview.rows.length / rowsPerPage)
  const paginatedRows = preview.rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h4 className="font-medium text-gray-800">{filename}</h4>
          <p className="text-sm text-gray-500">
            {preview.total_rows} rows × {preview.columns.length} columns
          </p>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
              {preview.columns.map(col => (
                <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {paginatedRows.map((row, idx) => (
              <tr key={idx} className="hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 text-xs">{page * rowsPerPage + idx + 1}</td>
                {preview.columns.map(col => (
                  <td key={col} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-xs truncate">
                    {row[col] || <span className="text-gray-300">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <p className="text-sm text-gray-500">
            Showing {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, preview.rows.length)} of {preview.rows.length}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-3 py-1 text-sm">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
