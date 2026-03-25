import axios from 'axios'

export interface UploadResponse {
  fileId: number
  fileUrl: string
}

export async function uploadFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)

  const { data } = await axios.post<UploadResponse>('/api/files/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  return data
}