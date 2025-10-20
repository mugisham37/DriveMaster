"use client";

import { useState } from "react";
import { Profile } from "@/lib/api/profile";
import { Modal } from "@/components/common/Modal";

interface FirstTimeModalProps {
  profile: Profile;
  links: {
    profile: string;
  };
}

export function FirstTimeModal({ profile, links }: FirstTimeModalProps) {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) return null;

  const handleContinue = () => {
    setIsOpen(false);
    // Navigate to profile if needed
    if (links.profile) {
      window.location.href = links.profile;
    }
  };

  return (
    <Modal onClose={() => setIsOpen(false)}>
      <div className="first-time-modal">
        <h2>Welcome to your profile!</h2>
        <p>
          This is your public profile page where others can see your coding
          journey, solutions, and contributions to the Exercism community.
        </p>
        <p>
          You can customize your profile by adding a bio, social links, and more
          in your settings.
        </p>
        <button onClick={handleContinue} className="btn-primary">
          Got it!
        </button>
      </div>
    </Modal>
  );
}
