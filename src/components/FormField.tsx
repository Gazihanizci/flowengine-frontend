import type { ReactNode } from 'react'
import type { TaskField } from '../types/task'
import { Edit3, Eye, Info } from 'lucide-react'

interface FormFieldProps {
  field: TaskField
  children: ReactNode
}

export default function FormField({ field, children }: FormFieldProps) {
  const typeLabel: Record<TaskField['type'], string> = {
    TEXT: 'Metin',
    TEXTAREA: 'Açıklama',
    NUMBER: 'Sayı',
    DATE: 'Tarih',
    RADIO: 'Seçenek (Radio)',
    CHECKBOX: 'Onay Kutusu',
    FILE: 'Dosya Yükleme',
    COMBOBOX: 'Seçim Listesi',
    BUTTON: 'Aksiyon Butonu',
  }

  const containerClassName = field.editable
    ? 'task-field-shell editable border border-slate-200 bg-white p-5 rounded-2xl shadow-sm hover:border-slate-350 hover:shadow-md transition dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700'
    : 'task-field-shell readonly border border-slate-150 bg-slate-50/50 p-5 rounded-2xl dark:border-slate-900 dark:bg-slate-900/10'

  return (
    <div className={containerClassName}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-900 pb-3 mb-3">
        <div>
          <p className="text-sm font-extrabold text-slate-800 dark:text-white leading-snug">{field.label}</p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {typeLabel[field.type]}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {field.editable ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">
              <Edit3 className="h-3 w-3" />
              Bu alan sana ait
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-650 dark:bg-slate-800 dark:text-slate-400">
              <Eye className="h-3 w-3" />
              Salt okunur
            </span>
          )}
          <span className="text-[10px] font-semibold text-slate-400">Alan ID: {field.fieldId}</span>
        </div>
      </div>
      
      {children}

      {!field.editable ? (
        <div className="mt-3 flex items-start gap-1.5 rounded-xl border border-slate-100 bg-slate-50/60 p-2.5 text-[11px] font-semibold text-slate-500 dark:border-slate-850 dark:bg-slate-900/5 dark:text-slate-400 leading-relaxed">
          <Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>Bu alan önceki adımlarda doldurulmuştur ve değiştirilemez.</span>
        </div>
      ) : null}
    </div>
  )
}
