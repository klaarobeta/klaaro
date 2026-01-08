import { useState } from 'react'
import { Download, FileText, FileJson, Loader2 } from 'lucide-react'
import { getExportUrl } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  filename: string
}

export default function ExportData({ datasetId, filename }: Props) {
  const [format, setFormat] = useState<'csv' | 'json'>('csv')
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const url = getExportUrl(datasetId, format)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename.replace(/\.[^/.]+$/, '')}.${format}`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } finally {
      setTimeout(() => setDownloading(false), 1000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
        <Download className="w-5 h-5" />
        <span className="text-sm">Export your dataset in different formats</span>
      </div>

      {/* Format selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Export Format</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setFormat('csv')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-colors ${
              format === 'csv' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileText className={`w-8 h-8 ${format === 'csv' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className="font-medium text-gray-800">CSV</p>
              <p className="text-xs text-gray-500">Comma-separated values</p>
            </div>
          </button>
          <button
            onClick={() => setFormat('json')}
            className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-colors ${
              format === 'json' ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <FileJson className={`w-8 h-8 ${format === 'json' ? 'text-green-600' : 'text-gray-400'}`} />
            <div className="text-left">
              <p className="font-medium text-gray-800">JSON</p>
              <p className="text-xs text-gray-500">JavaScript Object Notation</p>
            </div>
          </button>
        </div>
      </div>

      {/* Download info */}
      <div className="bg-gray-50 rounded-lg p-4">
        <p className="text-sm text-gray-600">
          <span className="font-medium">File:</span> {filename}
        </p>
        <p className="text-sm text-gray-600">
          <span className="font-medium">Format:</span> {format.toUpperCase()}
        </p>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
      >
        {downloading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Download className="w-5 h-5" />
        )}
        {downloading ? 'Preparing download...' : `Download as ${format.toUpperCase()}`}
      </button>
    </div>
  )
}
