'use client'
import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/lib/utils'
import {
  Home,
  FileVideo,
  Settings,
  LogOut,
  BarChart,
  HelpCircle,
  CreditCard,
  UploadCloud
} from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Avatar,
  AvatarFallback,
  AvatarImage
} from '../ui/avatar'

const navItems = [
  { icon: Home, label: 'Dashboard', href: '/dashboard' },
  { icon: UploadCloud, label: 'Upload', href: '/upload' },
  { icon: FileVideo, label: 'Videos', href: '/videos' },
  {
    icon: BarChart,
    label: 'Analytics',
    href: '/analytics'
  },
  { icon: Settings, label: 'Settings', href: '/settings' }
]

const NavBar: React.FC = () => {
  const router = useRouter()
  const { user, logout } = useAuth()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <TooltipProvider>
      <nav className="md:min-w-[200px] h-full text-white bg-background md:border-r">
        <div
          className="flex flex-col justify-between sticky top-0
            h-[calc(100dvh-48px)]"
        >
          <div>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Link href="/profile">
                  <div
                    className="flex items-center gap-4 px-4 py-2 mt-4 mb-6 bg-blue-950
                      hover:bg-[#24253a] transition-colors duration-200"
                  >
                    <Avatar className="size-7 border-2 border-green-500 shadow-md">
                      <AvatarImage
                        src="/avatar.png"
                        alt="user"
                      />
                      <AvatarFallback>A</AvatarFallback>
                    </Avatar>
                    <span className="text-lg font-semibold">
                      Aman
                    </span>
                  </div>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Profile</p>
              </TooltipContent>
            </Tooltip>

            <div className="flex-grow overflow-y-auto">
              {navItems.map((item, index) => (
                <Tooltip key={index} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        'flex items-center py-2 px-4 mb-2',
                        'hover:bg-[#24253a] transition-colors duration-200'
                      )}
                    >
                      <item.icon size={20} />

                      <span className="ml-3">
                        {item.label}
                      </span>
                    </Link>
                  </TooltipTrigger>

                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </div>

          <div className="mt-auto p-4">
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

            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleLogout}
                  variant="outline"
                  className={cn(
                    `w-full flex items-center justify-center text-white
                      hover:bg-[#24253a]`
                  )}
                >
                  <LogOut size={20} />

                  <span className="ml-2">Logout</span>
                </Button>
              </TooltipTrigger>

              <TooltipContent side="right">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </nav>
    </TooltipProvider>
  )
}

export default NavBar
