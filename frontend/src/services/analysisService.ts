const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8001'

export interface ColumnAnalysis {
  name: string
  dtype: string
  semantic_type: string
  missing_count: number
  missing_pct: number
  unique_count: number
  unique_pct: number
  min?: number
  max?: number
  mean?: number
  std?: number
  median?: number
  outlier_count?: number
  outlier_pct?: number
  top_values?: Record<string, number>
  avg_length?: number
  max_length?: number
}

export interface Issue {
  type: string
  severity: 'high' | 'medium' | 'low'
  column: string | null
  message: string
  suggestion: string
}

export interface Suggestion {
  type: string
  priority: 'required' | 'recommended' | 'optional'
  title: string
  description: string
  columns: string[]
}

export interface TargetCandidate {
  column: string
  unique_values: number
  score: number
  suggested_task: string | null
}

export interface AnalysisResults {
  analyzed_at: string
  task_type: string
  task_confidence: number
  data_quality_score: number
  total_rows: number
  total_columns: number
  column_analysis: ColumnAnalysis[]
  target_candidates: TargetCandidate[]
  issues: Issue[]
  suggestions: Suggestion[]
  issue_summary: {
    high: number
    medium: number
    low: number
  }
}

export const analysisService = {
  // Start analysis for a project
  async startAnalysis(projectId: string): Promise<{ message: string; project_id: string }> {
    const response = await fetch(`${BACKEND_URL}/api/analysis/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project_id: projectId })
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to start analysis')
    }
    return response.json()
  },

  // Get analysis results
  async getResults(projectId: string): Promise<{ project_id: string; status: string; task_type: string; analysis: AnalysisResults }> {
    const response = await fetch(`${BACKEND_URL}/api/analysis/${projectId}/analysis`)
    if (!response.ok) {
      if (response.status === 404) return null as any
      const error = await response.json()
      throw new Error(error.detail || 'Failed to get analysis')
    }
    return response.json()
  },

  // Set target column
  async setTargetColumn(projectId: string, targetColumn: string): Promise<{ message: string; target_column: string }> {
    const response = await fetch(`${BACKEND_URL}/api/analysis/${projectId}/set-target?target_column=${encodeURIComponent(targetColumn)}`, {
      method: 'POST'
    })
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.detail || 'Failed to set target column')
    }
    return response.json()
  }
}
