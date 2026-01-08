import { Loader2, Brain, CheckCircle2, Clock } from 'lucide-react'
import { TrainingProgress } from '@/services/trainingService'

interface TrainingProgressViewProps {
  progress: TrainingProgress
}

export default function TrainingProgressView({ progress }: TrainingProgressViewProps) {
  const percentage = progress.total_models > 0
    ? Math.round((progress.completed_models / progress.total_models) * 100)
    : 0

  return (
    <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl border border-orange-200 p-6">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">Training in Progress</h3>
          <p className="text-sm text-gray-600">
            {progress.current_model ? `Training ${progress.current_model}...` : progress.status}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            {progress.completed_models} of {progress.total_models} models trained
          </span>
          <span className="font-medium text-gray-900">{percentage}%</span>
        </div>
        <div className="h-3 bg-white rounded-full overflow-hidden">
          <div
            className="h-full bg-orange-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Model Status Indicators */}
      <div className="mt-6 flex gap-2 flex-wrap">
        {Array.from({ length: progress.total_models }).map((_, idx) => (
          <div
            key={idx}
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              idx < progress.completed_models
                ? 'bg-green-100'
                : idx === progress.completed_models
                ? 'bg-orange-200'
                : 'bg-white'
            }`}
          >
            {idx < progress.completed_models ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : idx === progress.completed_models ? (
              <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
            ) : (
              <Clock className="w-4 h-4 text-gray-400" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
