import { useState } from 'react'
import { Upload, Download, Loader2, CheckCircle2, AlertCircle, FileUp, Table2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { trainingService } from '@/services/trainingService'

interface PredictionViewProps {
  projectId: string
  taskType: string
}

export default function PredictionView({ projectId, taskType }: PredictionViewProps) {
  const { toast } = useToast()
  const [predicting, setPredicting] = useState(false)
  const [predictions, setPredictions] = useState<any[] | null>(null)
  const [modelName, setModelName] = useState<string>('')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Invalid file',
        description: 'Please upload a CSV file',
        variant: 'destructive'
      })
      return
    }

    setPredicting(true)
    try {
      const result = await trainingService.predictFromFile(projectId, file)
      setPredictions(result.predictions)
      setModelName(result.model_name)
      
      if (result.download_url) {
        setDownloadUrl(trainingService.getDownloadPredictionsUrl(projectId))
      }

      toast({
        title: 'Predictions complete!',
        description: `Made ${result.prediction_count} predictions using ${result.model_name}`
      })
    } catch (error: any) {
      toast({
        title: 'Prediction failed',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setPredicting(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Make Predictions</h3>
          <p className="text-sm text-gray-500 mt-1">
            Upload a CSV file with the same features to get predictions
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          id="prediction-file"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={predicting}
          className="hidden"
        />
        <label htmlFor="prediction-file" className="cursor-pointer">
          {predicting ? (
            <Loader2 className="w-12 h-12 mx-auto text-blue-500 animate-spin mb-4" />
          ) : (
            <FileUp className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          )}
          <p className="text-sm font-medium text-gray-900 mb-1">
            {predicting ? 'Making predictions...' : 'Click to upload CSV file'}
          </p>
          <p className="text-xs text-gray-500">
            File should contain the same features used during training
          </p>
        </label>
      </div>

      {/* Predictions Result */}
      {predictions && predictions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {predictions.length} predictions generated using {modelName}
            </span>
          </div>

          {/* Preview first 10 predictions */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">Preview (first 10 results)</h4>
              {downloadUrl && (
                <a href={downloadUrl} download>
                  <Button size="sm" variant="outline" className="gap-2">
                    <Download className="w-4 h-4" />
                    Download Full Results
                  </Button>
                </a>
              )}
            </div>
            
            <div className="space-y-2">
              {predictions.slice(0, 10).map((pred, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white px-4 py-2 rounded border">
                  <span className="text-sm text-gray-500">Row {idx + 1}</span>
                  <span className="text-sm font-medium text-gray-900">
                    {taskType === 'classification' ? (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                        {pred}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">
                        {typeof pred === 'number' ? pred.toFixed(2) : pred}
                      </span>
                    )}
                  </span>
                </div>
              ))}
              {predictions.length > 10 && (
                <p className="text-xs text-gray-500 text-center pt-2">
                  ... and {predictions.length - 10} more. Download full results to see all predictions.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">Important:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>CSV file must have the same column names as training data</li>
              <li>Don't include the target column in prediction data</li>
              <li>Missing columns will be filled with default values</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
