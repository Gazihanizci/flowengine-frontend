import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import type { FieldType, FormField } from '../types/form'

type ToolboxItemDefinition = {
  id: string
  type: FieldType
  label: string
  description: string
  defaults?: Partial<FormField>
}

const TOOLBOX_ITEMS: ToolboxItemDefinition[] = [
  {
    id: 'text-short',
    type: 'TEXT',
    label: 'Kisa Metin',
    description: 'Ad, başlık, kısa giriş',
    defaults: { label: 'Kisa Metin', placeholder: 'Metin girin' },
  },
  {
    id: 'text-email',
    type: 'TEXT',
    label: 'E-posta',
    description: 'E-posta adresi girişi',
    defaults: { label: 'E-posta', placeholder: 'örnek@gmail.com' },
  },
  {
    id: 'text-phone',
    type: 'TEXT',
    label: 'Telefon',
    description: 'Telefon numarası girişi',
    defaults: { label: 'Telefon', placeholder: '05xx xxx xx xx' },
  },
  {
    id: 'text-password',
    type: 'TEXT',
    label: 'Sifre',
    description: 'Parola girişi için alan',
    defaults: { label: 'Sifre', placeholder: 'Parola girin' },
  },
  {
    id: 'textarea-notes',
    type: 'TEXTAREA',
    label: 'Aciklama',
    description: 'Uzun metin ve notlar',
    defaults: { label: 'Açıklama', placeholder: 'Detayları yazın' },
  },
  {
    id: 'combobox',
    type: 'COMBOBOX',
    label: 'Acilir Liste',
    description: 'Tek seçimli liste',
    defaults: {
      label: 'Açılır Liste',
      placeholder: 'Seçiniz',
      options: [{ label: 'Seçenek A', value: 'A' }],
    },
  },
  {
    id: 'radio',
    type: 'RADIO',
    label: 'Radyo Grubu',
    description: 'Tek seçenek işaretleme',
    defaults: {
      label: 'Radyo Grubu',
      placeholder: 'Bir seçenek seçin',
      options: [{ label: 'Seçenek 1', value: '1' }],
    },
  },
  {
    id: 'checkbox',
    type: 'CHECKBOX',
    label: 'Onay Kutusu',
    description: 'Koşul/onay için',
    defaults: { label: 'Onay Kutusu' },
  },
  {
    id: 'date',
    type: 'DATE',
    label: 'Tarih',
    description: 'Takvimden tarih seçimi',
    defaults: { label: 'Tarih' },
  },
  {
    id: 'number',
    type: 'NUMBER',
    label: 'Sayi',
    description: 'Tam sayı veya adet',
    defaults: { label: 'Sayi', placeholder: '0' },
  },
  {
    id: 'number-price',
    type: 'NUMBER',
    label: 'Tutar',
    description: 'Para değeri girişi',
    defaults: { label: 'Tutar', placeholder: '0.00' },
  },
  {
    id: 'file-generic',
    type: 'FILE',
    label: 'Dosya Yükleme',
    description: 'Genel dosya seçimi',
    defaults: { label: 'Dosya Yükleme', accept: '*/*' },
  },
  {
    id: 'file-photo',
    type: 'FILE',
    label: 'Fotograf Yükleme',
    description: 'Yalnızca görsel dosyalar',
    defaults: {
      label: 'Fotograf Yükleme',
      accept: 'image/*,.png,.jpg,.jpeg,.webp',
    },
  },
  {
    id: 'file-photo-multi',
    type: 'FILE',
    label: 'Çoklu Fotograf',
    description: 'Birden fazla görsel yükleme',
    defaults: {
      label: 'Çoklu Fotograf',
      accept: 'image/*,.png,.jpg,.jpeg,.webp',
      multiple: true,
    },
  },
  {
    id: 'button',
    type: 'BUTTON',
    label: 'Buton',
    description: 'Aksiyon tetikleme',
    defaults: { label: 'Buton' },
  },
]

interface ToolboxItemProps {
  id: string
  type: FieldType
  label: string
  description: string
  defaults?: Partial<FormField>
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

function ToolboxItem({ id, type, label, description, defaults }: ToolboxItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${id}`,
    data: { from: 'toolbox', fieldType: type, template: defaults },
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
        <span className="toolbox-description">{description}</span>
        <span className="toolbox-meta">{type}</span>
      </div>
      <ToolboxOnizleme type={type} />
    </button>
  )
}

export default function Toolbox() {
  const [query, setQuery] = useState('')

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return TOOLBOX_ITEMS

    return TOOLBOX_ITEMS.filter((item) =>
      `${item.label} ${item.type} ${item.description}`.toLowerCase().includes(normalizedQuery),
    )
  }, [query])

  return (
    <aside className="panel toolbox-panel">
      <h2>Arac Kutusu</h2>
      <p className="panel-subtitle">Bilesenleri surukleyip birakin. Toplam: {filteredItems.length}</p>
      <input
        className="input toolbox-search"
        type="search"
        value={query}
        placeholder="Arac ara..."
        onChange={(event) => setQuery(event.target.value)}
      />
      <div className="toolbox-list">
        {filteredItems.length ? (
          filteredItems.map((item) => (
            <ToolboxItem
              key={item.id}
              id={item.id}
              type={item.type}
              label={item.label}
              description={item.description}
              defaults={item.defaults}
            />
          ))
        ) : (
          <div className="empty-state">Aramaya uygun arac bulunamadi.</div>
        )}
      </div>
    </aside>
  )
}

