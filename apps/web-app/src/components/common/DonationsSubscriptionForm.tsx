'use client';

import { useState } from 'react';
import { useFormSubmission } from '@/hooks/useFormSubmission';
import { Icon } from '@/lib/assets';

interface DonationsSubscriptionFormProps {
  provider: 'stripe' | 'github' | 'paypal';
  amountInCents: number;
  links: {
    cancel?: string;
    update?: string;
  };
}

const SUBSCRIPTION_AMOUNTS = [5, 10, 25, 50, 100];

export function DonationsSubscriptionForm({
  provider,
  amountInCents,
  links
}: DonationsSubscriptionFormProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [newAmount, setNewAmount] = useState(Math.round(amountInCents / 100));
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const currentAmount = Math.round(amountInCents / 100);

  const { submit: updateAmount, isSubmitting: isUpdating } = useFormSubmission({
    endpoint: links.update || '',
    method: 'PATCH',
    onSuccess: () => {
      setIsEditing(false);
      window.location.reload();
    },
    successMessage: 'Subscription updated successfully!'
  });

  const { submit: cancelSubscription, isSubmitting: isCancelling } = useFormSubmission({
    endpoint: links.cancel || '',
    method: 'DELETE',
    onSuccess: () => {
      window.location.reload();
    },
    successMessage: 'Subscription cancelled successfully'
  });

  const handleUpdateAmount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAmount <= 0 || newAmount === currentAmount) return;

    await updateAmount({
      amount_in_cents: newAmount * 100
    });
  };

  const handleCancelSubscription = async () => {
    await cancelSubscription({});
    setShowCancelConfirm(false);
  };

  const getProviderName = () => {
    switch (provider) {
      case 'stripe': return 'Stripe';
      case 'github': return 'GitHub Sponsors';
      case 'paypal': return 'PayPal';
      default: return 'Unknown';
    }
  };

  return (
    <div className="donations-subscription-form">
      <div className="subscription-header mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-h4 mb-2">Monthly Subscription</h3>
            <p className="text-p-base text-textColor6">
              Thank you for supporting Exercism with ${currentAmount}/month via {getProviderName()}
            </p>
          </div>
          <div className="subscription-amount">
            <span className="text-h3 text-prominentLinkColor">${currentAmount}</span>
            <span className="text-p-base text-textColor6">/month</span>
          </div>
        </div>
      </div>

      {!isEditing ? (
        <div className="subscription-actions">
          <button
            onClick={() => setIsEditing(true)}
            className="btn-secondary btn-s mr-4"
            disabled={!links.update}
          >
            <Icon icon="edit" alt="" />
            <span>Change Amount</span>
          </button>
          <button
            onClick={() => setShowCancelConfirm(true)}
            className="btn-secondary btn-s text-red-600 border-red-200 hover:bg-red-50"
            disabled={!links.cancel}
          >
            <Icon icon="cross" alt="" />
            <span>Cancel Subscription</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleUpdateAmount} className="update-amount-form">
          <div className="amount-selection mb-4">
            <label className="text-label mb-2 block">New Monthly Amount</label>
            <div className="preset-amounts mb-4">
              {SUBSCRIPTION_AMOUNTS.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  className={`amount-btn ${newAmount === amount ? 'selected' : ''}`}
                  onClick={() => setNewAmount(amount)}
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
                  value={newAmount}
                  onChange={(e) => setNewAmount(parseInt(e.target.value) || 0)}
                  className="custom-amount-input"
                  min="1"
                  step="1"
                />
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setNewAmount(currentAmount);
              }}
              className="btn-secondary btn-s mr-4"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`btn-primary btn-s ${(newAmount <= 0 || newAmount === currentAmount || isUpdating) ? 'disabled' : ''}`}
              disabled={newAmount <= 0 || newAmount === currentAmount || isUpdating}
            >
              {isUpdating ? (
                <>
                  <Icon icon="spinner" alt="" className="animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Icon icon="checkmark" alt="" />
                  <span>Update to ${newAmount}/month</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}

      {showCancelConfirm && (
        <div className="cancel-confirmation mt-6 p-4 bg-red-50 border border-red-200 rounded">
          <h4 className="text-h5 mb-2 text-red-800">Cancel Subscription?</h4>
          <p className="text-p-base mb-4 text-red-700">
            Are you sure you want to cancel your monthly subscription? This will stop all future payments.
          </p>
          <div className="confirmation-actions">
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="btn-secondary btn-s mr-4"
            >
              Keep Subscription
            </button>
            <button
              onClick={handleCancelSubscription}
              className="btn-primary btn-s bg-red-600 hover:bg-red-700"
              disabled={isCancelling}
            >
              {isCancelling ? (
                <>
                  <Icon icon="spinner" alt="" className="animate-spin" />
                  <span>Cancelling...</span>
                </>
              ) : (
                <>
                  <Icon icon="cross" alt="" />
                  <span>Yes, Cancel</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <div className="subscription-info mt-6 pt-4 border-t border-borderColor6">
        <p className="text-p-small text-textColor6">
          Your subscription helps keep Exercism free for everyone. You can change or cancel your subscription at any time.
        </p>
      </div>
    </div>
  );
}