import { render, screen } from '@testing-library/react'
import { FlashPrice } from './FlashPrice'

describe('FlashPrice', () => {
  it('does not flash on first render', () => {
    render(<FlashPrice value={136194} />)
    expect(screen.getByText('1,36,194.00')).not.toHaveAttribute('data-flash')
  })

  it('flashes up when the price rises and down when it falls', () => {
    const { rerender } = render(<FlashPrice value={136194} />)

    rerender(<FlashPrice value={136200} />)
    expect(screen.getByText('1,36,200.00')).toHaveAttribute('data-flash', 'up')
    expect(screen.getByText('1,36,200.00')).toHaveClass('motion-safe:animate-flash-up')

    rerender(<FlashPrice value={136150} />)
    expect(screen.getByText('1,36,150.00')).toHaveAttribute('data-flash', 'down')
  })

  it('does not flash when a price first arrives', () => {
    const { rerender } = render(<FlashPrice value={null} />)
    rerender(<FlashPrice value={136194} />)
    expect(screen.getByText('1,36,194.00')).not.toHaveAttribute('data-flash')
  })
})
