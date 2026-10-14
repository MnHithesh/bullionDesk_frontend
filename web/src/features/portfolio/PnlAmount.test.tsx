import { render, screen, within } from '@testing-library/react'
import { pnlJson } from '@/test/fixtures'
import { toPnlSummary } from './api'
import { PnlAmount } from './PnlAmount'
import { PnlSummaryCards } from './PnlPage'

describe('PnlAmount', () => {
  it('shows a profit in green with an up arrow and a plus sign', () => {
    render(<PnlAmount value={123456.5} />)
    const amount = screen.getByText(/1,23,456.50/)
    expect(amount).toHaveTextContent('▲ profit +₹1,23,456.50')
    expect(amount).toHaveClass('text-up')
  })

  it('shows a loss in red with a down arrow and a minus sign', () => {
    render(<PnlAmount value={-960.81} />)
    const amount = screen.getByText(/960.81/)
    expect(amount).toHaveTextContent('▼ loss -₹960.81')
    expect(amount).toHaveClass('text-down')
  })

  it('shows zero without a sign or arrow, and a dash when missing', () => {
    const { rerender } = render(<PnlAmount value={0} />)
    expect(screen.getByText(/₹0.00/)).toHaveTextContent('flat ₹0.00')
    expect(screen.getByText(/₹0.00/)).toHaveClass('text-muted')

    rerender(<PnlAmount value={null} />)
    expect(screen.getByText(/—/)).toBeInTheDocument()
  })
})

describe('PnlSummaryCards', () => {
  it('formats each figure from GET /api/pnl', () => {
    render(<PnlSummaryCards summary={toPnlSummary(pnlJson)} />)
    const card = (label: string) => screen.getByText(label, { selector: 'dt' }).parentElement!

    expect(within(card('Realised')).getByText(/₹/)).toHaveTextContent('-₹60.00')
    expect(card('Charges')).toHaveTextContent('₹900.81')
    expect(card('Charges')).toHaveTextContent('2 trades')
    expect(within(card('Net realised')).getByText(/₹/)).toHaveTextContent('-₹960.81')
    expect(within(card('Unrealised')).getByText(/₹/)).toHaveTextContent('+₹1,250.50')
    expect(within(card('Total')).getByText(/₹/)).toHaveClass('text-up')
  })
})
