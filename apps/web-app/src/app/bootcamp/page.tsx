import { Metadata } from 'next'
import { BootcampPage } from '@/components/bootcamp/BootcampPage'
import { getBootcampData } from '@/lib/api/bootcamp'

export const metadata: Metadata = {
  title: 'Exercism Bootcamp - Learn to Code with Live Teaching',
  description: 'A unique part-time remote coding bootcamp by the team behind Exercism. Build rock solid coding foundations with live teaching sessions.',
}

export default async function Bootcamp() {
  const bootcampData = await getBootcampData()

  return <BootcampPage {...bootcampData} />
}