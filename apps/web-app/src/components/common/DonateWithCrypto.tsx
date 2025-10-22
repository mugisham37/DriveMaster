'use client';

import React from 'react';
import { useSession } from 'next-auth/react';
import { GraphicalIcon } from './GraphicalIcon';
import Script from 'next/script';

interface DonateWithCryptoProps {
  checkoutId?: string;
  className?: string;
}

export function DonateWithCrypto({ 
  checkoutId = 'ceb7bf37-2622-4615-a1db-69de8adfe648',
  className = ''
}: DonateWithCryptoProps) {
  const { data: session } = useSession();

  const handleDonateClick = () => {
    const url = `https://commerce.coinbase.com/checkout/${checkoutId}`;
    
    // Open Coinbase Commerce checkout
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={className}>
      <button
        onClick={handleDonateClick}
        data-custom={session?.user ? `user-${session.user.id}` : undefined}
        data-styled="false"
        className="donate-with-crypto btn-m !flex !py-8 !px-16"
        type="button"
      >
        <GraphicalIcon 
          icon="coinbase" 
          category="graphics" 
          className="!filter-none" 
        />
        <span className="!text-[16px] !font-body">
          Donate with Crypto
        </span>
      </button>
      
      <Script
        src="https://commerce.coinbase.com/v1/checkout.js?version=201807"
        strategy="lazyOnload"
      />
    </div>
  );
}