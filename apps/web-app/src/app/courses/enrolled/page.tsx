import { Metadata } from 'next'
import { PaymentReturnHandler } from '@/components/bootcamp/PaymentReturnHandler'

export const metadata: Metadata = {
  title: 'Enrollment Confirmation - Exercism Bootcamp',
  description: 'Confirming your bootcamp enrollment and payment',
}

export default function EnrolledPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <PaymentReturnHandler />
      </div>
    </div>
  )
}