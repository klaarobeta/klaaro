import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

export interface UploadResponse {
  id: string
  filename: string
  stored_filename: string
  size: number
  type: string
  uploaded_at: string
  status: string
}

export interface MultiUploadResponse {
  uploaded: UploadResponse[]
  errors: { filename: string; error: string }[]
  total_uploaded: number
  total_errors: number
}

export const uploadDataset = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await axios.post(`${API_URL}/api/datasets/upload`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}

export const uploadMultipleDatasets = async (files: File[]): Promise<MultiUploadResponse> => {
  const formData = new FormData()
  files.forEach(file => {
    formData.append('files', file)
  })
  
  const response = await axios.post(`${API_URL}/api/datasets/upload-multiple`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })
  
  return response.data
}
