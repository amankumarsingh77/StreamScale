// context/AuthContext.tsx
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

interface AuthContextType {
  user: object | null
  loading: boolean
  setUser: (user: object | null) => void
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
  const [user, setUser] = useState<object | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await fetchUser()
        setUser(data)
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

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === null) {
    throw new Error(
      'useAuth must be used within an AuthProvider'
    )
  }
  return context
}
