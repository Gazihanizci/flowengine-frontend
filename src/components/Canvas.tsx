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
      <div ref={setNodeRef} className={`canvas-drop ${isOver ? 'hovered' : ''}`}>
        {fields.length === 0 ? (
          <div className="empty flex flex-col items-center justify-center gap-3 py-16">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500">
              <MousePointerClick className="h-5 w-5" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">Formunuzu oluşturmaya başlayın</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Sol paneldeki bileşenleri bu alana sürükleyin.</p>
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
