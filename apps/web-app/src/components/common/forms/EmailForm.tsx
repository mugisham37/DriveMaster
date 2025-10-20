import React, { useState } from 'react'
import { Form } from './Form'
import { FormField } from './FormField'
import { FormButton } from './FormButton'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { commonValidations } from '@/lib/validation'

interface EmailFormProps {
  defaultEmail: string
  endpoint: string
  onSuccess?: () => void
}

export function EmailForm({ defaultEmail, endpoint, onSuccess }: EmailFormProps): JSX.Element {
  const [formData, setFormData] = useState({
    email: defaultEmail,
    password: ''
  })

  const { submit, status, error } = useFormSubmission({
    endpoint,
    method: 'PATCH',
    onSuccess,
    successMessage: `Confirmation email sent to ${formData.email}`
  })

  const handleSubmit = async (data: Record<string, any>) => {
    await submit({
      user: {
        email: data.email,
        sudo_password: data.password
      }
    })
  }

  const validationSchema = {
    ...commonValidations.email,
    password: { required: true }
  }

  return (
    <Form
      onSubmit={handleSubmit}
      validationSchema={validationSchema}
      className="space-y-4"
    >
      <h2 className="text-h3 mb-4">Change Your Email</h2>
      <hr className="c-divider --small mb-6" />
      
      <FormField
        id="user_email"
        name="email"
        type="email"
        label="Your Email Address"
        value={formData.email}
        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
        required
      />
      
      <FormField
        id="user_sudo_password_email"
        name="password"
        type="password"
        label="Confirm Your Password"
        value={formData.password}
        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
        info="Please enter your current password to confirm this change"
        required
      />
      
      <div className="form-footer">
        <FormButton status={status} className="btn-primary btn-m">
          Change Email
        </FormButton>
      </div>
    </Form>
  )
}