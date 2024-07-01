'use client'
import { useRouter } from 'next/navigation'
import { useEffect, ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

interface ProtectedRouteProps {
  children: ReactNode
}

const ProtectedRoute = ({
  children
}: ProtectedRouteProps) => {
  const auth = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (auth && !auth.loading && !auth.user) {
      router.push('/login')
    }
  }, [auth, router])

  if (!auth || auth.loading) {
    return <div>Loading...</div>
  }

  return auth.user ? <>{children}</> : null
}

export default ProtectedRoute
