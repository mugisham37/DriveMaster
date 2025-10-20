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
    const { communication_preferences } = body
    
    if (!communication_preferences || typeof communication_preferences !== 'object') {
      return NextResponse.json(
        { error: 'Invalid communication preferences data' },
        { status: 400 }
      )
    }
    
    // Validate preference keys
    const validPreferences = [
      'email_on_mentor_started_discussion',
      'email_on_mentor_replied_to_discussion', 
      'email_on_student_replied_to_discussion',
      'email_on_mentor_finished_discussion',
      'email_on_acquired_badge',
      'email_on_acquired_trophy',
      'email_on_exercise_contributed_to',
      'email_on_nudge_student',
      'email_on_automated_feedback_added',
      'notification_on_mentor_started_discussion',
      'notification_on_mentor_replied_to_discussion',
      'notification_on_student_replied_to_discussion', 
      'notification_on_mentor_finished_discussion',
      'notification_on_acquired_badge',
      'notification_on_acquired_trophy',
      'marketing_emails',
      'product_updates',
      'community_updates'
    ]
    
    const filteredPreferences: Record<string, boolean> = {}
    
    for (const [key, value] of Object.entries(communication_preferences)) {
      if (validPreferences.includes(key) && typeof value === 'boolean') {
        filteredPreferences[key] = value
      }
    }
    
    console.log('Updating communication preferences for user:', session.user.handle, filteredPreferences)
    
    // TODO: Update database
    // await updateCommunicationPreferences(session.user.id, filteredPreferences)
    
    return NextResponse.json({
      success: true,
      message: 'Communication preferences updated successfully',
      updated_preferences: Object.keys(filteredPreferences)
    })
  } catch (error) {
    console.error('Error updating communication preferences:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}