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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: UploadCloud, label: 'Upload', href: '/upload' },
  {
    icon: FileVideo,
    label: 'Videos',
    href: '/videos',
    badge: '3'
  },
  {
    icon: BarChart,
    label: 'Analytics',
    href: '/analytics'
  },
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
            bg-background border-r`,
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
                width={2}
                height={2}
                className="w-8 h-8 mr-2"
              />
              <Link
                href={'/dashboard'}
                className="font-bold text-white "
              >
                StreamScale
              </Link>
            </div>
          )}
        </div>

        <div className="flex-grow overflow-y-auto">
          {navItems.map((item, index) => (
            <Tooltip key={index} delayDuration={300}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center py-3 px-4 mb-2 rounded-lg mx-2',
                    'hover:bg-primary/20 transition-colors duration-200',
                    isExpanded
                      ? 'justify-start'
                      : 'justify-center'
                  )}
                >
                  <item.icon
                    size={20}
                    className="text-primary"
                  />
                  {isExpanded && (
                    <span className="ml-3 font-medium flex-grow">
                      {item.label}
                    </span>
                  )}
                  {isExpanded && item.badge && (
                    <Badge
                      variant="secondary"
                      className="ml-auto"
                    >
                      {item.badge}
                    </Badge>
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

        {isExpanded && (
          <div className="px-4 py-2">
            <Typography className="text-muted-foreground mb-2">
              Storage Used
            </Typography>
            <Progress
              indicatorColor="bg-white"
              value={33}
              className="h-2"
            />
            <Typography className="text-muted-foreground mt-1">
              33% of 100GB
            </Typography>
          </div>
        )}

        <div className="mt-auto p-4 border-t border-gray-700">
          {isExpanded && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full flex items-center justify-start p-2"
                  >
                    <Avatar className="w-8 h-8 mr-2">
                      <AvatarImage
                        src={user?.picture || undefined}
                        alt={
                          user?.fullname || 'User avatar'
                        }
                      />
                      <AvatarFallback>
                        {user?.fullname?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-grow text-left">
                      {user?.fullname || 'User'}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel>
                    My Account
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <CreditCard className="mr-2 h-4 w-4" />
                    <span>Billing</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {!isExpanded && (
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-full flex items-center justify-center p-0"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarImage
                      src={user?.picture || undefined}
                      alt={user?.fullname || 'User avatar'}
                    />
                    <AvatarFallback>
                      {user?.fullname?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>User Menu</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {isExpanded && (
          <div className="p-4">
            <Button variant="outline" className="w-full">
              <HelpCircle className="mr-2 h-4 w-4" />
              Help Center
            </Button>
          </div>
        )}
      </nav>
      {isMobile && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSidebar}
          className="fixed top-4 left-4 z-50 lg:hidden text-white
            bg-background/80 hover:bg-[#24253a] backdrop-blur-sm"
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
