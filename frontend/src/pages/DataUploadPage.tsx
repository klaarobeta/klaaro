import { useState } from 'react'
import FileUploader from '@/components/data/upload/FileUploader'
import DatasetList from '@/components/data/DatasetList'
import CSVPreview from '@/components/data/preview/CSVPreview'
import JSONPreview from '@/components/data/preview/JSONPreview'
import ImagePreview from '@/components/data/preview/ImagePreview'
import DatasetStats from '@/components/data/DatasetStats'
import { Dataset } from '@/types/dataset'
import { Database, X, Upload, List, Eye, BarChart2 } from 'lucide-react'

type ViewMode = 'upload' | 'list'
type ModalType = 'preview' | 'stats' | null

export default function DataUploadPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('upload')
  const [modalType, setModalType] = useState<ModalType>(null)
  const [selectedDataset, setSelectedDataset] = useState<Dataset | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handlePreview = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setModalType('preview')
  }

  const handleStats = (dataset: Dataset) => {
    setSelectedDataset(dataset)
    setModalType('stats')
  }

  const closeModal = () => {
    setModalType(null)
    setSelectedDataset(null)
  }

  const renderPreviewContent = () => {
    if (!selectedDataset) return null

    switch (selectedDataset.category) {
      case 'csv':
        return <CSVPreview datasetId={selectedDataset.id} filename={selectedDataset.filename} />
      case 'json':
        return <JSONPreview datasetId={selectedDataset.id} filename={selectedDataset.filename} />
      case 'image':
        return <ImagePreview datasetId={selectedDataset.id} filename={selectedDataset.filename} />
      default:
        return (
          <div className="text-center py-12 text-gray-500">
            Preview not available for this file type
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Database className="w-8 h-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">AI/ML Platform</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
          <p className="text-gray-500 mt-1">Upload, preview, and analyze your datasets</p>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setViewMode('upload')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${viewMode === 'upload' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
              ${viewMode === 'list' 
                ? 'bg-blue-600 text-white' 
                : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
          >
            <List className="w-4 h-4" />
            Datasets
          </button>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          {viewMode === 'upload' ? (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Dataset</h3>
              <FileUploader onUploadComplete={handleUploadComplete} />
            </>
          ) : (
            <>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Your Datasets</h3>
              <DatasetList 
                onPreview={handlePreview} 
                onStats={handleStats}
                refreshTrigger={refreshTrigger}
              />
            </>
          )}
        </div>
      </main>

      {/* Modal */}
      {modalType && selectedDataset && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-2">
                {modalType === 'preview' ? (
                  <Eye className="w-5 h-5 text-blue-600" />
                ) : (
                  <BarChart2 className="w-5 h-5 text-green-600" />
                )}
                <h3 className="font-semibold text-gray-800">
                  {modalType === 'preview' ? 'Preview' : 'Statistics'}
                </h3>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {modalType === 'preview' 
                ? renderPreviewContent()
                : <DatasetStats datasetId={selectedDataset.id} filename={selectedDataset.filename} />
              }
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
