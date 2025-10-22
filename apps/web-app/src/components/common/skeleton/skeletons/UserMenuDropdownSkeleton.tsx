'use client'

import React from 'react'

export function UserMenuDropdownSkeleton(): React.JSX.Element {
  return (
    <div className="animate-pulse">
      <div className="h-8 w-24 bg-gray-300 rounded"></div>
    </div>
  )
}

export default UserMenuDropdownSkeleton