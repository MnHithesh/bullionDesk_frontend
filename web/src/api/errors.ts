/**
 * The backend returns RFC 7807 ProblemDetails for every error (ValidationProblemDetails for 400s
 * with field errors). ApiError wraps that so the UI can rely on one error type.
 */

export interface ProblemDetails {
  type?: string | null
  title?: string | null
  status?: number | null
  detail?: string | null
  instance?: string | null
  /** Field name → messages, present on ValidationProblemDetails. */
  errors?: Record<string, string[]>
  /** Set by the gateway so a failure can be found in the backend logs. */
  correlationId?: string
  traceId?: string
  [key: string]: unknown
}

export class ApiError extends Error {
  readonly status: number
  readonly title: string
  readonly detail?: string
  readonly fieldErrors: Record<string, string[]>
  readonly correlationId?: string
  readonly problem?: ProblemDetails

  constructor(status: number, problem?: ProblemDetails) {
    const title = problem?.title ?? defaultTitle(status)
    super(problem?.detail ?? title)
    this.name = 'ApiError'
    this.status = status
    this.title = title
    this.detail = problem?.detail ?? undefined
    this.fieldErrors = problem?.errors ?? {}
    this.correlationId = problem?.correlationId ?? problem?.traceId ?? undefined
    this.problem = problem
  }

  get hasFieldErrors() {
    return Object.keys(this.fieldErrors).length > 0
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/** Builds an ApiError from a failed response and whatever body openapi-fetch parsed. */
export function toApiError(response: Response, body: unknown): ApiError {
  const problem = isProblem(body) ? body : undefined
  return new ApiError(response.status, problem)
}

/** Turns any thrown value into a message fit for the user. */
export function errorMessage(error: unknown): string {
  if (isApiError(error)) return error.detail ?? error.title
  if (error instanceof TypeError)
    return 'Could not reach the server. Check your connection and try again.'
  return 'Something went wrong. Please try again.'
}

function isProblem(body: unknown): body is ProblemDetails {
  return (
    typeof body === 'object' &&
    body !== null &&
    ('title' in body || 'status' in body || 'errors' in body)
  )
}

function defaultTitle(status: number): string {
  if (status === 401) return 'You need to sign in again.'
  if (status === 403) return 'You do not have access to this.'
  if (status === 404) return 'Not found.'
  if (status >= 500) return 'The server had a problem. Please try again.'
  return 'Request failed.'
}
