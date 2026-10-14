import { EmptyState } from '@/components/QueryStates'

/** Placeholder for navigation targets that later steps build. */
export function ComingSoonPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <EmptyState title="Coming soon">This page is built in a later step.</EmptyState>
    </div>
  )
}
