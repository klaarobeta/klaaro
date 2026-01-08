import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, File, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { uploadDataset, UploadResponse } from '@/services/datasetService'

interface FileWithStatus {
  file: File
  status: 'pending' | 'uploading' | 'success' | 'error'
  result?: UploadResponse
  error?: string
}

interface Props {
  onUploadComplete?: () => void
}

export default function FileUploader({ onUploadComplete }: Props) {
  const [files, setFiles] = useState<FileWithStatus[]>([])
  const [isUploading, setIsUploading] = useState(false)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending' as const,
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'image/*': ['.png', '.jpg', '.jpeg'],
    },
    maxSize: 100 * 1024 * 1024,
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const uploadFiles = async () => {
    setIsUploading(true)
    let anySuccess = false
    
    for (let i = 0; i < files.length; i++) {
      if (files[i].status !== 'pending') continue
      
      setFiles(prev => prev.map((f, idx) => 
        idx === i ? { ...f, status: 'uploading' as const } : f
      ))
      
      try {
        const result = await uploadDataset(files[i].file)
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success' as const, result } : f
        ))
        anySuccess = true
      } catch (err: any) {
        setFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error' as const, error: err.response?.data?.detail || 'Upload failed' } : f
        ))
      }
    }
    
    setIsUploading(false)
    if (anySuccess && onUploadComplete) {
      onUploadComplete()
    }
  }

  const clearCompleted = () => {
    setFiles(prev => prev.filter(f => f.status === 'pending'))
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const completedCount = files.filter(f => f.status === 'success' || f.status === 'error').length

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400 bg-white'
          }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto text-gray-400 mb-4" />
        {isDragActive ? (
          <p className="text-blue-600 font-medium">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-600 font-medium">Drag & drop files here</p>
            <p className="text-gray-400 text-sm mt-1">or click to browse</p>
          </>
        )}
        <p className="text-gray-400 text-xs mt-3">
          Supported: CSV, JSON, TXT, XLSX, PNG, JPG (max 100MB)
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-700">Files ({files.length})</h3>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear completed
                </button>
              )}
              {pendingCount > 0 && (
                <button
                  onClick={uploadFiles}
                  disabled={isUploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {isUploading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Uploading...</>
                  ) : (
                    <><Upload className="w-4 h-4" /> Upload {pendingCount} file{pendingCount > 1 ? 's' : ''}</>
                  )}
                </button>
              )}
            </div>
          </div>

          {files.map((f, index) => (
            <div
              key={index}
              className="flex items-center gap-3 p-3 bg-white border rounded-lg"
            >
              <File className="w-8 h-8 text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-700 truncate">
                  {f.file.name}
                </p>
                <p className="text-xs text-gray-400">
                  {formatFileSize(f.file.size)}
                </p>
              </div>
              
              <div className="flex-shrink-0">
                {f.status === 'pending' && (
                  <button
                    onClick={() => removeFile(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                {f.status === 'uploading' && (
                  <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                )}
                {f.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {f.status === 'error' && (
                  <div className="flex items-center gap-1">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <span className="text-xs text-red-500 max-w-32 truncate">{f.error}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
