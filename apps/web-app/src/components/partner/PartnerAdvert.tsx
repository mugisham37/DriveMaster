'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface Partner {
  id: number;
  name: string;
  lightLogo: string;
  darkLogo: string;
  websiteDomain: string;
}

interface PartnerAdvert {
  id: number;
  partner: Partner;
  lightLogo?: string;
  darkLogo?: string;
  html: string;
  mailerText: string;
  links: {
    redirect: string;
  };
}

interface PartnerAdvertProps {
  advert?: PartnerAdvert;
  track?: {
    slug: string;
    title: string;
  };
  preview?: boolean;
}

export function PartnerAdvert({ advert, preview = false }: PartnerAdvertProps) {
  const [impressionUuid, setImpressionUuid] = useState<string>('');

  useEffect(() => {
    // Generate impression UUID for tracking
    if (advert && !preview) {
      const uuid = crypto.randomUUID();
      setImpressionUuid(uuid);
      
      // Log impression (in real implementation, this would call an API)
      logAdvertImpression(uuid, advert);
    }
  }, [advert, preview]);

  const logAdvertImpression = async (uuid: string, advert: PartnerAdvert) => {
    try {
      // In real implementation, this would call the impression logging API
      await fetch('/api/partner/impressions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid,
          advertId: advert.id,
          timestamp: new Date().toISOString(),
          path: window.location.pathname
        })
      });
    } catch (error) {
      console.error('Failed to log advert impression:', error);
    }
  };

  if (!shouldShowAdvert(advert, preview)) {
    return null;
  }

  if (!advert) {
    return null;
  }

  const lightLogo = advert.lightLogo || advert.partner.lightLogo;
  const darkLogo = advert.darkLogo || advert.partner.darkLogo;

  return (
    <Link 
      href={`${advert.links.redirect}?impression_uuid=${impressionUuid}`}
      className="c-perk-a"
      target="_blank"
      rel="noopener noreferrer"
    >
      <div className="flex flex-row items-center w-100 mb-8">
        {lightLogo && (
          <Image
            src={lightLogo}
            alt={`${advert.partner.name} logo`}
            width={120}
            height={40}
            className="logo logo-light"
          />
        )}
        {darkLogo && (
          <Image
            src={darkLogo}
            alt={`${advert.partner.name} logo`}
            width={120}
            height={40}
            className="logo logo-dark"
          />
        )}
        <div className="tag">Sponsored</div>
      </div>
      <div 
        className="offer" 
        dangerouslySetInnerHTML={{ __html: advert.html }}
      />
    </Link>
  );
}

function shouldShowAdvert(advert: PartnerAdvert | undefined, preview: boolean): boolean {
  // Check if it's a crawler (simplified check)
  if (typeof navigator !== 'undefined' && /bot|crawler|spider/i.test(navigator.userAgent)) {
    return false;
  }
  
  if (preview) {
    return true;
  }
  
  if (!advert) {
    return false;
  }
  
  // In real implementation, check if current user has hide_website_adverts preference
  // For now, always show adverts
  return true;
}