import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { FormField } from '../types/form'
import FieldPreview from './FieldPreview'

interface FieldItemProps {
  field: FormField
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}

export default function FieldItem({
  field,
  selected,
  onSelect,
  onDelete,
}: FieldItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: field.id,
      data: { from: 'canvas' },
    })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-card ${selected ? 'selected' : ''} ${
        isDragging ? 'dragging' : ''
      }`}
      onClick={onSelect}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      <div className="field-info">
        <div className="field-meta">
          <h4>{field.label}</h4>
          <p>{field.type}</p>
        </div>
        <div className="field-preview">
          <FieldPreview field={field} />
        </div>
      </div>
      <button
        className="icon-button"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      >
        Sil
      </button>
    </div>
  )
}