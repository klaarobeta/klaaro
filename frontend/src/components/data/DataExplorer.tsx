import { useState, useEffect } from 'react'
import { Dataset, DatasetStats as DatasetStatsType } from '@/types/dataset'
import { getDataset, getDatasetStats, previewCSV } from '@/services/datasetService'
import DataFilter from '@/components/data/exploration/DataFilter'
import DataCharts from '@/components/data/exploration/DataCharts'
import MissingValues from '@/components/data/preprocessing/MissingValues'
import Normalization from '@/components/data/preprocessing/Normalization'
import Encoding from '@/components/data/preprocessing/Encoding'
import DataSplit from '@/components/data/preprocessing/DataSplit'
import ExportData from '@/components/data/preprocessing/ExportData'
import { 
  ArrowLeft, Filter, BarChart2, Wrench, Download, 
  AlertTriangle, Scale, Hash, Scissors, Loader2, ChevronLeft, ChevronRight
} from 'lucide-react'

interface Props {
  datasetId: string
  onBack: () => void
  onDatasetChange: (newId: string) => void
}

type Tab = 'filter' | 'charts' | 'missing' | 'normalize' | 'encode' | 'split' | 'export'

export default function DataExplorer({ datasetId, onBack, onDatasetChange }: Props) {
  const [dataset, setDataset] = useState<Dataset | null>(null)
  const [stats, setStats] = useState<DatasetStatsType | null>(null)
  const [columns, setColumns] = useState<string[]>([])
  const [filteredData, setFilteredData] = useState<Record<string, string>[]>([])
  const [filteredCount, setFilteredCount] = useState(0)
  const [activeTab, setActiveTab] = useState<Tab>('filter')
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const rowsPerPage = 15

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [ds, st, preview] = await Promise.all([
          getDataset(datasetId),
          getDatasetStats(datasetId),
          previewCSV(datasetId, 500)
        ])
        setDataset(ds)
        setStats(st)
        setColumns(preview.columns)
        setFilteredData(preview.rows)
        setFilteredCount(preview.total_rows)
      } catch (err) {
        console.error('Failed to load dataset:', err)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [datasetId])

  const handleFilterResult = (rows: Record<string, string>[], count: number) => {
    setFilteredData(rows)
    setFilteredCount(count)
    setPage(0)
  }

  const handlePreprocessComplete = (newDatasetId: string) => {
    onDatasetChange(newDatasetId)
  }

  const tabs: { id: Tab; label: string; icon: any; color: string }[] = [
    { id: 'filter', label: 'Filter & Search', icon: Filter, color: 'blue' },
    { id: 'charts', label: 'Charts', icon: BarChart2, color: 'green' },
    { id: 'missing', label: 'Missing Values', icon: AlertTriangle, color: 'amber' },
    { id: 'normalize', label: 'Normalize', icon: Scale, color: 'blue' },
    { id: 'encode', label: 'Encode', icon: Hash, color: 'purple' },
    { id: 'split', label: 'Split', icon: Scissors, color: 'orange' },
    { id: 'export', label: 'Export', icon: Download, color: 'green' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (!dataset || !stats) {
    return (
      <div className="text-center py-12 text-red-500">
        Failed to load dataset
      </div>
    )
  }

  const paginatedData = filteredData.slice(page * rowsPerPage, (page + 1) * rowsPerPage)
  const totalPages = Math.ceil(filteredData.length / rowsPerPage)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-800">{dataset.filename}</h2>
          <p className="text-sm text-gray-500">
            {stats.row_count} rows × {stats.column_count} columns • {stats.size_formatted}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b pb-2">
        {tabs.map(tab => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? `bg-${tab.color}-100 text-${tab.color}-700`
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left panel - Tools */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border p-4">
            {activeTab === 'filter' && (
              <DataFilter
                datasetId={datasetId}
                columns={columns}
                onFilterResult={handleFilterResult}
              />
            )}
            {activeTab === 'charts' && (
              <DataCharts
                datasetId={datasetId}
                columns={columns}
              />
            )}
            {activeTab === 'missing' && (
              <MissingValues
                datasetId={datasetId}
                columns={columns}
                onComplete={handlePreprocessComplete}
              />
            )}
            {activeTab === 'normalize' && (
              <Normalization
                datasetId={datasetId}
                columns={columns}
                onComplete={handlePreprocessComplete}
              />
            )}
            {activeTab === 'encode' && (
              <Encoding
                datasetId={datasetId}
                columns={columns}
                onComplete={handlePreprocessComplete}
              />
            )}
            {activeTab === 'split' && (
              <DataSplit
                datasetId={datasetId}
                onComplete={(splits) => {
                  if (splits.train) handlePreprocessComplete(splits.train.dataset.id)
                }}
              />
            )}
            {activeTab === 'export' && (
              <ExportData
                datasetId={datasetId}
                filename={dataset.filename}
              />
            )}
          </div>
        </div>

        {/* Right panel - Data Preview */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b flex items-center justify-between">
              <span className="font-medium text-gray-700">
                Data Preview ({filteredCount} rows)
              </span>
              {filteredCount !== stats.row_count && (
                <span className="text-sm text-blue-600">
                  Filtered from {stats.row_count} rows
                </span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                    {columns.map(col => (
                      <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-400 text-xs">
                        {page * rowsPerPage + idx + 1}
                      </td>
                      {columns.map(col => (
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
              <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing {page * rowsPerPage + 1}-{Math.min((page + 1) * rowsPerPage, filteredData.length)} of {filteredData.length}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
