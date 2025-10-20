'use client'

import React, { useState, useCallback } from 'react'
import { GraphicalIcon } from './GraphicalIcon'
import { CopyToClipboardButton } from './CopyToClipboardButton'
import { useAuth } from '@/hooks/useAuth'

interface CLIStep {
  title: string
  description: string
  command?: string
  note?: string
}

interface CLIWalkthroughProps {
  user?: any
  className?: string
}

export function CLIWalkthrough({
  user,
  className = ''
}: CLIWalkthroughProps): React.JSX.Element {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)

  const steps: CLIStep[] = [
    {
      title: 'Install the Exercism CLI',
      description: 'Download and install the Exercism command-line interface.',
      command: 'brew install exercism',
      note: 'On macOS with Homebrew. See installation guide for other platforms.'
    },
    {
      title: 'Configure the CLI',
      description: 'Set up your API token to authenticate with Exercism.',
      command: user?.apiToken ? `exercism configure --token=${user.apiToken}` : 'exercism configure --token=YOUR_API_TOKEN',
      note: 'Your personal API token is shown above.'
    },
    {
      title: 'Download an exercise',
      description: 'Download your first exercise to start coding.',
      command: 'exercism download --exercise=hello-world --track=javascript',
      note: 'Replace with your preferred track and exercise.'
    },
    {
      title: 'Submit your solution',
      description: 'Submit your solution when you\'re ready.',
      command: 'exercism submit path/to/your/solution.js',
      note: 'Navigate to the exercise directory first.'
    }
  ]

  const handleNext = useCallback(() => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      setIsCompleted(true)
    }
  }, [currentStep, steps.length])

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }, [currentStep])

  const handleStepClick = useCallback((stepIndex: number) => {
    setCurrentStep(stepIndex)
    setIsCompleted(false)
  }, [])

  if (isCompleted) {
    return (
      <div className={`cli-walkthrough completed ${className}`}>
        <div className="walkthrough-completion">
          <GraphicalIcon icon="check-circle" />
          <h3>CLI Setup Complete!</h3>
          <p>You're all set to use the Exercism CLI. Happy coding!</p>
          <button
            type="button"
            onClick={() => {
              setIsCompleted(false)
              setCurrentStep(0)
            }}
            className="restart-button"
          >
            Restart Walkthrough
          </button>
        </div>
      </div>
    )
  }

  const currentStepData = steps[currentStep]

  return (
    <div className={`cli-walkthrough ${className}`}>
      <div className="walkthrough-header">
        <h3>CLI Setup Walkthrough</h3>
        <div className="walkthrough-progress">
          <span>Step {currentStep + 1} of {steps.length}</span>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="walkthrough-steps">
        {steps.map((step, index) => (
          <button
            key={index}
            type="button"
            onClick={() => handleStepClick(index)}
            className={`step-indicator ${index === currentStep ? 'active' : ''} ${index < currentStep ? 'completed' : ''}`}
          >
            <span className="step-number">{index + 1}</span>
            <span className="step-title">{step.title}</span>
          </button>
        ))}
      </div>

      <div className="walkthrough-content">
        <div className="step-content">
          <h4>{currentStepData.title}</h4>
          <p>{currentStepData.description}</p>
          
          {currentStepData.command && (
            <div className="command-section">
              <label>Command:</label>
              <div className="command-block">
                <code>{currentStepData.command}</code>
                <CopyToClipboardButton textToCopy={currentStepData.command}>
                  <GraphicalIcon icon="copy" />
                </CopyToClipboardButton>
              </div>
            </div>
          )}

          {currentStepData.note && (
            <div className="step-note">
              <GraphicalIcon icon="info" />
              <span>{currentStepData.note}</span>
            </div>
          )}
        </div>

        <div className="walkthrough-navigation">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="nav-button prev-button"
          >
            <GraphicalIcon icon="chevron-left" />
            Previous
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="nav-button next-button"
          >
            {currentStep === steps.length - 1 ? 'Complete' : 'Next'}
            <GraphicalIcon icon={currentStep === steps.length - 1 ? 'check' : 'chevron-right'} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default CLIWalkthrough
