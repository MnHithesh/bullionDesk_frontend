import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Alert } from '@/components/Alert'
import { Button } from '@/components/Button'
import { TextField } from '@/components/TextField'
import { submitErrorMessage } from '@/lib/forms'
import { register as registerAccount } from './api'
import { AuthLayout } from './AuthLayout'
import { registerSchema, type RegisterValues } from './schemas'

const passwordHint =
  'At least 8 characters, with an uppercase letter, a lowercase letter, a digit and a symbol.'

export function RegisterPage() {
  const [formError, setFormError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerSchema) })
  const registerMutation = useMutation({ mutationFn: registerAccount })

  const onSubmit = handleSubmit(async ({ displayName, email, password }) => {
    setFormError(null)
    try {
      await registerMutation.mutateAsync({ displayName, email, password })
    } catch (error) {
      setFormError(submitErrorMessage(error, setError, ['displayName', 'email', 'password']))
    }
  })

  return (
    <AuthLayout title="Create your account">
      <p className="-mt-3 mb-5 text-sm text-muted">
        Paper trading with virtual money. No real funds involved.
      </p>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert>{formError}</Alert>}
        <TextField
          label="Display name"
          autoComplete="nickname"
          error={errors.displayName?.message}
          {...register('displayName')}
        />
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
          autoComplete="new-password"
          hint={passwordHint}
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" loading={registerMutation.isPending} className="w-full">
          Create account
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  )
}
