import { instance } from '@/api/apiInstance'
import { useState } from 'react'

interface Config {
  method: string
  url: string
  headers?: Record<string, string>
  params?: Record<string, any>
  data?: any
  onUploadProgress?: (progressEvent: any) => void
}

interface ApiResponse<T> {
  data: T
  status: number
  statusText: string
  headers: Record<string, string>
  config: Config
  request?: any
}

export const useApi = <T = any>() => {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const BASE_URL = process.env.NEXT_PUBLIC_API_URL

  const makeRequest = async ({
    url,
    method,
    headers,
    params,
    data,
    onUploadProgress
  }: Config) => {
    setError(null)
    setIsSuccess(false)
    setLoading(true)
    let success = false

    try {
      const response = await instance({
        url: `${BASE_URL}${url}`,
        method,
        headers,
        params,
        data,
        onUploadProgress
      })
      setData(response.data)
      setIsSuccess(true)
      success = true
    } catch (err: any) {
      console.error(err)
      setIsSuccess(false)
      if (
        err &&
        err.response &&
        err.response.data &&
        err.response.data.message
      ) {
        setError(err.response.data.message)
      } else {
        setError(err?.message || 'An error occurred')
      }
    } finally {
      setLoading(false)
    }

    return success
  }

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
