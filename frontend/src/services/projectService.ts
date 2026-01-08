const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export interface Project {
  id: string
  name: string
  description: string
  data_source: 'upload' | 'existing' | 'internet'
  status: string
  dataset_id: string | null
  target_column: string | null
  feature_columns: string[]
  task_type: string | null
  analysis_results: any
  preprocessing_config: any
  training_config: any
  model_id: string | null
  created_at: string
  updated_at: string
}

export interface CreateProjectRequest {
  name: string
  description: string
  data_source: 'upload' | 'existing' | 'internet'
}

export interface LinkDatasetRequest {
  dataset_id: string
}

export const projectService = {
  // Create a new project
  async create(data: CreateProjectRequest): Promise<Project> {
    const response = await fetch(`${BACKEND_URL}/api/projects/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to create project')
    }
    return response.json()
  },

  // List all projects
  async list(params?: { status?: string; limit?: number; skip?: number }): Promise<{ projects: Project[]; total: number }> {
    const searchParams = new URLSearchParams()
    if (params?.status) searchParams.append('status', params.status)
    if (params?.limit) searchParams.append('limit', params.limit.toString())
    if (params?.skip) searchParams.append('skip', params.skip.toString())
    
    const response = await fetch(`${BACKEND_URL}/api/projects/?${searchParams}`)
    if (!response.ok) throw new Error('Failed to fetch projects')
    return response.json()
  },

  // Get a single project
  async get(projectId: string): Promise<Project> {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`)
    if (!response.ok) {
      if (response.status === 404) throw new Error('Project not found')
      throw new Error('Failed to fetch project')
    }
    return response.json()
  },

  // Update a project
  async update(projectId: string, data: Partial<Project>): Promise<Project> {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Failed to update project')
    return response.json()
  },

  // Delete a project
  async delete(projectId: string): Promise<void> {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Failed to delete project')
  },

  // Link a dataset to a project
  async linkDataset(projectId: string, datasetId: string): Promise<{ project: Project; dataset: any }> {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/link-dataset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataset_id: datasetId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to link dataset')
    }
    return response.json()
  },

  // Get project's linked dataset
  async getDataset(projectId: string): Promise<any> {
    const response = await fetch(`${BACKEND_URL}/api/projects/${projectId}/dataset`)
    if (!response.ok) {
      if (response.status === 404) return null
      throw new Error('Failed to fetch dataset')
    }
    return response.json()
  },

  // Get projects summary stats
  async getSummary(): Promise<{ total_projects: number; by_status: Record<string, number>; by_task_type: Record<string, number> }> {
    const response = await fetch(`${BACKEND_URL}/api/projects/stats/summary`)
    if (!response.ok) throw new Error('Failed to fetch summary')
    return response.json()
  }
}
