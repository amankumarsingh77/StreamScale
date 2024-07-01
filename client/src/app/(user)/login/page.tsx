'use client'

import React, { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import Image from 'next/image'
import Typography from '@/components/ui/typography'
import { SignInItemLists } from '@/constants/authitems'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { instance } from '@/api/apiInstance'

interface ApiResponse {
  message: string
  status: number
}

const FormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: 'Username must be at least 2 characters.'
    })
    .max(18, {
      message: 'Username must be at most 18 characters.'
    }),
  password: z
    .string()
    .min(8, {
      message: 'Password must be at least 8 characters.'
    })
    .trim()
})

export default function Page() {
  const router = useRouter()
  const { setUser, user } = useAuth()
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  })

  const onSubmit = async (
    formData: z.infer<typeof FormSchema>
  ) => {
    setLoading(true)
    try {
      const response = await instance.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/login`,
        formData
      )
      if (response.status === 200) {
        setUser(response.data)
        router.push('/dashboard')
      } else {
        setError(response.data.message)
      }
    } catch (error: any) {
      if (error.response) {
        setError(error.response.data.message)
      } else if (error.request) {
        setError('No response received from server')
      } else {
        setError('An error occurred: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="flex flex-col h-full md:py-52 md:px-32 pt-11 pb-24 px-8
        w-full items-center gap-12"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full md:w-1/3"
        >
          {SignInItemLists.map((item, index) => (
            <FormField
              key={index}
              control={form.control}
              name={item.name}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{item.name}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={item.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <Button
            className="text-black w-full"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
          {error && (
            <div className="text-red-500 text-center mt-2">
              {error}
            </div>
          )}
          <Typography className="text-center">
            or
          </Typography>
          <Button
            className="w-full flex justify-center items-center gap-2 py-3 px-4
              text-gray-900"
            type="button"
          >
            <Image
              src="/google.svg"
              alt="Google"
              width={20}
              height={20}
            />
            Continue with Google
          </Button>
        </form>
      </Form>
    </div>
  )
}
