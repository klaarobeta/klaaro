import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter, Cell } from 'recharts'
import { Loader2, BarChart2, Activity } from 'lucide-react'
import { getHistogramData, getBarChartData, getScatterData } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  columns: string[]
}

type ChartType = 'histogram' | 'bar' | 'scatter'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16']

export default function DataCharts({ datasetId, columns }: Props) {
  const [chartType, setChartType] = useState<ChartType>('bar')
  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '')
  const [xColumn, setXColumn] = useState(columns[0] || '')
  const [yColumn, setYColumn] = useState(columns[1] || columns[0] || '')
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadChart = async () => {
    setLoading(true)
    setError(null)
    try {
      let data
      if (chartType === 'histogram') {
        const result = await getHistogramData(datasetId, selectedColumn)
        data = result.data
      } else if (chartType === 'bar') {
        const result = await getBarChartData(datasetId, selectedColumn)
        data = result.data
      } else if (chartType === 'scatter') {
        const result = await getScatterData(datasetId, xColumn, yColumn)
        data = result.data
      }
      setChartData(data || [])
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to load chart')
      setChartData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (selectedColumn || (chartType === 'scatter' && xColumn && yColumn)) {
      loadChart()
    }
  }, [chartType, selectedColumn, xColumn, yColumn, datasetId])

  return (
    <div className="space-y-4">
      {/* Chart type selector */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setChartType('bar')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${chartType === 'bar' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <BarChart2 className="w-4 h-4" /> Bar Chart
        </button>
        <button
          onClick={() => setChartType('histogram')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${chartType === 'histogram' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <Activity className="w-4 h-4" /> Histogram
        </button>
        <button
          onClick={() => setChartType('scatter')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm ${chartType === 'scatter' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}
        >
          <span className="text-lg">⋯</span> Scatter
        </button>
      </div>

      {/* Column selector */}
      <div className="flex gap-4">
        {chartType !== 'scatter' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Column</label>
            <select
              value={selectedColumn}
              onChange={(e) => setSelectedColumn(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white"
            >
              {columns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">X Axis</label>
              <select
                value={xColumn}
                onChange={(e) => setXColumn(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Y Axis</label>
              <select
                value={yColumn}
                onChange={(e) => setYColumn(e.target.value)}
                className="px-3 py-2 border rounded-lg bg-white"
              >
                {columns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="h-80 border rounded-lg bg-white p-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            No data to display
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'scatter' ? (
              <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" dataKey="x" name={xColumn} />
                <YAxis type="number" dataKey="y" name={yColumn} />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={chartData} fill="#3B82F6" />
              </ScatterChart>
            ) : (
              <BarChart data={chartData} margin={{ top: 20, right: 20, bottom: 60, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey={chartType === 'histogram' ? 'bin' : 'name'} 
                  angle={-45} 
                  textAnchor="end"
                  height={60}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6">
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
