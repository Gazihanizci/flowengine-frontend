import { useState } from 'react'
import axios from 'axios'

export default function FileUpload({ onUploadSuccess }) {
  const [selectedFile, setSelectedFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [uploadedId, setUploadedId] = useState(null)
  const [downloadUrl, setDownloadUrl] = useState('')

  const uploadFile = async (file, surecId, adimId, aksiyonId, userId) => {
    const formData = new FormData()
    formData.append('file', file)
    const token = localStorage.getItem('auth_token')

    const response = await axios.post('/api/files/upload', formData, {
      params: {
        surecId,
        adimId,
        aksiyonId,
        userId,
      },
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    })

    return response.data
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    setErrorMessage('')
    setSuccessMessage('')
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setErrorMessage('Lütfen önce bir dosya seçin.')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')

    try {
      const result = await uploadFile(selectedFile, 104, 83, 1, 12)
      const dosyaId = result?.dosyaId ?? result?.fileId ?? result?.fotografId

      if (!dosyaId) {
        throw new Error('API yanıtında dosyaId/fotografId bulunamadı.')
      }

      setUploadedId(dosyaId)
      setSuccessMessage(`Yükleme başarılı: ${result?.dosyaAdi ?? result?.fotografAdi ?? selectedFile.name}`)
      setDownloadUrl(result?.imageUrl ?? result?.downloadUrl ?? `/api/fotograflar/view/${dosyaId}`)

      if (typeof onUploadSuccess === 'function') {
        onUploadSuccess(dosyaId)
      }
    } catch (error) {
      const apiMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        'Dosya yükleme başarısız oldu.'

      setErrorMessage(apiMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-800">File Upload</h2>
      <p className="mt-1 text-sm text-slate-500">Dosya seçip yükleyebilirsiniz.</p>

      <div className="mt-4 space-y-3">
        <input
          type="file"
          onChange={handleFileChange}
          disabled={loading}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium hover:file:bg-slate-300 disabled:cursor-not-allowed"
        />

        {selectedFile ? <p className="text-sm text-slate-600">Seçilen dosya: {selectedFile.name}</p> : null}

        <button
          type="button"
          onClick={handleUpload}
          disabled={loading || !selectedFile}
          className="inline-flex items-center rounded-xl bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-cyan-300"
        >
          {loading ? 'Yükleniyor...' : 'Upload'}
        </button>

        {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
        {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}

        {uploadedId ? (
          <p className="text-sm text-slate-700">
            Download:{' '}
            <a
              href={`http://localhost:8080${downloadUrl || `/api/files/download/${uploadedId}`}`}
              target="_blank"
              rel="noreferrer"
              className="text-cyan-700 underline"
            >
              {`http://localhost:8080${downloadUrl || `/api/files/download/${uploadedId}`}`}
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
