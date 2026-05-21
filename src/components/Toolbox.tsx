import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import {
  Type,
  AlignLeft,
  ChevronDown,
  Circle,
  CheckSquare,
  Calendar,
  Hash,
  Upload,
  MousePointer,
  Search,
  Layers,
  GripVertical
} from 'lucide-react'
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
    label: 'Kısa Metin',
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
    label: 'Şifre',
    description: 'Parola girişi için alan',
    defaults: { label: 'Sifre', placeholder: 'Parola girin' },
  },
  {
    id: 'textarea-notes',
    type: 'TEXTAREA',
    label: 'Açıklama',
    description: 'Uzun metin ve notlar',
    defaults: { label: 'Açıklama', placeholder: 'Detaylar yazın' },
  },
  {
    id: 'combobox',
    type: 'COMBOBOX',
    label: 'Açılır Liste',
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
    label: 'Sayı',
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
    label: 'Fotoğraf Yükleme',
    description: 'Yalnızca görsel dosyalar',
    defaults: {
      label: 'Fotograf Yükleme',
      accept: 'image/*,.png,.jpg,.jpeg,.webp',
    },
  },
  {
    id: 'file-photo-multi',
    type: 'FILE',
    label: 'Çoklu Fotoğraf',
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
  TEXT: 'text-blue-500 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400',
  TEXTAREA: 'text-violet-500 bg-violet-50 dark:bg-violet-950/30 dark:text-violet-400',
  COMBOBOX: 'text-amber-500 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400',
  RADIO: 'text-pink-500 bg-pink-50 dark:bg-pink-950/30 dark:text-pink-400',
  CHECKBOX: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400',
  DATE: 'text-cyan-500 bg-cyan-50 dark:bg-cyan-950/30 dark:text-cyan-400',
  NUMBER: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 dark:text-indigo-400',
  FILE: 'text-orange-500 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400',
  BUTTON: 'text-slate-500 bg-slate-100 dark:bg-slate-800 dark:text-slate-400',
}

interface ToolboxItemProps {
  id: string
  type: FieldType
  label: string
  description: string
  defaults?: Partial<FormField>
}

const CATEGORIES = [
  {
    name: 'Metin Girişleri',
    items: ['text-short', 'text-email', 'text-phone', 'text-password', 'textarea-notes'],
  },
  {
    name: 'Seçenekler & Listeler',
    items: ['combobox', 'radio', 'checkbox'],
  },
  {
    name: 'Sayı & Zaman',
    items: ['number', 'number-price', 'date'],
  },
  {
    name: 'Yükleme & Aksiyon',
    items: ['file-generic', 'file-photo', 'file-photo-multi', 'button'],
  },
]


function ToolboxItem({ id, type, label, description, defaults }: ToolboxItemProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `toolbox-${id}`,
    data: { from: 'toolbox', fieldType: type, template: defaults },
  })

  const Icon = TYPE_ICON_MAP[type] ?? Type

  return (
    <button
      ref={setNodeRef}
      className={`toolbox-item group w-full flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 text-left transition-all duration-200 hover:-translate-y-[1px] hover:border-blue-500 hover:shadow-md hover:shadow-blue-500/5 dark:hover:border-blue-800 ${isDragging ? 'opacity-40 scale-95 shadow-none' : ''}`}
      {...attributes}
      {...listeners}
      type="button"
    >
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-transform group-hover:scale-105 duration-205 ${TYPE_COLOR_MAP[type]}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">{label}</span>
        <span className="block text-[10px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{description}</span>
      </div>
      <GripVertical className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 opacity-30 group-hover:opacity-100 transition-opacity shrink-0" />
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

  const categorizedContent = useMemo(() => {
    return CATEGORIES.map((cat) => {
      const items = filteredItems.filter((item) => cat.items.includes(item.id))
      return { ...cat, items }
    }).filter((cat) => cat.items.length > 0)
  }, [filteredItems])

  return (
    <aside className="panel toolbox-panel flex flex-col h-full max-h-[calc(100vh-140px)] overflow-hidden">
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400">
            <Layers className="h-3.5 w-3.5" />
          </div>
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-white">Bileşen Kütüphanesi</h2>
        </div>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mb-3">Sürükle ve bırak ile formunuzu oluşturun.</p>

        <div className="relative mb-4">
          <input
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-3.5 pr-9 text-xs outline-none transition duration-200 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100 dark:focus:bg-slate-950 dark:focus:ring-blue-500/5"
            type="search"
            value={query}
            placeholder="Araç ara..."
            onChange={(event) => setQuery(event.target.value)}
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-4">
        {categorizedContent.length ? (
          categorizedContent.map((cat) => (
            <div key={cat.name} className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-450 dark:text-slate-500">
                  {cat.name}
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                  {cat.items.length}
                </span>
              </div>
              <div className="grid gap-2">
                {cat.items.map((item) => (
                  <ToolboxItem
                    key={item.id}
                    id={item.id}
                    type={item.type}
                    label={item.label}
                    description={item.description}
                    defaults={item.defaults}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center text-xs text-slate-400 py-12">
            Aramaya uygun araç bulunamadı.
          </div>
        )}
      </div>
    </aside>
  )
}
