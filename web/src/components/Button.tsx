import type { ComponentProps } from 'react'
import { Spinner } from './Spinner'

type Variant = 'primary' | 'secondary'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-contrast hover:brightness-110',
  secondary: 'border border-border bg-surface text-text hover:bg-bg',
}

type ButtonProps = ComponentProps<'button'> & { variant?: Variant; loading?: boolean }

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  )
}
