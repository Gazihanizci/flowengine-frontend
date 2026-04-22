import type { WorkflowAction } from '../types/workflow'

interface ActionButtonsProps {
  actions: WorkflowAction[]
  loading?: boolean
  onAction: (actionId: number) => void
}

export default function ActionButtons({
  actions,
  loading,
  onAction,
}: ActionButtonsProps) {
  return (
    <div className="actions flow-actions-panel">
      {actions
        .filter((action) => action.allowed)
        .map((action) => (
          <button
            key={action.id}
            className={`button ${action.type === 'APPROVE' ? 'approve' : ''} ${
              action.type === 'REJECT' ? 'reject' : ''
            }`}
            onClick={() => onAction(action.id)}
            disabled={loading}
          >
            {action.name}
          </button>
        ))}
    </div>
  )
}
