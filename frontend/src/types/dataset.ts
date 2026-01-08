export interface Dataset {
  id: string
  filename: string
  stored_filename: string
  file_path: string
  size: number
  type: string
  category: 'csv' | 'json' | 'image' | 'text' | 'tabular'
  uploaded_at: string
  status: string
}

export interface DatasetListResponse {
  datasets: Dataset[]
  total: number
  limit: number
  skip: number
}

export interface CSVPreview {
  dataset_id: string
  filename: string
  columns: string[]
  rows: Record<string, string>[]
  row_count: number
  total_rows: number
}

export interface JSONPreview {
  dataset_id: string
  filename: string
  data: any
  type: 'array' | 'object'
  total_items: number
  truncated: boolean
}

export interface ColumnStats {
  null_count: number
  non_null_count: number
  unique_count: number
  type: 'numeric' | 'string'
  min?: number
  max?: number
  mean?: number
}

export interface DatasetStats {
  dataset_id: string
  filename: string
  size: number
  size_formatted: string
  type: string
  category: string
  uploaded_at: string
  row_count?: number
  column_count?: number
  columns?: string[]
  column_stats?: Record<string, ColumnStats>
  // Image stats
  width?: number
  height?: number
  format?: string
  mode?: string
  // JSON stats
  item_count?: number
  key_count?: number
  keys?: string[]
}
