import { useDroppable } from '@dnd-kit/core'
import { MousePointerClick } from 'lucide-react'
import type { FormField } from '../types/form'
import FieldItem from './FieldItem'

interface CanvasProps {
  fields: FormField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onDelete: (id: string) => void
}

export default function Canvas({
  fields,
  selectedId,
  onSelect,
  onDelete,
}: CanvasProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: 'canvas-drop',
  })

  return (
    <section className="panel canvas">
      <div className="canvas-header flex items-center justify-between mb-3">
        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Form Tasarımı</h2>
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
          {fields.length} alan
        </span>
      </div>
      <div ref={setNodeRef} className={`canvas-drop transition-all duration-300 ${isOver ? 'hovered border-blue-500 dark:border-blue-400 shadow-lg shadow-blue-500/10 scale-[1.005]' : ''}`}>
        {fields.length === 0 ? (
          <div className="empty flex flex-col items-center justify-center gap-4 py-16 transition-all duration-200">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/30 animate-pulse">
              <MousePointerClick className="h-6 w-6" />
            </div>
            <div className="text-center space-y-1.5 max-w-xs">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Form Tasarımına Başlayın</p>
              <p className="text-xs text-slate-450 dark:text-slate-500 leading-relaxed">Bileşen Kütüphanesi panelinden öğeleri bu alana sürükleyip bırakarak form yapınızı oluşturun.</p>
            </div>
          </div>
        ) : (
          <div className="field-list">
            {fields.map((field) => (
              <FieldItem
                key={field.id}
                field={field}
                selected={selectedId === field.id}
                onSelect={() => onSelect(field.id)}
                onDelete={() => onDelete(field.id)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
