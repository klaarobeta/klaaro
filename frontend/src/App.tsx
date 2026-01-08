import { BrowserRouter, Routes, Route } from 'react-router-dom'
import DataUploadPage from './pages/DataUploadPage'

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          <Route path="/" element={<DataUploadPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
