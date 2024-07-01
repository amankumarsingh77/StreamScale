'use client'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import React from 'react'
import { Avatar, AvatarImage } from '../ui/avatar'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export default function AvatarDropdown() {
  const { logout } = useAuth()
  const router = useRouter()
  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }
  const profileHandler = () => {
    router.push('/profile')
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        asChild
        className="cursor-pointer"
      >
        <Avatar>
          <AvatarImage src="/avatar.png" alt="user" />
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={profileHandler}
            className="cursor-pointer"
          >
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={handleLogout}
          >
            Logout
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
