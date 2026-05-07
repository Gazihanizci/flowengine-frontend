import { useDroppable } from '@dnd-kit/core'
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
      <div className="canvas-header">
        <h2>Yeni Form Tasarimi</h2>
        <p className="panel-subtitle">Bilesenleri bu alana surukleyin.</p>
      </div>
      <div ref={setNodeRef} className={`canvas-drop ${isOver ? 'hovered' : ''}`}>
        {fields.length === 0 ? (
          <div className="empty">
            <p>Formunuzu olusturmaya baslayin. Sol paneldeki bilesenleri bu alana surukleyin.</p>
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
