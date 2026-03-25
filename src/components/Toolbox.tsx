import { useDraggable } from '@dnd-kit/core'
import type { FieldType } from '../types/form'

const TOOLBOX_ITEMS: { type: FieldType; label: string }[] = [
  { type: 'TEXT', label: 'Metin Girişi' },
  { type: 'TEXTAREA', label: 'Metin Alanı' },
  { type: 'COMBOBOX', label: 'Açılır Liste' },
  { type: 'RADIO', label: 'Radyo Grubu' },
  { type: 'CHECKBOX', label: 'Onay Kutusu' },
  { type: 'DATE', label: 'Tarih' },
  { type: 'NUMBER', label: 'Sayı' },
  { type: 'FILE', label: 'Dosya Yükleme' },
  { type: 'BUTTON', label: 'Buton' },
]

interface ToolboxItemProps {
  type: FieldType
  label: string
}

function ToolboxOnizleme({ type }: { type: FieldType }) {
  switch (type) {
    case 'TEXT':
      return <div className="toolbox-preview input">Metin</div>
    case 'TEXTAREA':
      return <div className="toolbox-preview textarea">Metin alanı</div>
    case 'COMBOBOX':
      return <div className="toolbox-preview select">Seçiniz</div>
    case 'RADIO':
      return (
        <div className="toolbox-preview radio">
          <span className="dot" />
          Seçenek
        </div>
      )
    case 'CHECKBOX':
      return (
        <div className="toolbox-preview checkbox">
          <span className="box" />
          Onay
        </div>
      )
    case 'DATE':
      return <div className="toolbox-preview input">2026-01-01</div>
    case 'NUMBER':
      return <div className="toolbox-preview input">123</div>
    case 'FILE':
      return <div className="toolbox-preview file">Dosya seç</div>
    case 'BUTTON':
      return <div className="toolbox-preview button">Gönder</div>
    default:
      return null
  }
}

function ToolboxItem({ type, label }: ToolboxItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${type}`,
    data: { from: 'toolbox', fieldType: type },
  })

  return (
    <button
      ref={setNodeRef}
      className={`toolbox-item ${isDragging ? 'dragging' : ''}`}
      {...attributes}
      {...listeners}
      type="button"
    >
      <div>
        <span className="toolbox-label">{label}</span>
        <span className="toolbox-meta">{type}</span>
      </div>
      <ToolboxOnizleme type={type} />
    </button>
  )
}

export default function Toolbox() {
  return (
    <aside className="panel">
      <h2>Araç Kutusu</h2>
      <p className="panel-subtitle">Bileşenleri sürükleyip bırakın.</p>
      <div className="toolbox-list">
        {TOOLBOX_ITEMS.map((item) => (
          <ToolboxItem key={item.type} type={item.type} label={item.label} />
        ))}
      </div>
    </aside>
  )
}