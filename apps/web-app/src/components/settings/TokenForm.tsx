'use client'

import React, { useState } from 'react'
import { useFormSubmission } from '@/hooks/useFormSubmission'
import { FormButton } from '@/components/common/forms/FormButton'
import { CopyToClipboardButton } from '@/components/common/CopyToClipboardButton'
import { ProminentLink } from '@/components/common/ProminentLink'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'

interface TokenFormProps {
  token: string
  links: {
    reset: string
    info: string
  }
}

export default function TokenForm({
  token,
  links
}: TokenFormProps): React.JSX.Element {
  const [showToken, setShowToken] = useState(false)
  const [currentToken, setCurrentToken] = useState(token)

  const { submit, isSubmitting, isSuccess, error } = useFormSubmission({
    endpoint: links.reset,
    method: 'POST',
    successMessage: 'API token reset successfully!',
    onSuccess: (data: any) => {
      if (data.token) {
        setCurrentToken(data.token)
        setShowToken(true)
      }
    }
  })

  const handleResetToken = async () => {
    if (!confirm('Are you sure you want to reset your API token? Your old token will stop working immediately.')) {
      return
    }
    
    await submit({})
  }

  const maskedToken = currentToken.replace(/./g, '•').slice(0, -4) + currentToken.slice(-4)

  return (
    <div className="token-form">
      <h2 className="text-h3 mb-6">CLI Authentication Token</h2>
      
      <div className="token-info mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <p className="text-textColor2 mb-3">
          Use this token to authenticate with the Exercism CLI when working on exercises locally.
        </p>
        <ProminentLink
          link={links.info}
          text="Learn how to set up the CLI"
          external={true}
        />
      </div>

      <div className="current-token mb-6">
        <h3 className="text-h4 mb-4">Your API Token</h3>
        
        <div className="token-display p-4 bg-backgroundColorB border border-borderColor6 rounded-8">
          <div className="flex items-center gap-3 mb-3">
            <div className="token-value flex-1 font-mono text-sm">
              {showToken ? currentToken : maskedToken}
            </div>
            
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="btn-secondary btn-xs"
              title={showToken ? 'Hide token' : 'Show token'}
            >
              <GraphicalIcon icon={showToken ? 'eye-off' : 'eye'} />
            </button>
            
            {showToken && (
              <CopyToClipboardButton
                textToCopy={currentToken}
                className="btn-secondary btn-xs"
              />
            )}
          </div>
          
          {!showToken && (
            <p className="text-textColor6 text-xs">
              Click the eye icon to reveal your token
            </p>
          )}
        </div>
      </div>

      <div className="token-actions mb-6">
        <FormButton
          onClick={handleResetToken}
          disabled={isSubmitting}
          className="btn-secondary btn-m"
          type="button"
        >
          <GraphicalIcon icon="refresh" className="mr-2" />
          {isSubmitting ? 'Resetting...' : 'Reset Token'}
        </FormButton>
        
        {isSuccess && (
          <span className="text-green-600 ml-4">
            Token reset successfully! Make sure to update your CLI configuration.
          </span>
        )}
        
        {error && (
          <span className="text-red-600 ml-4">Error: {error.message}</span>
        )}
      </div>

      <div className="cli-setup mb-6 p-4 bg-backgroundColorA border border-borderColor6 rounded-8">
        <h4 className="text-h4 mb-3">CLI Setup Instructions</h4>
        
        <div className="setup-steps space-y-3">
          <div className="step">
            <div className="step-number inline-flex items-center justify-center w-6 h-6 bg-prominentLinkColor text-white text-sm rounded-full mr-3">
              1
            </div>
            <span className="text-textColor2">
              Download and install the Exercism CLI from our website
            </span>
          </div>
          
          <div className="step">
            <div className="step-number inline-flex items-center justify-center w-6 h-6 bg-prominentLinkColor text-white text-sm rounded-full mr-3">
              2
            </div>
            <span className="text-textColor2">
              Configure the CLI with your token:
            </span>
          </div>
          
          <div className="command-example ml-9 p-3 bg-backgroundColorB border border-borderColor6 rounded font-mono text-sm">
            <div className="flex items-center justify-between">
              <code>exercism configure --token={showToken ? currentToken : '[your-token]'}</code>
              {showToken && (
                <CopyToClipboardButton
                  textToCopy={`exercism configure --token=${currentToken}`}
                  className="btn-secondary btn-xs ml-2"
                />
              )}
            </div>
          </div>
          
          <div className="step">
            <div className="step-number inline-flex items-center justify-center w-6 h-6 bg-prominentLinkColor text-white text-sm rounded-full mr-3">
              3
            </div>
            <span className="text-textColor2">
              Start downloading and solving exercises locally!
            </span>
          </div>
        </div>
      </div>

      <div className="security-warning p-4 bg-red-50 border border-red-200 rounded-8">
        <h4 className="text-red-800 font-semibold mb-2">Security Important:</h4>
        <ul className="text-red-800 text-sm space-y-1">
          <li>• Keep your API token secret - don't share it or commit it to version control</li>
          <li>• If you suspect your token has been compromised, reset it immediately</li>
          <li>• The token provides full access to your Exercism account via the CLI</li>
          <li>• Resetting your token will invalidate the old one immediately</li>
        </ul>
      </div>
    </div>
  )
}