'use client'
import React, { useState } from 'react'
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
  ChevronRight,
  BarChart
} from 'lucide-react'
import Typography from '@/components/ui/typography'
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: FileVideo, label: 'Videos', href: '/videos' },
  {
    icon: BarChart,
    label: 'Analytics',
    href: '/analytics'
  },
  { icon: User, label: 'Profile', href: '/profile' },
  { icon: Settings, label: 'Settings', href: '/settings' }
]

const LeftNavBar: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false)
  const router = useRouter()
  const { user, logout } = useAuth()
  console.log(user)

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
          `fixed left-0 top-0 bottom-0 z-40 flex flex-col bg-background
            border-r border-border`,
          'transition-all duration-300 ease-in-out pt-16',
          isExpanded ? 'w-64' : 'w-16'
        )}
      >
        <div className="flex items-center justify-between p-4">
          {isExpanded && (
            <div className="flex items-center">
              <img
                src="/logo.svg"
                alt="StreamScale Logo"
                className="w-8 h-8 mr-2"
              />
              <Typography
                variant="h4"
                className="font-bold"
              >
                StreamScale
              </Typography>
            </div>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={toggleSidebar}
            className={cn('ml-auto', {
              'rotate-180': isExpanded
            })}
          >
            <ChevronRight size={24} />
          </Button>
        </div>

        {isExpanded && user && (
          <div className=" flex items-center">
            <div>
              <Typography
                variant="p"
                className="font-semibold"
              >
                {user.username}
              </Typography>
              <Typography
                variant="h3"
                className="text-muted-foreground"
              >
                {user.email}
              </Typography>
            </div>
          </div>
        )}

        <div className="flex-grow p-3">
          {navItems.map((item, index) => (
            <Tooltip key={index} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center py-2 px-3 mb-2 rounded-md',
                    `hover:bg-accent hover:text-accent-foreground
                      transition-colors duration-200`,
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

        <div className="p-4 mt-auto">
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                onClick={handleLogout}
                variant="outline"
                className={cn(
                  'w-full flex items-center justify-center text-white',
                  'hover:bg-destructive/10 hover:text-destructive',
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
    </TooltipProvider>
  )
}

export default LeftNavBar
