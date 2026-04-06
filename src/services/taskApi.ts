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
  payload: {
    aksiyonId: number
    formData: TaskFormData
  },
) {
  const { data } = await taskApi.post(`/tasks/${taskId}/action`, payload)
  return data
}
