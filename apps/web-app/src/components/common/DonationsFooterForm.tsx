'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { Icon } from '@/lib/assets';

const DONATION_AMOUNTS = [5, 10, 25, 50, 100];

interface DonationsFooterFormProps {
  request?: {
    endpoint: string;
    options: {
      initialData?: unknown;
    };
  };
  userSignedIn?: boolean;
  captchaRequired?: boolean;
  recaptchaSiteKey?: string;
  links?: {
    settings: string;
    success: string;
  };
}

export function DonationsFooterForm({
  request = {
    endpoint: '/api/payments/subscriptions',
    options: {}
  },
  userSignedIn,
  links = {
    settings: '/settings/donations',
    success: '/settings/donations?success=true'
  }
}: DonationsFooterFormProps = {}) {
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [email, setEmail] = useState('');
  
  const { user, isAuthenticated } = useAuth();
  const isUserSignedIn = userSignedIn ?? isAuthenticated;
  
  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: request.endpoint,
    method: 'POST',
    onSuccess: () => {
      window.location.href = links.success;
    },
    showSuccessMessage: true,
    successMessage: 'Thank you for your donation!'
  });

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setIsCustom(false);
    setCustomAmount('');
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setIsCustom(true);
    setSelectedAmount(null);
  };

  const handleDonate = async () => {
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount <= 0) return;

    const formData = {
      amount_in_cents: Math.round(amount * 100),
      email: isUserSignedIn ? user?.email : email,
      recurring: false
    };

    await submit(formData);
  };

  const finalAmount = isCustom ? parseFloat(customAmount) : selectedAmount;
  const isValidAmount = finalAmount && finalAmount > 0;
  const isValidEmail = isUserSignedIn || email.includes('@');

  return (
    <div className="donations-footer-form">
      <div className="amount-selection">
        <div className="preset-amounts">
          {DONATION_AMOUNTS.map((amount) => (
            <button
              key={amount}
              className={`amount-btn ${selectedAmount === amount ? 'selected' : ''}`}
              onClick={() => handleAmountSelect(amount)}
            >
              ${amount}
            </button>
          ))}
        </div>
        
        <div className="custom-amount">
          <div className="input-wrapper">
            <span className="currency-symbol">$</span>
            <input
              type="number"
              placeholder="Other"
              value={customAmount}
              onChange={(e) => handleCustomAmountChange(e.target.value)}
              className="custom-amount-input"
              min="1"
              step="1"
            />
          </div>
        </div>
      </div>

      {!isUserSignedIn && (
        <div className="email-field mt-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="form-input w-full"
            placeholder="your@email.com"
            required
          />
        </div>
      )}

      {error && (
        <div className="error-message mt-4 p-3 bg-red-50 border border-red-200 rounded text-red-700">
          {error.message}
        </div>
      )}

      <button
        className={`donate-btn ${(isValidAmount && isValidEmail && !isSubmitting) ? 'enabled' : 'disabled'}`}
        onClick={handleDonate}
        disabled={!isValidAmount || !isValidEmail || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Icon icon="spinner" alt="" className="animate-spin" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Icon icon="heart" alt="" />
            <span>
              Donate {isValidAmount ? `$${finalAmount}` : ''}
            </span>
          </>
        )}
      </button>

      <p className="donation-note">
        Exercism is a not-for-profit. Your donation helps us keep the platform free for everyone.
      </p>
      
      {isUserSignedIn && (
        <p className="settings-link mt-2">
          <a href={links.settings} className="text-link text-sm">
            Manage your donations
          </a>
        </p>
      )}
    </div>
  );
}