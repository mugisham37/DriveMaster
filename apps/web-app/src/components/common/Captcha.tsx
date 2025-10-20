'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface CaptchaProps {
  siteKey?: string;
  onSuccess?: () => void;
  theme?: 'light' | 'dark';
  size?: 'normal' | 'flexible' | 'compact';
}

export function Captcha({ 
  siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '',
  onSuccess,
  theme = 'light',
  size = 'flexible'
}: CaptchaProps) {
  
  useEffect(() => {
    // Define the callback function globally
    (window as unknown as { turnstileEnableSubmitButton: () => void }).turnstileEnableSubmitButton = () => {
      const turnstileElement = document.querySelector('.cf-turnstile');
      if (turnstileElement) {
        const form = turnstileElement.closest('form');
        if (form) {
          const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement;
          if (submitButton) {
            submitButton.disabled = false;
          }
        }
      }
      
      // Call custom success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    };

    return () => {
      // Cleanup
      delete (window as unknown as { turnstileEnableSubmitButton?: () => void }).turnstileEnableSubmitButton;
    };
  }, [onSuccess]);

  if (!siteKey) {
    console.warn('Turnstile site key not provided');
    return null;
  }

  return (
    <div>
      <div
        className="cf-turnstile"
        data-sitekey={siteKey}
        data-callback="turnstileEnableSubmitButton"
        data-size={size}
        data-theme={theme}
      />
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="lazyOnload"
      />
    </div>
  );
}