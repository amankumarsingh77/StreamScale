'use client'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { usePathname } from 'next/navigation'
import Typography from '@/components/ui/typography'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTrigger
} from '@/components/ui/drawer'
import { MenuIcon, X } from 'lucide-react'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import AvatarDropdown from './avatar-dropdown'
import { useAuth } from '@/context/AuthContext'
import NavBar from './navbar'

interface SidebarProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export function Header({ className }: SidebarProps) {
  const [isLogged, setIsLogged] = useState<boolean>(false)
  const auth = useAuth()

  useEffect(() => {
    setIsLogged(!!auth.user)
  }, [auth.user])

  const pathname = usePathname()

  const items = [
    {
      href: 'https://x.com/amankumar404',
      title: 'Get in touch',
      openInNewTab: true
    }
  ]

  const getLogo = () => (
    <Link href="/" className="pointer flex items-center">
      <Image
        src="/logo.svg"
        className="mr-3"
        alt="logo"
        width={20}
        height={20}
      />
      <Typography className="!text-white !text-base font-medium">
        StreamScale
      </Typography>
    </Link>
  )

  const getAuthButtons = () => (
    <div className="flex gap-3 items-center">
      <Link href="/login">
        <Typography variant="p">Login</Typography>
      </Link>
      <Link href="/signup">
        <Button size="tiny" color="ghost">
          <Typography variant="p" className="text-black">
            Sign Up
          </Typography>
        </Button>
      </Link>
    </div>
  )

  const getHeaderItems = () => (
    <>
      {items.map((item) => {
        const selected =
          pathname === item.href ||
          pathname.includes(item.href)
        return (
          <Link
            href={item.href}
            className="pointer block w-fit "
            target={item.openInNewTab ? '_blank' : ''}
            key={item.title}
          >
            <Typography
              variant="p"
              className={cn(selected && 'text-primary')}
            >
              {item.title}
            </Typography>
          </Link>
        )
      })}
    </>
  )

  return (
    <div
      className={cn(
        `flex md:h-12 h-14 items-center justify-center w-full
          border-b`,
        className
      )}
    >
      <div className="w-full max-w-[90rem] px-4">
        {/* Desktop */}
        <div className="flex items-center gap-x-8 w-full">
          <div className="md:flex-0 min-w-fit flex-1">
            {getLogo()}
          </div>
          <div className="hidden md:flex items-center w-full">
            <div className="flex items-center gap-x-8 flex-1">
              {!isLogged && getHeaderItems()}
            </div>
            {isLogged ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button size="tiny" color="ghost">
                    <Typography
                      variant="p"
                      className="text-black"
                    >
                      Get in touch
                    </Typography>
                  </Button>
                </Link>
                {/* <AvatarDropdown /> */}
              </div>
            ) : (
              getAuthButtons()
            )}
          </div>
          {/* Mobile */}
          <div className="md:hidden flex gap-x-4 items-center">
            {isLogged ? (
              <div className="flex items-center gap-4">
                <Link href="/dashboard">
                  <Button size="tiny" color="ghost">
                    <Typography
                      variant="p"
                      className="text-black"
                    >
                      Dashboard
                    </Typography>
                  </Button>
                </Link>
                {/* <AvatarDropdown /> */}
              </div>
            ) : (
              getAuthButtons()
            )}
            <Drawer direction="right">
              <DrawerTrigger asChild>
                <MenuIcon />
              </DrawerTrigger>
              <DrawerContent
                className="h-screen top-0 right-0 left-auto mt-0 w-64 rounded-none
                  border-l outline-none md:hidden"
              >
                <DrawerHeader className="p-0">
                  <DrawerClose
                    asChild
                    className="cursor-pointer"
                  >
                    <div className="w-full flex items-end justify-end pt-3 pr-3">
                      <X />
                    </div>
                  </DrawerClose>
                </DrawerHeader>
                <NavBar />
              </DrawerContent>
            </Drawer>
          </div>
        </div>
      </div>
    </div>
  )
}
