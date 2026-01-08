const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export interface ImputationConfig {
  strategy: 'mean' | 'median' | 'most_frequent' | 'constant'
  fill_value?: any
}

export interface EncodingConfig {
  method: 'onehot' | 'label' | 'ordinal'
  drop_first?: boolean
}

export interface ScalingConfig {
  method: 'standard' | 'minmax' | 'none'
}

export interface SplitConfig {
  test_size: number
  validation_size: number
  random_state: number
  stratify: boolean
}

export interface ColumnConfig {
  name: string
  role: 'feature' | 'target' | 'drop'
  imputation?: ImputationConfig
  encoding?: EncodingConfig
  scaling?: ScalingConfig
}

export interface PreprocessingConfig {
  columns: ColumnConfig[]
  split: SplitConfig
  remove_duplicates: boolean
  handle_outliers: boolean
  outlier_method?: string
}

export interface PreprocessingStats {
  total_features: number
  train_samples: number
  test_samples: number
  val_samples: number
  duplicates_removed?: number
}

export interface PreprocessingResults {
  processed_at: string
  processed_id: string
  config: PreprocessingConfig
  stats: PreprocessingStats
  feature_names: string[]
  sample_data: {
    X_train_shape: number[] | null
    X_test_shape: number[] | null
    X_val_shape: number[] | null
    X_train_preview: Record<string, any> | null
  }
}

export const preprocessingService = {
  // Get auto-generated config
  async getConfig(projectId: string): Promise<{ project_id: string; config: PreprocessingConfig; source: string }> {
    const response = await fetch(`${BACKEND_URL}/api/preprocessing/${projectId}/config`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get config')
    }
    return response.json()
  },

  // Start auto preprocessing
  async startAuto(projectId: string, testSize: number = 0.2, validationSize: number = 0): Promise<{ message: string; project_id: string; config: PreprocessingConfig }> {
    const response = await fetch(`${BACKEND_URL}/api/preprocessing/auto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        test_size: testSize,
        validation_size: validationSize
      })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to start preprocessing')
    }
    return response.json()
  },

  // Start custom preprocessing
  async startCustom(projectId: string, config: PreprocessingConfig): Promise<{ message: string; project_id: string }> {
    const response = await fetch(`${BACKEND_URL}/api/preprocessing/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: projectId,
        config: config
      })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to start preprocessing')
    }
    return response.json()
  },

  // Get preprocessing results
  async getResults(projectId: string): Promise<{ project_id: string; status: string; results: PreprocessingResults }> {
    const response = await fetch(`${BACKEND_URL}/api/preprocessing/${projectId}/results`)
    if (!response.ok) {
      if (response.status === 404) return null as any
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get results')
    }
    return response.json()
  },

  // Preview preprocessed data
  async getPreview(projectId: string, rows: number = 10): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/preprocessing/${projectId}/preview?rows=${rows}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get preview')
    }
    return response.json()
  }
}
