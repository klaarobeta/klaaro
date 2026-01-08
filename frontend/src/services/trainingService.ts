const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

// ==================== TYPES ====================

export interface ModelSelection {
  model_id: string
  name: string
  selected: boolean
  priority: number
  reason: string
  params: Record<string, any>
}

export interface ModelSelectionResult {
  project_id: string
  task_type: string
  recommended_models: ModelSelection[]
  selection_reasoning: string
  data_characteristics: {
    train_samples: number
    test_samples: number
    total_features: number
    has_categorical: boolean
    has_missing_values: boolean
    quality_score: number
  }
}

export interface ModelCatalogItem {
  name: string
  description: string
  best_for: string[]
  limitations: string[]
  tunable_params: Record<string, any>
  complexity: string
  training_speed: string
}

export interface TrainingProgress {
  total_models: number
  completed_models: number
  current_model: string | null
  status: string
}

export interface TrainingResult {
  model_id: string
  model_name: string
  status: 'completed' | 'failed'
  metrics?: Record<string, number>
  error?: string
  model_path?: string
  params_used?: Record<string, any>
  trained_at: string
}

export interface TrainingResults {
  completed_at: string
  models_trained: number
  models_successful: number
  best_model: TrainingResult | null
  all_results: TrainingResult[]
}

// ==================== SERVICE ====================

export const trainingService = {
  // Auto-select models based on project analysis
  async selectModels(projectId: string): Promise<ModelSelectionResult> {
    const response = await fetch(`${BACKEND_URL}/api/training/select-models`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to select models')
    }
    return response.json()
  },

  // Get current model selection
  async getModelSelection(projectId: string): Promise<ModelSelectionResult> {
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/model-selection`)
    if (!response.ok) {
      if (response.status === 404) return null as any
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get model selection')
    }
    return response.json()
  },

  // Get model catalog for a task type
  async getModelCatalog(taskType: string): Promise<{ task_type: string; models: Record<string, ModelCatalogItem> }> {
    const response = await fetch(`${BACKEND_URL}/api/training/catalog/${taskType}`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get model catalog')
    }
    return response.json()
  },

  // Update model selection (user customization)
  async updateModelSelection(projectId: string, models: ModelSelection[]): Promise<{ message: string; models_count: number }> {
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/update-selection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(models)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to update model selection')
    }
    return response.json()
  },

  // Start training
  async startTraining(projectId: string): Promise<{ message: string; project_id: string; models_count: number }> {
    const response = await fetch(`${BACKEND_URL}/api/training/start-training`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to start training')
    }
    return response.json()
  },

  // Get training status
  async getTrainingStatus(projectId: string): Promise<{
    project_id: string
    status: string
    progress: TrainingProgress | null
    results: TrainingResults | null
  }> {
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/training-status`)
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get training status')
    }
    return response.json()
  },

  // Get training results
  async getTrainingResults(projectId: string): Promise<{
    project_id: string
    task_type: string
    results: TrainingResults
  }> {
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/training-results`)
    if (!response.ok) {
      if (response.status === 404) return null as any
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get training results')
    }
    return response.json()
  }

  // PART 14: Download model
  getDownloadModelUrl(projectId: string, modelId: string): string {
    return `${BACKEND_URL}/api/training/${projectId}/download-model/${modelId}`
  },

  getDownloadPipelineUrl(projectId: string): string {
    return `${BACKEND_URL}/api/training/${projectId}/download-pipeline`
  },

  // PART 15: Make predictions
  async predict(projectId: string, data: Record<string, any>[]): Promise<{
    predictions: any[]
    feature_names: string[]
    model_name: string
    prediction_count: number
    task_type: string
  }> {
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to make predictions')
    }
    return response.json()
  },

  async predictFromFile(projectId: string, file: File): Promise<{
    predictions: any[]
    feature_names: string[]
    model_name: string
    prediction_count: number
    download_url?: string
  }> {
    const formData = new FormData()
    formData.append('file', file)
    
    const response = await fetch(`${BACKEND_URL}/api/training/${projectId}/predict-file`, {
      method: 'POST',
      body: formData
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to predict from file')
    }
    return response.json()
  },

  getDownloadPredictionsUrl(projectId: string): string {
    return `${BACKEND_URL}/api/training/${projectId}/download-predictions`
  },
}
