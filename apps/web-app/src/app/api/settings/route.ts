import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // In a real implementation, this would update user settings in the database
    // Handle different types of settings updates
    const allowedFields = [
      'name', 'location', 'bio', 'seniority', 
      'twitter', 'github', 'linkedin',
      'pronoun_parts', 'show_on_supporters_page'
    ]
    
    const updateData: Record<string, any> = {}
    
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updateData[key] = value
      }
    }
    
    console.log('Updating user settings for:', session.user.handle, updateData)
    
    // TODO: Update database
    // await updateUserSettings(session.user.id, updateData)
    
    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      updated_fields: Object.keys(updateData)
    })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}