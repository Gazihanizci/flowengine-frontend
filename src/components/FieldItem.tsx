import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Trash2, GripVertical, Type, AlignLeft, ChevronDown, Circle, CheckSquare, Calendar, Hash, Upload, MousePointer } from 'lucide-react'
import type { FormField, FieldType } from '../types/form'
import FieldPreview from './FieldPreview'

interface FieldItemProps {
  field: FormField
  selected: boolean
  onSelect: () => void
  onDelete: () => void
}

const TYPE_ICON_MAP: Record<FieldType, typeof Type> = {
  TEXT: Type,
  TEXTAREA: AlignLeft,
  COMBOBOX: ChevronDown,
  RADIO: Circle,
  CHECKBOX: CheckSquare,
  DATE: Calendar,
  NUMBER: Hash,
  FILE: Upload,
  BUTTON: MousePointer,
}

const TYPE_COLOR_MAP: Record<FieldType, string> = {
  TEXT: 'text-blue-500 bg-blue-50/50 dark:bg-blue-950/30 dark:text-blue-400',
  TEXTAREA: 'text-violet-500 bg-violet-50/50 dark:bg-violet-950/30 dark:text-violet-400',
  COMBOBOX: 'text-amber-500 bg-amber-50/50 dark:bg-amber-950/30 dark:text-amber-400',
  RADIO: 'text-pink-500 bg-pink-50/50 dark:bg-pink-950/30 dark:text-pink-400',
  CHECKBOX: 'text-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 dark:text-emerald-400',
  DATE: 'text-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/30 dark:text-cyan-400',
  NUMBER: 'text-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 dark:text-indigo-400',
  FILE: 'text-orange-500 bg-orange-50/50 dark:bg-orange-950/30 dark:text-orange-400',
  BUTTON: 'text-slate-500 bg-slate-100/50 dark:bg-slate-800/50 dark:text-slate-400',
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

  const IconComponent = TYPE_ICON_MAP[field.type] ?? Type

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`field-card group relative flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 cursor-default transition-all duration-200 hover:border-blue-200 dark:hover:border-slate-700 hover:shadow-sm ${selected ? 'selected border-blue-500 ring-2 ring-blue-500/10 dark:border-blue-600 dark:ring-blue-600/15' : ''} ${
        isDragging ? 'dragging opacity-40 scale-95' : ''
      }`}
      onClick={onSelect}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      {/* Drag Grip Handle */}
      <div
        className="flex h-7 w-5 items-center justify-center cursor-grab text-slate-350 hover:text-slate-500 dark:text-slate-600 dark:hover:text-slate-400 shrink-0 transition"
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="h-4 w-4" />
      </div>

      {/* Field Main Info & Content */}
      <div className="flex-1 min-w-0 flex flex-col md:flex-row md:items-center gap-3">
        {/* Field Details */}
        <div className="md:w-1/3 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`flex h-6 w-6 items-center justify-center rounded-md shrink-0 ${TYPE_COLOR_MAP[field.type]}`}>
              <IconComponent className="h-3 w-3" />
            </div>
            <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200 truncate margin-0 leading-tight">
              {field.label}
              {field.required && <span className="text-rose-500 ml-1 font-bold">*</span>}
            </h4>
          </div>
          <span className="inline-block mt-1 text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            {field.type}
          </span>
        </div>

        {/* Input/Control Preview */}
        <div className="flex-1 min-w-0 field-preview">
          <FieldPreview field={field} />
        </div>
      </div>

      {/* Action Button */}
      <button
        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-100 bg-slate-50 hover:bg-rose-50 hover:border-rose-100 hover:text-rose-600 dark:border-slate-800 dark:bg-slate-850 dark:hover:bg-rose-950/20 dark:hover:border-rose-900/30 dark:hover:text-rose-400 transition shrink-0"
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onDelete()
        }}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}