import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { errorMessage, isApiError } from '@/api/errors'

/**
 * Puts ValidationProblemDetails field errors on the matching form fields.
 * The backend's keys may be PascalCase ("Password") or JSON paths ("$.password"), so matching ignores
 * case and a leading "$.". Returns the messages that matched no field, to show at form level.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string[] {
  if (!isApiError(error) || !error.hasFieldErrors) return []

  const unmatched: string[] = []
  for (const [key, messages] of Object.entries(error.fieldErrors)) {
    const normalised = key.replace(/^\$\./, '').toLowerCase()
    const field = fields.find((name) => name.toLowerCase() === normalised)
    if (field) setError(field, { type: 'server', message: messages.join(' ') })
    else unmatched.push(...messages)
  }
  return unmatched
}

/**
 * Handles a failed submit: field errors go onto their fields; anything else comes back as one
 * form-level message (null when every error was shown on a field).
 */
export function submitErrorMessage<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  const unmatched = applyServerErrors(error, setError, fields)
  if (unmatched.length) return unmatched.join(' ')
  if (isApiError(error) && error.hasFieldErrors) return null
  return errorMessage(error)
}
