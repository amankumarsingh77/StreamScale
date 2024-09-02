import React from 'react'
import LeftNavBar from '@/components/common/LeftNavBar'
import ProtectedRoute from '@/components/ProtectedRoute'

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
        <div className="flex-1 ">
          <LeftNavBar />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}

export default DashboardLayout
