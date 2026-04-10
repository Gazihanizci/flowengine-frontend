import { useState } from 'react'
import FileUpload from '../components/FileUpload.jsx'

export default function FileUploadDemo() {
  const [lastUploadedId, setLastUploadedId] = useState<number | null>(null)

  return (
    <div className="space-y-4">
      <FileUpload onUploadSuccess={(dosyaId: number) => setLastUploadedId(dosyaId)} />
      {lastUploadedId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Son yuklenen dosya ID: {lastUploadedId}
        </div>
      ) : null}
    </div>
  )
}
