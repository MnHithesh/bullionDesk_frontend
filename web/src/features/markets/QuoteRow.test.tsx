import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { instrumentJson, quoteJson } from '@/test/fixtures'
import { toInstrument, toQuote, type Quote } from './api'
import { QuoteRow } from './QuoteRow'

const instrument = toInstrument(instrumentJson('GOLD26DECFUT', 'GOLD', '2026-12-05'))

function renderRow(quote: Quote | undefined) {
  const element = (q: Quote | undefined) => (
    <table>
      <tbody>
        <QuoteRow instrument={instrument} quote={q} />
      </tbody>
    </table>
  )
  const router = createMemoryRouter(
    [
      { path: '/markets', element: element(quote) },
      { path: '/markets/:symbol', element: <p>detail page</p> },
    ],
    { initialEntries: ['/markets'] },
  )
  const view = render(<RouterProvider router={router} />)
  const cells = () => within(screen.getByRole('row')).getAllByRole('cell')
  return { ...view, router, cells }
}

describe('QuoteRow', () => {
  it('formats the price in Indian grouping and shows the contract and expiry', () => {
    const { cells } = renderRow(toQuote(quoteJson('GOLD26DECFUT', 136194, 29, 0.02)))

    expect(screen.getByRole('link', { name: 'GOLD26DECFUT' })).toHaveAttribute(
      'href',
      '/markets/GOLD26DECFUT',
    )
    expect(screen.getByText('FUT · 05 Dec 2026')).toBeInTheDocument()
    const [last, change, percent, high, low] = cells()
    expect(last).toHaveTextContent('1,36,194.00')
    expect(change).toHaveTextContent('+29.00')
    expect(percent).toHaveTextContent('+0.02%')
    expect(high).toHaveTextContent('1,36,204.00')
    expect(low).toHaveTextContent('1,36,174.00')
  })

  it('marks a rise with green, an up arrow and a plus sign', () => {
    const { cells } = renderRow(toQuote(quoteJson('GOLD26DECFUT', 136194, 29, 0.02)))
    const change = cells()[2].firstElementChild!

    expect(change).toHaveAttribute('data-direction', 'up')
    expect(change).toHaveClass('text-up')
    expect(change).toHaveTextContent('▲ up +0.02%')
  })

  it('marks a fall with red, a down arrow and a minus sign', () => {
    const { cells } = renderRow(toQuote(quoteJson('GOLD26DECFUT', 135020, -1174.5, -0.86)))
    const change = cells()[2].firstElementChild!

    expect(change).toHaveAttribute('data-direction', 'down')
    expect(change).toHaveClass('text-down')
    expect(change).toHaveTextContent('▼ down -0.86%')
    expect(cells()[1]).toHaveTextContent('-1,174.50')
  })

  it('shows no arrow when unchanged', () => {
    const { cells } = renderRow(toQuote(quoteJson('GOLD26DECFUT', 136194, 0, 0)))
    const change = cells()[2].firstElementChild!

    expect(change).toHaveAttribute('data-direction', 'flat')
    expect(change).toHaveClass('text-muted')
    expect(change).not.toHaveTextContent(/[▲▼]/)
  })

  it('shows dashes while there is no quote yet', () => {
    const { cells } = renderRow(undefined)

    for (const cell of cells()) expect(cell).toHaveTextContent('—')
  })

  it('opens the detail view when the row is clicked', async () => {
    const { router } = renderRow(toQuote(quoteJson('GOLD26DECFUT', 136194, 29, 0.02)))

    await userEvent.click(screen.getAllByRole('cell')[0])

    expect(router.state.location.pathname).toBe('/markets/GOLD26DECFUT')
  })
})
