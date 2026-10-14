import { useId, type ComponentProps } from 'react'

type TextFieldProps = ComponentProps<'input'> & {
  label: string
  error?: string
  hint?: string
}

/**
 * Labelled input with hint and error text wired up for screen readers.
 * In React 19 `ref` is an ordinary prop, so react-hook-form's register() can be spread straight in
 * (no forwardRef needed).
 */
export function TextField({ label, error, hint, id, className = '', ...props }: TextFieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const errorId = error ? `${inputId}-error` : undefined

  return (
    <div className={className}>
      <label htmlFor={inputId} className="block text-sm font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={[errorId, hintId].filter(Boolean).join(' ') || undefined}
        className="mt-1 block w-full rounded-md border border-border bg-surface px-3 py-2 text-text placeholder:text-muted aria-invalid:border-down"
        {...props}
      />
      {error && (
        <p id={errorId} className="mt-1 text-sm text-down">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-muted">
          {hint}
        </p>
      )}
    </div>
  )
}
