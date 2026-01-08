import axios from 'axios'
import { Dataset, DatasetListResponse, CSVPreview, JSONPreview, DatasetStats } from '@/types/dataset'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

export interface UploadResponse {
  id: string
  filename: string
  stored_filename: string
  size: number
  type: string
  category: string
  uploaded_at: string
  status: string
}

export interface MultiUploadResponse {
  uploaded: UploadResponse[]
  errors: { filename: string; error: string }[]
  total_uploaded: number
  total_errors: number
}

// Upload endpoints
export const uploadDataset = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await axios.post(`${API_URL}/api/datasets/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  
  return response.data
}

export const uploadMultipleDatasets = async (files: File[]): Promise<MultiUploadResponse> => {
  const formData = new FormData()
  files.forEach(file => formData.append('files', file))
  
  const response = await axios.post(`${API_URL}/api/datasets/upload-multiple`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  
  return response.data
}

// List endpoints
export const listDatasets = async (
  category?: string,
  limit = 50,
  skip = 0
): Promise<DatasetListResponse> => {
  const params = new URLSearchParams()
  if (category) params.append('category', category)
  params.append('limit', limit.toString())
  params.append('skip', skip.toString())
  
  const response = await axios.get(`${API_URL}/api/datasets/list?${params}`)
  return response.data
}

export const getDataset = async (id: string): Promise<Dataset> => {
  const response = await axios.get(`${API_URL}/api/datasets/${id}`)
  return response.data
}

// Preview endpoints
export const previewCSV = async (id: string, rows = 100): Promise<CSVPreview> => {
  const response = await axios.get(`${API_URL}/api/datasets/${id}/preview/csv?rows=${rows}`)
  return response.data
}

export const previewJSON = async (id: string, maxItems = 100): Promise<JSONPreview> => {
  const response = await axios.get(`${API_URL}/api/datasets/${id}/preview/json?max_items=${maxItems}`)
  return response.data
}

export const getImagePreviewUrl = (id: string): string => {
  return `${API_URL}/api/datasets/${id}/preview/image`
}

// Stats endpoint
export const getDatasetStats = async (id: string): Promise<DatasetStats> => {
  const response = await axios.get(`${API_URL}/api/datasets/${id}/stats`)
  return response.data
}

// Delete endpoint
export const deleteDataset = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/datasets/${id}`)
}
