import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders GST refund automation title', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /gst refund automation/i }),
    ).toBeInTheDocument()
  })
})
