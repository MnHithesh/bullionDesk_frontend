/**
 * Sets the browser tab title. React 19 hoists a <title> rendered anywhere into <head>, and
 * restores the previous one when the page unmounts, so no effect or title service is needed.
 */
export function PageTitle({ title }: { title: string }) {
  return <title>{`${title} · BullionDesk`}</title>
}
