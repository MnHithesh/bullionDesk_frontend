import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { submitErrorMessage } from '@/lib/forms'
import { login } from './api'
import { AuthLayout } from './AuthLayout'
import { loginSchema, type LoginValues } from './schemas'

export function LoginPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })
  const loginMutation = useMutation({ mutationFn: login })

  // On success there's nothing to do here: the new session makes PublicOnly redirect.
  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await loginMutation.mutateAsync(values)
    } catch (error) {
      setFormError(submitErrorMessage(error, setError, ['email', 'password']))
    }
  })

  return (
    <AuthLayout title="Sign in">
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <Button type="submit" loading={loginMutation.isPending} className="w-full">
          Sign in
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        New to BullionDesk?{' '}
        <Link to="/register" className="font-medium text-accent underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </AuthLayout>
  )
}
