import { z } from 'zod'

// Mirrors the backend's password policy, so most mistakes are caught before a request is sent.
// The backend still validates; its ValidationProblemDetails errors are shown on the same fields.
export const passwordRules = [
  { test: /.{8,}/, message: 'At least 8 characters' },
  { test: /[A-Z]/, message: 'An uppercase letter' },
  { test: /[a-z]/, message: 'A lowercase letter' },
  { test: /\d/, message: 'A digit' },
  { test: /[^A-Za-z0-9]/, message: 'A symbol' },
] as const

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email')
  .pipe(z.email('Enter a valid email address'))

const password = passwordRules.reduce(
  (schema, rule) => schema.regex(rule.test, `Password needs: ${rule.message.toLowerCase()}`),
  z.string(),
)

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
})

export const registerSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(2, 'Display name must be at least 2 characters')
      .max(50, 'Display name must be at most 50 characters'),
    email,
    password,
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

export type LoginValues = z.infer<typeof loginSchema>
export type RegisterValues = z.infer<typeof registerSchema>
