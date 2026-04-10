import axios from 'axios'

const pdfApi = axios.create({
  baseURL: '/api',
})

pdfApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

function resolveFileName(contentDisposition: string | undefined, surecId: number) {
  if (!contentDisposition) {
    return `rapor_${surecId}.pdf`
  }

  const utfMatch = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i)
  if (utfMatch?.[1]) {
    return decodeURIComponent(utfMatch[1])
  }

  const plainMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
  if (plainMatch?.[1]) {
    return plainMatch[1]
  }

  return `rapor_${surecId}.pdf`
}

export async function downloadPdfBySurecId(surecId: number) {
  const response = await pdfApi.get(`/pdf/generate/${surecId}`, {
    responseType: 'blob',
    headers: {
      Accept: '*/*',
    },
  })

  const blob = new Blob([response.data], { type: 'application/pdf' })
  const url = window.URL.createObjectURL(blob)
  const filename = resolveFileName(response.headers['content-disposition'], surecId)

  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}
