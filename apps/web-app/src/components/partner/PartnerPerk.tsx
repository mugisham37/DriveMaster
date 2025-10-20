"use client";

import Link from "next/link";
import Image from "next/image";

interface Partner {
  id: number;
  name: string;
  lightLogo: string;
  darkLogo: string;
  websiteDomain: string;
}

interface PartnerPerk {
  id: number;
  partner: Partner;
  lightLogo?: string;
  darkLogo?: string;
  previewText: string;
  offerSummaryHtml: string;
  buttonText: string;
  links: {
    claim: string;
    partner: string;
  };
}

interface PartnerPerkProps {
  perk: PartnerPerk;
  preview?: boolean;
}

export function PartnerPerk({ perk, preview = false }: PartnerPerkProps) {
  const lightLogo =
    perk.lightLogo || perk.partner.lightLogo || "/assets/blank.png";
  const darkLogo =
    perk.darkLogo || perk.partner.darkLogo || "/assets/blank.png";

  return (
    <div className="c-perk">
      <Image
        src={lightLogo}
        alt={`${perk.partner.name} logo`}
        width={120}
        height={40}
        className="logo logo-light"
      />
      <Image
        src={darkLogo}
        alt={`${perk.partner.name} logo`}
        width={120}
        height={40}
        className="logo logo-dark"
      />

      <p className="about">{perk.previewText}</p>

      <div
        className="details"
        dangerouslySetInnerHTML={{ __html: perk.offerSummaryHtml }}
      />

      <div className="buttons">
        {preview ? (
          <div className="btn-m btn-primary">{perk.buttonText}</div>
        ) : (
          <Link href={perk.links.claim} className="btn-m btn-primary">
            {perk.buttonText}
          </Link>
        )}

        <Link href={perk.links.partner} className="btn-m btn-enhanced">
          Learn more
        </Link>
      </div>
    </div>
  );
}
