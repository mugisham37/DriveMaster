import { Metadata } from 'next'
import { BootcampCheckout } from '@/components/bootcamp/BootcampCheckout'

interface PaymentPageProps {
  params: { courseSlug: string }
}

export async function generateMetadata({ params }: PaymentPageProps): Promise<Metadata> {
  return {
    title: `Payment - ${params.courseSlug} Course - Exercism Bootcamp`,
    description: `Complete your enrollment for the ${params.courseSlug} bootcamp course`,
  }
}

export default function PaymentPage({ params }: PaymentPageProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="lg-container py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Course Information */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h1 className="text-3xl font-bold mb-4">
                Complete Your Enrollment
              </h1>
              <h2 className="text-xl text-gray-600 mb-6">
                {params.courseSlug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())} Course
              </h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Course Fee:</span>
                  <span className="font-semibold">$2,500</span>
                </div>
                <div className="flex justify-between">
                  <span>Processing Fee:</span>
                  <span className="font-semibold">$50</span>
                </div>
                <hr />
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>$2,550</span>
                </div>
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">What&apos;s Included:</h3>
                <ul className="text-blue-800 space-y-1">
                  <li>• 12 weeks of live instruction</li>
                  <li>• Personal mentoring sessions</li>
                  <li>• Access to all course materials</li>
                  <li>• Certificate of completion</li>
                  <li>• Career guidance and support</li>
                </ul>
              </div>
            </div>

            {/* Payment Form */}
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-xl font-semibold mb-6">Payment Information</h3>
              <BootcampCheckout />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}