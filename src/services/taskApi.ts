import axios from 'axios'
import type { TaskFormData, WorkflowTask } from '../types/task'

const taskApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
})

taskApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export async function fetchMyTasks() {
  const { data } = await taskApi.get<WorkflowTask[]>('/mytasks')
  return data
}

export async function submitTaskAction(
  taskId: number,
  payload: TaskFormData,
  aksiyonId: number,
) {
  const attempts = [
    () =>
      taskApi.post(`/task/${taskId}/action`, {
        aksiyonId,
        formData: payload,
      }),
    () =>
      taskApi.post(`/tasks/${taskId}/action`, {
        aksiyonId,
        formData: payload,
      }),
    () =>
      taskApi.post(`/task/${taskId}/action`, payload, {
        params: { aksiyonId },
      }),
    () =>
      taskApi.post(`/tasks/${taskId}/action`, payload, {
        params: { aksiyonId },
      }),
  ]

  let lastError: unknown = null

  for (const attempt of attempts) {
    try {
      const { data } = await attempt()
      return data
    } catch (error) {
      lastError = error
    }
  }

  throw lastError
}
