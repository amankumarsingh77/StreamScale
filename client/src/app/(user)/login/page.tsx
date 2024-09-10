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
    <div className="flex items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <Typography
              variant="h2"
              className="text-center mb-6"
            >
              Log In
            </Typography>
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
                        type={
                          item.name === 'password'
                            ? 'password'
                            : 'text'
                        }
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
              {loading ? 'Submitting...' : 'Login'}
            </Button>
            {error && (
              <div className="text-red-500 text-center mt-2">
                {error}
              </div>
            )}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>
            <Button
              className="w-full flex justify-center items-center gap-2"
              type="button"
              variant="outline"
              disabled={true}
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
    </div>
  )
}
  