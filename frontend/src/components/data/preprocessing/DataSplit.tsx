import { useState } from 'react'
import { Loader2, CheckCircle, Scissors } from 'lucide-react'
import { splitData } from '@/services/preprocessingService'

interface Props {
  datasetId: string
  onComplete: (splits: any) => void
}

export default function DataSplit({ datasetId, onComplete }: Props) {
  const [trainRatio, setTrainRatio] = useState(70)
  const [valRatio, setValRatio] = useState(15)
  const [testRatio, setTestRatio] = useState(15)
  const [shuffle, setShuffle] = useState(true)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const updateRatio = (type: 'train' | 'val' | 'test', value: number) => {
    if (type === 'train') {
      setTrainRatio(value)
      const remaining = 100 - value
      setValRatio(Math.round(remaining / 2))
      setTestRatio(remaining - Math.round(remaining / 2))
    } else if (type === 'val') {
      setValRatio(value)
      setTestRatio(100 - trainRatio - value)
    } else {
      setTestRatio(value)
      setValRatio(100 - trainRatio - value)
    }
  }

  const handleProcess = async () => {
    if (trainRatio + valRatio + testRatio !== 100) {
      setError('Ratios must sum to 100%')
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await splitData(
        datasetId,
        trainRatio / 100,
        valRatio / 100,
        testRatio / 100,
        shuffle
      )
      setResult(res)
      onComplete(res.splits)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to split')
    } finally {
      setLoading(false)
    }
  }

  const total = trainRatio + valRatio + testRatio

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 p-3 rounded-lg">
        <Scissors className="w-5 h-5" />
        <span className="text-sm">Split dataset into train, validation, and test sets</span>
      </div>

      {/* Ratio sliders */}
      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Training Set</label>
            <span className="text-sm text-blue-600 font-medium">{trainRatio}%</span>
          </div>
          <input
            type="range"
            min="50"
            max="90"
            value={trainRatio}
            onChange={(e) => updateRatio('train', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Validation Set</label>
            <span className="text-sm text-green-600 font-medium">{valRatio}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={100 - trainRatio}
            value={valRatio}
            onChange={(e) => updateRatio('val', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-sm font-medium text-gray-700">Test Set</label>
            <span className="text-sm text-purple-600 font-medium">{testRatio}%</span>
          </div>
          <input
            type="range"
            min="0"
            max={100 - trainRatio}
            value={testRatio}
            onChange={(e) => updateRatio('test', parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            disabled
          />
        </div>
      </div>

      {/* Visual bar */}
      <div className="h-8 rounded-lg overflow-hidden flex">
        <div style={{ width: `${trainRatio}%` }} className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium">
          Train
        </div>
        <div style={{ width: `${valRatio}%` }} className="bg-green-500 flex items-center justify-center text-white text-xs font-medium">
          Val
        </div>
        <div style={{ width: `${testRatio}%` }} className="bg-purple-500 flex items-center justify-center text-white text-xs font-medium">
          Test
        </div>
      </div>

      {total !== 100 && (
        <p className="text-sm text-red-500">Ratios must sum to 100% (currently {total}%)</p>
      )}

      {/* Shuffle option */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={shuffle}
          onChange={(e) => setShuffle(e.target.checked)}
          className="w-4 h-4 rounded border-gray-300"
        />
        <span className="text-sm text-gray-700">Shuffle data before splitting</span>
      </label>

      {/* Process button */}
      <button
        onClick={handleProcess}
        disabled={loading || total !== 100}
        className="w-full py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {loading ? 'Splitting...' : 'Split Dataset'}
      </button>

      {/* Result */}
      {result && (
        <div className="flex items-start gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
          <CheckCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-medium">Split complete!</p>
            <div className="text-sm mt-1 space-y-1">
              {result.splits.train && <p>Train: {result.splits.train.rows} rows</p>}
              {result.splits.val && <p>Validation: {result.splits.val.rows} rows</p>}
              {result.splits.test && <p>Test: {result.splits.test.rows} rows</p>}
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>
      )}
    </div>
  )
}
