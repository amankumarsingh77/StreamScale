'use client'

import React, { useEffect } from 'react'
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
import { SignUpItemLists } from '@/constants/authitems'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { instance } from '@/api/apiInstance'
import { useAuth } from '@/context/AuthContext'

const FormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: 'Username must be at least 2 characters.'
    })
    .max(18, {
      message: 'Username must be at most 18 characters.'
    }),
  email: z.string().email({
    message: 'Invalid email address.'
  }),
  password: z
    .string()
    .min(8, {
      message: 'Password must be at least 8 characters.'
    })
    .trim(),
  message: z
    .string()
    .min(10, {
      message: 'Message must be at least 10 characters.'
    })
    .max(100, {
      message: 'Message must be at most 100 characters.'
    })
})

export default function Page() {
  const router = useRouter()
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      message: ''
    }
  })
  const { user } = useAuth()
  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user])

  const onSubmit = async (
    data: z.infer<typeof FormSchema>
  ) => {
    setLoading(true)
    const response = await instance.post(
      `${process.env.NEXT_PUBLIC_API_URL}/api/user/register`,
      data
    )
    setLoading(false)
    if (response.status === 200) {
      router.push('/login')
    } else {
      setError(response.data.message)
    }
  }

  return (
    <div
      className="flex flex-col h-full md:py-36 md:px-32 pt-11 pb-24 px-8
        w-full items-center gap-12"
    >
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-2 w-full md:w-1/3"
        >
          {SignUpItemLists.map((item, index) => (
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
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="message-2">
                  Message
                </FormLabel>
                <FormControl>
                  <Textarea
                    className="gap-2"
                    placeholder="Why do you want to use this application?"
                    {...field}
                    id="message"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {error && (
            <FormMessage typeof="error">
              {error}
            </FormMessage>
          )}
          <Button
            className="text-black w-full"
            type="submit"
            disabled={loading}
          >
            Submit
          </Button>
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
