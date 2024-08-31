'use client'
import {
  createContext,
  useState,
  useEffect,
  useContext,
  ReactNode,
  FunctionComponent
} from 'react'
import {
  fetchUser,
  logout as apiLogout
} from '../services/authService'

export type User = {
  id: string
  username: string
  email: string
  fullname: string
  picture: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: (user: User | null) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(
  null
)

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: FunctionComponent<
  AuthProviderProps
> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchUser()
        setUser(data.data as User)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const logout = async () => {
    try {
      await apiLogout()
      setUser(null)
    } catch (error) {
      console.error('Failed to logout')
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, setUser, logout }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }
  return context
}
