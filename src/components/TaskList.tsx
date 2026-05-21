import { useMemo, useState } from 'react'
import type { WorkflowTask } from '../types/task'
import { Search, Clock, Layers, GitBranch, ChevronRight, AlertCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
} as const

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: { type: 'spring' as const, stiffness: 260, damping: 20 }
  },
  exit: { opacity: 0, scale: 0.96, transition: { duration: 0.15 } }
}

interface TaskListProps {
  tasks: WorkflowTask[]
  loading: boolean
  error: string | null
  onSelectTask: (task: WorkflowTask) => void
  onRetry: () => void
}

function toFlowName(task: WorkflowTask) {
  return task.akisAdi?.trim() || 'Tanımlanmamış İş Akışı'
}

export default function TaskList({ tasks, loading, error, onSelectTask, onRetry }: TaskListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [sortType, setSortType] = useState<'LATEST' | 'OLDEST' | 'AZ' | 'ZA'>('LATEST')

  const filteredTasks = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase('tr-TR')
    const base = tasks.filter((task) => {
      if (!normalized) return true
      const flowName = toFlowName(task).toLocaleLowerCase('tr-TR')
      return (
        flowName.includes(normalized) ||
        String(task.taskId).includes(normalized) ||
        String(task.surecId).includes(normalized) ||
        String(task.adimId).includes(normalized)
      )
    })

    return [...base].sort((a, b) => {
      if (sortType === 'LATEST') return b.taskId - a.taskId
      if (sortType === 'OLDEST') return a.taskId - b.taskId
      
      const nameA = toFlowName(a).toLocaleLowerCase('tr-TR')
      const nameB = toFlowName(b).toLocaleLowerCase('tr-TR')
      if (sortType === 'AZ') return nameA.localeCompare(nameB)
      return nameB.localeCompare(nameA)
    })
  }, [searchTerm, sortType, tasks])

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 space-y-4">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-900 pb-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600">Execution Queue</p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-850 dark:text-white">Görev Formları</h2>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-blue-100 bg-blue-50/20 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-400">
          <span>{filteredTasks.length}</span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-500/80">Aktif Kayıt</span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-center rounded-2xl border border-slate-100 bg-slate-50/40 p-3.5 dark:border-slate-900 dark:bg-slate-900/10">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-4 py-2.5 text-xs font-semibold outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:focus:ring-blue-500/10"
            type="search"
            value={searchTerm}
            placeholder="Görev ID, süreç ID veya akış adı ara..."
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition duration-155 ${
              sortType === 'LATEST'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
            }`}
            onClick={() => setSortType('LATEST')}
          >
            En Yeni
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition duration-155 ${
              sortType === 'OLDEST'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
            }`}
            onClick={() => setSortType('OLDEST')}
          >
            En Eski
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition duration-155 ${
              sortType === 'AZ'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
            }`}
            onClick={() => setSortType('AZ')}
          >
            A-Z
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1.5 text-[10px] font-bold transition duration-155 ${
              sortType === 'ZA'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/15'
                : 'bg-white border border-slate-200 text-slate-655 hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-800'
            }`}
            onClick={() => setSortType('ZA')}
          >
            Z-A
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="flex items-center justify-center py-10 text-xs font-bold text-slate-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent mr-2"></div>
          Görevler yükleniyor...
        </div>
      ) : null}

      {/* Error State */}
      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-rose-200 bg-rose-50/20 p-5 text-center dark:border-rose-900/50 dark:bg-rose-950/20">
          <AlertCircle className="h-6 w-6 text-rose-500" />
          <p className="text-xs font-bold text-rose-700 dark:text-rose-400">{error}</p>
          <button
            type="button"
            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 transition"
            onClick={onRetry}
          >
            Tekrar Dene
          </button>
        </div>
      ) : null}

      {/* Empty State */}
      {!loading && !error && filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-xs font-bold text-slate-400 dark:border-slate-850 dark:bg-slate-900/10">
          {tasks.length === 0 ? 'Aktif görev bulunmamaktadır.' : 'Arama kriterine uygun görev bulunamadı.'}
        </div>
      ) : null}

      {/* Task List Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid gap-2.5 max-h-[60vh] overflow-y-auto pr-1"
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {filteredTasks.map((task) => (
            <motion.button
              variants={itemVariants}
              layout
              whileHover={{ scale: 1.015, y: -2 }}
              whileTap={{ scale: 0.99 }}
              key={task.taskId}
              type="button"
              onClick={() => onSelectTask(task)}
              className="relative flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors duration-200 hover:border-blue-500 hover:shadow-md dark:border-slate-850 dark:bg-slate-950 dark:hover:border-blue-900 group"
            >
              {/* Left strip */}
              <div className="absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl bg-gradient-to-b from-blue-500 to-blue-700 opacity-80"></div>

              <div className="pl-2.5 space-y-2.5 min-w-0">
                <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                  {toFlowName(task)}
                </p>
                
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/40 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <Layers className="h-3 w-3 text-slate-400" />
                    Süreç #{task.surecId}
                  </span>
                  
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/40 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <GitBranch className="h-3 w-3 text-slate-400" />
                    Adım {task.adimId}
                  </span>

                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/20 dark:text-amber-400">
                    <Clock className="h-3 w-3 text-amber-500" />
                    Yanıt Bekleniyor
                  </span>
                </div>
              </div>

              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition dark:bg-slate-900 dark:group-hover:bg-blue-950 dark:group-hover:text-blue-400">
                <ChevronRight className="h-4 w-4" />
              </div>
            </motion.button>
          ))}
        </AnimatePresence>
      </motion.div>
    </section>
  )
}
