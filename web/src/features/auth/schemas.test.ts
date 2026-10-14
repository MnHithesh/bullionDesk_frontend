import { loginSchema, registerSchema } from './schemas'

const valid = {
  displayName: 'Asha',
  email: 'trader@example.com',
  password: 'Gold#2026',
  confirmPassword: 'Gold#2026',
}

function passwordError(password: string) {
  const result = registerSchema.safeParse({ ...valid, password, confirmPassword: password })
  return result.success ? null : result.error.issues.find((i) => i.path[0] === 'password')?.message
}

describe('registerSchema', () => {
  it('accepts a password that meets every rule', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    ['Gd#1abc', 'at least 8 characters'],
    ['gold#2026', 'an uppercase letter'],
    ['GOLD#2026', 'a lowercase letter'],
    ['Gold#gold', 'a digit'],
    ['Gold2026x', 'a symbol'],
  ])('rejects %s: needs %s', (password, rule) => {
    expect(passwordError(password)).toBe(`Password needs: ${rule}`)
  })

  it.each([
    ['A', 'Display name must be at least 2 characters'],
    ['  A  ', 'Display name must be at least 2 characters'],
    ['x'.repeat(51), 'Display name must be at most 50 characters'],
  ])('rejects display name %j', (displayName, message) => {
    const result = registerSchema.safeParse({ ...valid, displayName })
    expect(result.error?.issues[0]).toMatchObject({ path: ['displayName'], message })
  })

  it('requires the confirmation to match', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'Gold#2027' })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]).toMatchObject({
      path: ['confirmPassword'],
      message: 'Passwords do not match',
    })
  })
})

describe('loginSchema', () => {
  it('trims and checks the email', () => {
    expect(
      loginSchema.safeParse({ email: '  trader@example.com ', password: 'x' }).data?.email,
    ).toBe('trader@example.com')
    expect(loginSchema.safeParse({ email: 'not-an-email', password: 'x' }).success).toBe(false)
  })
})
