import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { UploadCloud, FileCheck, X } from 'lucide-react'

interface FileInputProps {
  disabled: boolean
  fileName?: string
  accept?: string | null
  onFileChange: (file: File | null) => void
}

export default function FileInput({ disabled, fileName, accept, onFileChange }: FileInputProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const hasFile = Boolean(fileName)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null)
  }

  const handleClear = (event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onFileChange(null)
  }

  // Generate a unique ID so multiple file inputs on the same page don't conflict
  const idRef = useRef(`file-input-${Math.random().toString(36).substr(2, 9)}`)

  return (
    <div className="mt-2.5">
      <input
        ref={fileInputRef}
        id={idRef.current}
        type="file"
        accept={accept ?? undefined}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />
      {hasFile ? (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50/20 p-3 dark:border-blue-900/50 dark:bg-blue-950/20">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
              <FileCheck className="h-4 w-4" />
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {fileName}
            </span>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-650 dark:hover:bg-slate-800 transition"
              title="Dosyayı Kaldır"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ) : (
        <label
          htmlFor={disabled ? undefined : idRef.current}
          className={`flex flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition duration-200 ${
            disabled
              ? 'border-slate-200 bg-slate-50 cursor-not-allowed text-slate-400 dark:border-slate-800 dark:bg-slate-900/50'
              : 'border-slate-350 border-slate-300 bg-slate-50/50 cursor-pointer hover:border-blue-500 hover:bg-blue-50/5 hover:shadow-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-750 dark:hover:bg-slate-900/10'
          }`}
        >
          <UploadCloud className={`h-8 w-8 ${disabled ? 'text-slate-300' : 'text-blue-600'} mb-2`} />
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
            {disabled ? 'Dosya yükleme pasif' : 'Dosya seçmek için tıklayın'}
          </span>
          <span className="mt-1 text-[10px] text-slate-400">
            {accept ? `Desteklenen formatlar: ${accept}` : 'İstediğiniz dosyayı yükleyebilirsiniz'}
          </span>
        </label>
      )}
    </div>
  )
}
