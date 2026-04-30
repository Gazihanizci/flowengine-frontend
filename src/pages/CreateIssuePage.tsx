import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IssueForm from '../components/issues/IssueForm'
import { createIssue } from '../services/issueApi'
import type { CreateIssuePayload } from '../types/issue'

function CreateIssuePage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (payload: CreateIssuePayload) => {
    setSubmitting(true)
    setError('')
    try {
      await createIssue(payload)
      navigate('/issues')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Issue olusturulamadi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="content">
      {error && <p className="error-text">{error}</p>}
      <IssueForm onSubmit={handleSubmit} submitting={submitting} />
    </div>
  )
}

export default CreateIssuePage
