import { redirect } from 'next/navigation'

/**
 * Mentoring root page - redirects to inbox
 * This matches the Rails behavior where /mentoring redirects to /mentoring/inbox
 */
export default function MentoringPage() {
  redirect('/mentoring/inbox')
}