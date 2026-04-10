import type { ChangeEvent } from 'react'

interface FileInputProps {
  disabled: boolean
  fileName?: string
  onFileChange: (file: File | null) => void
}

export default function FileInput({ disabled, fileName, onFileChange }: FileInputProps) {
  const hasFile = Boolean(fileName)

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onFileChange(event.target.files?.[0] ?? null)
  }

  return (
    <div className="mt-2 space-y-2">
      <input
        type="file"
        className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium hover:file:bg-slate-300 disabled:cursor-not-allowed"
        disabled={disabled}
        onChange={handleChange}
      />
      {hasFile ? (
        <p className="text-xs text-slate-600">
          <span aria-hidden="true">{'\u{1F4CE}'}</span> Secilen dosya: {fileName}
        </p>
      ) : null}
    </div>
  )
}
