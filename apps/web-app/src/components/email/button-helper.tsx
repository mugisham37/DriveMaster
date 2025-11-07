import React from 'react'

/**
 * Email button helper utility
 * Migrated from Ruby helpers/email_helper.rb
 */

export interface EmailButtonOptions {
  text: string
  href: string
  backgroundColor?: string
  textColor?: string
  borderColor?: string
  fontSize?: string
  padding?: string
  borderRadius?: string
}

/**
 * Creates HTML email button with inline styles for email compatibility
 * Equivalent to Ruby's email_button_to helper
 */
export function emailButtonTo(
  text: string, 
  href: string, 
  options: Partial<EmailButtonOptions> = {}
): string {
  const {
    backgroundColor = '#604FCD',
    textColor = '#ffffff',
    borderColor = '#130B43',
    fontSize = '20px',
    padding = '15px 25px',
    borderRadius = '5px'
  } = options

  return `
    <table border="0" cellspacing="0" cellpadding="0">
      <tr>
        <td align="center" style="border-radius: ${borderRadius};" bgcolor="${backgroundColor}">
          <a class="button" href="${href}" target="_blank" style="font-size: ${fontSize}; color: ${textColor}; text-decoration: none; padding: ${padding}; border-radius: ${borderRadius}; border: 1px solid ${borderColor}; display: inline-block;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `.trim()
}

/**
 * React component version for email templates
 */
export interface EmailButtonProps extends EmailButtonOptions {
  // Additional props for React component
  className?: string
}

export function EmailButton({ 
  text, 
  href, 
  backgroundColor = '#604FCD',
  textColor = '#ffffff',
  borderColor = '#130B43',
  fontSize = '20px',
  padding = '15px 25px',
  borderRadius = '5px'
}: EmailButtonProps) {
  // For email compatibility, we return the HTML string wrapped in a div
  const buttonHtml = emailButtonTo(text, href, {
    backgroundColor,
    textColor,
    borderColor,
    fontSize,
    padding,
    borderRadius
  })

  return (
    <div dangerouslySetInnerHTML={{ __html: buttonHtml }} />
  )
}