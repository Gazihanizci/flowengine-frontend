import type { WorkflowFile } from '../types/workflow'

interface FileListProps {
  files: WorkflowFile[]
}

export default function FileList({ files }: FileListProps) {
  if (!files.length) return null

  return (
    <div className="file-list">
      <h3>Dosyalar</h3>
      <ul>
        {files.map((file) => {
          const isPdf = file.name.toLowerCase().endsWith('.pdf')
          return (
            <li key={file.id}>
              <a href={file.url} target="_blank" rel="noreferrer">
                {file.name}
              </a>
              {isPdf && <span className="file-tag">PDF</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}