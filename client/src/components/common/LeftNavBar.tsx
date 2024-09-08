'use client'
import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import {
  Home,
  FileVideo,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart,
  Search,
  PlusCircle,
  HelpCircle,
  CreditCard,
  UploadCloud
} from 'lucide-react'
import Typography from '@/components/ui/typography'
import { Input } from '@/components/ui/input'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import Image from 'next/image'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: FileVideo, label: 'Videos', href: '/videos' },
  {
    icon: BarChart,
    label: 'Analytics',
    href: '/analytics'
  },
  { icon: UploadCloud, label: 'Upload', href: '/upload' },
  { icon: Settings, label: 'Settings', href: '/settings' }
]

const LeftNavBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
      setIsExpanded(window.innerWidth >= 1024)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () =>
      window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  const toggleSidebar = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <TooltipProvider>
      <nav
        className={cn(
          `fixed left-0 top-0 bottom-0 z-40 flex flex-col text-white
            bg-background border`,
          'transition-all duration-300 ease-in-out',
          isExpanded ? 'w-64' : 'w-16',
          isMobile && !isExpanded && 'w-0'
        )}
      >
        <div className="flex items-center justify-between p-4">
          {isExpanded && (
            <div className="flex items-center">
              <Image
                src="/logo.svg"
                alt="StreamScale Logo"
                className="w-8 h-8 mr-2"
              />
              <Typography
                variant="h4"
                className="font-bold text-white"
              >
                StreamScale
              </Typography>
            </div>
          )}
          {/* {!isMobile && (
            <Button
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="ml-auto text-white hover:bg-[#24253a]"
            >
              {isExpanded ? (
                <X size={24} />
              ) : (
                <Menu size={24} />
              )}
            </Button>
          )} */}
        </div>

        {isExpanded && (
          <div className="px-4 mb-4">
            <div className="relative">
              <Search
                className="absolute left-2 top-1/2 transform -translate-y-1/2
                  text-gray-400"
                size={16}
              />
              <Input
                placeholder="Search"
                className="bg-background border text-white pl-8"
              />
            </div>
          </div>
        )}

        <div className="flex-grow overflow-y-auto">
          {navItems.map((item, index) => (
            <Tooltip key={index} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center py-2 px-4 mb-2',
                    'hover:bg-[#24253a] transition-colors duration-200',
                    isExpanded
                      ? 'justify-start'
                      : 'justify-center'
                  )}
                >
                  <item.icon size={20} />
                  {isExpanded && (
                    <span className="ml-3">
                      {item.label}
                    </span>
                  )}
                </Link>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right">
                  <p>{item.label}</p>
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        <div className="mt-auto p-4">
          {isExpanded && (
            <>
              <Button
                variant="outline"
                className="w-full justify-start text-white hover:bg-[#24253a] py-2 px-4
                  mb-2"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Billing
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-white hover:bg-[#24253a] py-2 px-4
                  mb-2"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Help & Support
              </Button>
            </>
          )}
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleLogout}
                variant="outline"
                className={cn(
                  `w-full flex items-center justify-center text-white
                    hover:bg-[#24253a]`,
                  isExpanded ? 'px-4' : 'px-0'
                )}
              >
                <LogOut size={20} />
                {isExpanded && (
                  <span className="ml-2">Logout</span>
                )}
              </Button>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </nav>
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden text-white bg-[#1a1b26]
            hover:bg-[#24253a]"
        >
          {isExpanded ? (
            <X size={24} />
          ) : (
            <Menu size={24} />
          )}
        </Button>
      )}
    </TooltipProvider>
  )
}

export default LeftNavBar
