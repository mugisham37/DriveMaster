import React, { useState } from 'react'
import { useStripeForm } from './stripe-form/useStripeForm'

export interface DonationFormProps {
  onSuccess?: (amount: number) => void
  onError?: (error: Error) => void
}

export const DonationForm: React.FC<DonationFormProps> = ({
  onSuccess,
  onError
}) => {
  const [amount, setAmount] = useState(10)
  const { isLoading, error, submitPayment } = useStripeForm()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      await submitPayment({
        amount: amount * 100, // Convert to cents
        currency: 'usd'
      })
      onSuccess?.(amount)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Payment failed')
      onError?.(error)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="donation-form">
      <div className="amount-selector">
        <label htmlFor="amount">Donation Amount ($)</label>
        <input
          id="amount"
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          disabled={isLoading}
        />
      </div>
      
      {error && (
        <div className="error-message">
          {error.message}
        </div>
      )}
      
      <button 
        type="submit" 
        disabled={isLoading}
        className="btn-primary"
      >
        {isLoading ? 'Processing...' : `Donate $${amount}`}
      </button>
    </form>
  )
}

export default DonationForm