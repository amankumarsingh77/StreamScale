import React from 'react'
import ProtectedRoute from '@/components/ProtectedRoute'
import NavBar from '@/components/common/navbar'

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children
}) => {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-background">
        {/* <div className=" fixed left-0 top-0 bottom-0">
          <LeftNavBar />
        </div> */}

        {/* <LeftNavBar /> */}
        <div className="hidden md:block">
          <NavBar />
        </div>
        <div className="max-w-7xl mx-auto p-4 sm:px-6 lg:px-8 lg:pr-0">
          {children}
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default DashboardLayout
