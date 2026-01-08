import { useState, useEffect } from 'react'
import { Dataset } from '@/types/dataset'
import { listDatasets, getImagePreviewUrl } from '@/services/datasetService'
import { Loader2, ZoomIn, X } from 'lucide-react'

interface Props {
  datasetId?: string
  filename?: string
}

export default function ImagePreview({ datasetId, filename }: Props) {
  const [images, setImages] = useState<Dataset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)

  useEffect(() => {
    const fetchImages = async () => {
      setLoading(true)
      try {
        if (datasetId) {
          // Single image mode
          setImages([{ id: datasetId, filename: filename || 'image' } as Dataset])
        } else {
          // Gallery mode - fetch all images
          const response = await listDatasets('image', 50)
          setImages(response.datasets)
        }
      } catch (err) {
        console.error('Failed to fetch images:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchImages()
  }, [datasetId, filename])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    )
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No images found
      </div>
    )
  }

  // Single image view
  if (datasetId) {
    return (
      <div>
        <div className="mb-3">
          <h4 className="font-medium text-gray-800">{filename}</h4>
        </div>
        <div className="border rounded-lg overflow-hidden bg-gray-100">
          <img
            src={getImagePreviewUrl(datasetId)}
            alt={filename}
            className="max-w-full h-auto mx-auto"
            style={{ maxHeight: '500px' }}
          />
        </div>
      </div>
    )
  }

  // Gallery view
  return (
    <div>
      <div className="mb-3">
        <h4 className="font-medium text-gray-800">Image Gallery</h4>
        <p className="text-sm text-gray-500">{images.length} images</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map(img => (
          <div
            key={img.id}
            className="relative group cursor-pointer border rounded-lg overflow-hidden bg-gray-100"
            onClick={() => setSelectedImage(img.id)}
          >
            <img
              src={getImagePreviewUrl(img.id)}
              alt={img.filename}
              className="w-full h-32 object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ZoomIn className="w-6 h-6 text-white" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
              <p className="text-white text-xs truncate">{img.filename}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            className="absolute top-4 right-4 text-white hover:text-gray-300"
            onClick={() => setSelectedImage(null)}
          >
            <X className="w-8 h-8" />
          </button>
          <img
            src={getImagePreviewUrl(selectedImage)}
            alt="Preview"
            className="max-w-full max-h-full object-contain"
            onClick={e => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
