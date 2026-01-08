import FileUploader from '@/components/data/upload/FileUploader'
import { Database } from 'lucide-react'

export default function DataUploadPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8 text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">AI/ML Platform</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Data Management</h2>
          <p className="text-gray-500 mt-1">Upload and manage your datasets</p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Upload Dataset</h3>
          <FileUploader />
        </div>
      </main>
    </div>
  )
}
