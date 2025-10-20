'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { Modal } from './Modal';
import { Icon } from '@/lib/assets';

const DONATION_AMOUNTS = [5, 10, 25, 50, 100];

interface DonationsFormWithModalProps {
  request: {
    endpoint: string;
    options: {
      initialData?: any;
    };
  };
  userSignedIn: boolean;
  captchaRequired: boolean;
  recaptchaSiteKey: string;
  links: {
    settings: string;
    success: string;
  };
}

export function DonationsFormWithModal({
  request,
  userSignedIn,
  captchaRequired,
  recaptchaSiteKey,
  links
}: DonationsFormWithModalProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [email, setEmail] = useState('');
  
  const { user } = useAuth();
  
  const { submit, isSubmitting, error } = useFormSubmission({
    endpoint: request.endpoint,
    method: 'POST',
    onSuccess: () => {
      setIsModalOpen(false);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = isCustom ? parseFloat(customAmount) : selectedAmount;
    if (!amount || amount <= 0) return;

    const formData = {
      amount_in_cents: Math.round(amount * 100),
      email: userSignedIn ? user?.email : email,
      recurring: false
    };

    await submit(formData);
  };

  const finalAmount = isCustom ? parseFloat(customAmount) : selectedAmount;
  const isValidAmount = finalAmount && finalAmount > 0;
  const isValidEmail = userSignedIn || email.includes('@');

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="btn-primary btn-m"
      >
        <Icon icon="heart" alt="" />
        <span>Donate to Exercism</span>
      </button>

      <Modal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="donations-modal"
      >
        <div className="donations-form-with-modal">
          <div className="modal-header">
            <h2 className="text-h3 mb-4">Support Exercism</h2>
            <p className="text-p-base mb-8">
              Help us keep coding education free for everyone
            </p>
          </div>

          <form onSubmit={handleSubmit} className="donation-form">
            <div className="amount-selection mb-6">
              <label className="text-label mb-4 block">Select Amount</label>
              <div className="preset-amounts mb-4">
                {DONATION_AMOUNTS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
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
                    placeholder="Other amount"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    className="custom-amount-input"
                    min="1"
                    step="1"
                  />
                </div>
              </div>
            </div>

            {!userSignedIn && (
              <div className="email-field mb-6">
                <label className="text-label mb-2 block">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="your@email.com"
                  required
                />
              </div>
            )}

            {error && (
              <div className="error-message mb-4 p-4 bg-red-50 border border-red-200 rounded">
                <p className="text-red-700">{error.message}</p>
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="btn-secondary btn-m mr-4"
              >
                Cancel
              </button>
              <button
                type="submit"
                className={`btn-primary btn-m ${(!isValidAmount || !isValidEmail || isSubmitting) ? 'disabled' : ''}`}
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
                    <span>Donate ${isValidAmount ? finalAmount : ''}</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="donation-info mt-6 pt-6 border-t border-borderColor6">
            <p className="text-p-small text-textColor6">
              Exercism is a not-for-profit organization. Your donation helps us keep the platform free for everyone.
            </p>
            {userSignedIn && (
              <p className="text-p-small text-textColor6 mt-2">
                <a href={links.settings} className="text-link">
                  Manage your donations
                </a>
              </p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}