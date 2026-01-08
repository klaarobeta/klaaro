import axios from 'axios'

const API_URL = import.meta.env.VITE_BACKEND_URL || ''

export interface FilterRequest {
  column: string
  operator: string
  value: string
}

export interface FilterResponse {
  dataset_id: string
  original_count: number
  filtered_count: number
  columns: string[]
  rows: Record<string, string>[]
  truncated: boolean
}

export interface ChartData {
  column: string
  data: any[]
}

export interface PreprocessingResult {
  processed_dataset: {
    id: string
    filename: string
  }
}

// Exploration endpoints
export const filterData = async (
  datasetId: string,
  filters: FilterRequest[]
): Promise<FilterResponse> => {
  const response = await axios.post(`${API_URL}/api/datasets/${datasetId}/filter`, filters)
  return response.data
}

export const searchData = async (
  datasetId: string,
  query: string,
  column?: string
): Promise<FilterResponse> => {
  const params = new URLSearchParams({ q: query })
  if (column) params.append('column', column)
  const response = await axios.get(`${API_URL}/api/datasets/${datasetId}/search?${params}`)
  return response.data
}

export const getUniqueValues = async (
  datasetId: string,
  column: string
): Promise<{ column: string; unique_count: number; values: string[] }> => {
  const response = await axios.get(`${API_URL}/api/datasets/${datasetId}/unique/${column}`)
  return response.data
}

// Chart endpoints
export const getHistogramData = async (
  datasetId: string,
  column: string,
  bins = 10
): Promise<ChartData> => {
  const response = await axios.get(`${API_URL}/api/datasets/${datasetId}/chart/histogram/${column}?bins=${bins}`)
  return response.data
}

export const getBarChartData = async (
  datasetId: string,
  column: string,
  topN = 10
): Promise<ChartData> => {
  const response = await axios.get(`${API_URL}/api/datasets/${datasetId}/chart/bar/${column}?top_n=${topN}`)
  return response.data
}

export const getScatterData = async (
  datasetId: string,
  xColumn: string,
  yColumn: string
): Promise<{ data: { x: number; y: number }[] }> => {
  const response = await axios.get(`${API_URL}/api/datasets/${datasetId}/chart/scatter?x_column=${xColumn}&y_column=${yColumn}`)
  return response.data
}

// Preprocessing endpoints
export const handleMissingValues = async (
  datasetId: string,
  strategy: string,
  columns?: string[],
  fillValue?: string
): Promise<PreprocessingResult> => {
  const response = await axios.post(`${API_URL}/api/datasets/${datasetId}/preprocess/missing`, {
    strategy,
    columns,
    fill_value: fillValue
  })
  return response.data
}

export const normalizeData = async (
  datasetId: string,
  method: string,
  columns: string[]
): Promise<PreprocessingResult> => {
  const response = await axios.post(`${API_URL}/api/datasets/${datasetId}/preprocess/normalize`, {
    method,
    columns
  })
  return response.data
}

export const encodeData = async (
  datasetId: string,
  method: string,
  columns: string[]
): Promise<PreprocessingResult> => {
  const response = await axios.post(`${API_URL}/api/datasets/${datasetId}/preprocess/encode`, {
    method,
    columns
  })
  return response.data
}

export const splitData = async (
  datasetId: string,
  trainRatio: number,
  valRatio: number,
  testRatio: number,
  shuffle = true
): Promise<any> => {
  const response = await axios.post(`${API_URL}/api/datasets/${datasetId}/preprocess/split`, {
    train_ratio: trainRatio,
    val_ratio: valRatio,
    test_ratio: testRatio,
    shuffle
  })
  return response.data
}

// Export endpoints
export const getExportUrl = (datasetId: string, format: 'csv' | 'json' = 'csv'): string => {
  return `${API_URL}/api/datasets/${datasetId}/export?format=${format}`
}

export const downloadDataset = async (datasetId: string, format: 'csv' | 'json' = 'csv'): Promise<void> => {
  const url = getExportUrl(datasetId, format)
  const link = document.createElement('a')
  link.href = url
  link.download = `dataset.${format}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
