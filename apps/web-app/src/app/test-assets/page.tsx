'use client'

import { Icon, GraphicalIcon, assetUrl } from '@/lib/assets'

export default function TestAssetsPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Asset Management System Test</h1>
      
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-2">Icons</h2>
          <div className="flex gap-4 items-center">
            <Icon icon="completed-check-circle" alt="Completed" />
            <Icon icon="external-link" alt="External link" />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Graphics</h2>
          <GraphicalIcon icon="logo" category="graphics" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Bootcamp Assets</h2>
          <GraphicalIcon icon="exercism-face-light" category="bootcamp" />
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Track Icons</h2>
          <div className="flex gap-4">
            <Icon icon="javascript" alt="JavaScript Track" category="tracks" />
            <Icon icon="python" alt="Python Track" category="tracks" />
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2">Direct Asset URL</h2>
          <p>Logo URL: {assetUrl('graphics/logo.svg')}</p>
        </div>
      </div>
    </div>
  )
}