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
import { SignUpItemLists } from '@/constants/authitems'
import { Textarea } from '@/components/ui/textarea'
import { useRouter } from 'next/navigation'
import { instance } from '@/api/apiInstance'
import { useAuth } from '@/context/AuthContext'
import {
  Alert,
  AlertDescription
} from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'
import PasswordStrengthIndicator from '@/components/ui/password-strength-indicator'

const FormSchema = z.object({
  username: z
    .string()
    .min(2, {
      message: 'Username must be at least 2 characters.'
    })
    .max(18, {
      message: 'Username must be at most 18 characters.'
    })
    .regex(/^[a-zA-Z0-9_]+$/, {
      message:
        'Username can only contain letters, numbers, and underscores.'
    }),
  email: z
    .string()
    .email({ message: 'Invalid email address.' }),
  password: z
    .string()
    .min(8, {
      message: 'Password must be at least 8 characters.'
    })
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
      {
        message:
          'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.'
      }
    ),
  message: z
    .string()
    .min(10, {
      message: 'Message must be at least 10 characters.'
    })
    .max(500, {
      message: 'Message must be at most 500 characters.'
    }),
  fullname: z
    .string()
    .min(2, {
      message: 'Full name must be at least 2 characters.'
    })
    .max(50, {
      message: 'Full name must be at most 50 characters.'
    })
})

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: '',
      email: '',
      password: '',
      message: '',
      fullname: ''
    }
  })
  const { user } = useAuth()

  useEffect(() => {
    if (user) {
      router.push('/dashboard')
    }
  }, [user, router])

  const onSubmit = async (
    data: z.infer<typeof FormSchema>
  ) => {
    setLoading(true)
    setError('')
    try {
      const response = await instance.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/user/signup`,
        data
      )
      if (response.status === 200) {
        router.push('/login')
      } else {
        setError(
          response.data.message ||
            'An error occurred during signup.'
        )
      }
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'An error occurred during signup.'
      )
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
              Sign Up
            </Typography>
            {SignUpItemLists.map((item, index) => (
              <FormField
                key={index}
                control={form.control}
                name={
                  item.name as keyof z.infer<
                    typeof FormSchema
                  >
                }
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {item.name.charAt(0).toUpperCase() +
                        item.name.slice(1)}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={item.type}
                        placeholder={item.placeholder}
                        {...field}
                      />
                    </FormControl>
                    {item.name === 'password' && (
                      <PasswordStrengthIndicator
                        password={field.value}
                      />
                    )}
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
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Why do you want to use this application?"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                  <Typography className="text-gray-500 text-sm mt-1">
                    ● Transcoding is an expensive job, so we
                    need to know why you want to use this
                    application.
                  </Typography>
                </FormItem>
              )}
            />
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button
              className="w-full text-black"
              type="submit"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Signup'
              )}
            </Button>
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
