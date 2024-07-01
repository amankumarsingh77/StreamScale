import { instance } from '@/api/apiInstance'
interface FormData {
  username: string
  password: string
}

export const login = async (formdata: FormData) => {
  try {
    const response = await instance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/login`,
      {
        username: formdata.username,
        password: formdata.password
      }
    )
    return response.data
  } catch (error) {
    throw new Error('Failed to login')
  }
}

export const logout = async () => {
  try {
    const response = await instance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/logout`
    )
    return response.data
  } catch (error) {
    throw new Error('Failed to logout')
  }
}

export const fetchUser = async () => {
  try {
    const response = await instance.get(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/me`
    )
    return response.data
  } catch (error) {
    throw new Error('Failed to fetch profile')
  }
}
