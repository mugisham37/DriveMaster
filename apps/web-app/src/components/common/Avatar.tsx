'use client';

import Image from 'next/image';

interface Flair {
  id: string;
  name: string;
  iconUrl: string;
}

interface User {
  avatarUrl: string;
  handle: string;
  flair?: Flair | null;
  hasAvatar?: boolean;
}

interface AvatarProps {
  user?: User;
  src?: string;
  handle?: string;
  size?: 'small' | 'medium' | 'large' | 'extra-large';
  className?: string;
}

const SIZE_CLASSES = {
  small: 'w-8 h-8',
  medium: 'w-12 h-12', 
  large: 'w-16 h-16',
  'extra-large': 'w-24 h-24',
};

export function Avatar({ 
  user, 
  src,
  handle,
  size = 'medium', 
  className = '' 
}: AvatarProps) {
  const sizeClass = SIZE_CLASSES[size];
  const avatarUrl = src || user?.avatarUrl || '/assets/graphics/avatar-placeholder.svg';
  const displayHandle = handle || user?.handle || 'User';
  
  return (
    <div className={`c-avatar ${sizeClass} ${className} relative`}>
      <Image
        src={avatarUrl}
        alt={`${displayHandle}'s avatar`}
        width={size === 'small' ? 32 : size === 'medium' ? 48 : size === 'large' ? 64 : 96}
        height={size === 'small' ? 32 : size === 'medium' ? 48 : size === 'large' ? 64 : 96}
        className="rounded-full object-cover"
        unoptimized={avatarUrl.includes('gravatar') || avatarUrl.includes('github')}
      />
      
      {user?.flair && (
        <div className="absolute -bottom-1 -right-1">
          <Image
            src={user.flair.iconUrl}
            alt={user.flair.name}
            width={size === 'small' ? 12 : size === 'medium' ? 16 : 20}
            height={size === 'small' ? 12 : size === 'medium' ? 16 : 20}
            className="rounded-full"
          />
        </div>
      )}
    </div>
  );
}
