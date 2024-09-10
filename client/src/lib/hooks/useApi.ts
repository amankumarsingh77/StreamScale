import { instance } from '@/api/apiInstance'
import { useState, useCallback } from 'react'

interface Config<T> {
  method: string
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: T
  onUploadProgress?: (progressEvent: any) => void
}

interface ApiResponse<T> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: Config<T>
  request?: any
}

export const useApi = <T = any, R = any>() => {
  const [data, setData] = useState<R | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  const makeRequest = useCallback(async (config: Config<T>): Promise<boolean> => {
    setError(null)
    setIsSuccess(false)
    setLoading(true)

    try {
      const response = await instance<ApiResponse<R>>({
        ...config,
        url: `${BASE_URL}${config.url}`,
      })
      setData(response.data.data)
      setIsSuccess(true)
      return true
    } catch (err: any) {
      console.error(err)
      setIsSuccess(false)
      setError(err?.response?.data?.message || err?.message || 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }, [BASE_URL])

  return {
    data,
    setData,
    error,
    loading,
    setLoading,
    makeRequest,
    isSuccess,
    setIsSuccess,
    setError
  }
}
