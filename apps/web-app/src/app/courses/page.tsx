import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { DiscountBar } from '@/components/courses/DiscountBar'
import { ScrollingTestimonials } from '@/components/courses/ScrollingTestimonials'

export const metadata: Metadata = {
  title: 'Courses - Exercism',
  description: 'Learn programming with our structured courses designed for beginners and intermediate developers.',
}

// Mock data - in real implementation, this would come from API
const courses = [
  {
    id: 1,
    slug: 'coding-fundamentals',
    title: 'Coding Fundamentals',
    description: 'Learn the basics of programming with our comprehensive beginner course.',
    price: 199,
    originalPrice: 299,
    duration: '8 weeks',
    level: 'Beginner',
    imageUrl: '/assets/courses/coding-fundamentals.jpg',
    features: [
      'Interactive coding exercises',
      'Video tutorials',
      'Personal mentor support',
      'Certificate of completion'
    ]
  },
  {
    id: 2,
    slug: 'front-end-fundamentals',
    title: 'Front-End Fundamentals',
    description: 'Master HTML, CSS, and JavaScript to build beautiful web applications.',
    price: 249,
    originalPrice: 349,
    duration: '10 weeks',
    level: 'Beginner to Intermediate',
    imageUrl: '/assets/courses/front-end-fundamentals.jpg',
    features: [
      'Build real projects',
      'Modern frameworks',
      'Responsive design',
      'Portfolio development'
    ]
  }
]

export default function CoursesPage() {
  return (
    <div className="courses-page">
      <DiscountBar />
      
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
        <div className="lg-container">
          <div className="text-center">
            <h1 className="text-h0 mb-6">Learn Programming with Expert Guidance</h1>
            <p className="text-p-2xlarge mb-8 max-w-3xl mx-auto">
              Our structured courses combine interactive exercises, video content, and personal mentoring 
              to help you master programming fundamentals.
            </p>
            <div className="flex justify-center gap-4">
              <Link href="#courses" className="btn-primary btn-l">
                Browse Courses
              </Link>
              <Link href="/bootcamp" className="btn-secondary btn-l">
                Try Our Bootcamp
              </Link>
            </div>
          </div>
        </div>
      </header>

      <section id="courses" className="py-20">
        <div className="lg-container">
          <h2 className="text-h1 text-center mb-16">Choose Your Learning Path</h2>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {courses.map((course) => (
              <div key={course.id} className="course-card bg-white rounded-lg shadow-lg overflow-hidden">
                <Image
                  src={course.imageUrl}
                  alt={course.title}
                  width={600}
                  height={300}
                  className="w-full h-48 object-cover"
                />
                
                <div className="p-8">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {course.level}
                    </span>
                    <span className="text-gray-600">{course.duration}</span>
                  </div>
                  
                  <h3 className="text-h2 mb-4">{course.title}</h3>
                  <p className="text-p-large text-gray-600 mb-6">{course.description}</p>
                  
                  <ul className="mb-6 space-y-2">
                    {course.features.map((feature, index) => (
                      <li key={index} className="flex items-center">
                        <GraphicalIcon icon="checkmark" className="w-5 h-5 text-green-500 mr-3" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  
                  <div className="flex items-center justify-between">
                    <div className="pricing">
                      <span className="text-2xl font-bold text-green-600">${course.price}</span>
                      <span className="text-lg text-gray-500 line-through ml-2">${course.originalPrice}</span>
                    </div>
                    
                    <Link 
                      href={`/courses/${course.slug}`}
                      className="btn-primary btn-m"
                    >
                      Learn More
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <ScrollingTestimonials />

      <section className="bg-gray-50 py-20">
        <div className="lg-container text-center">
          <h2 className="text-h1 mb-8">Not sure which course is right for you?</h2>
          <p className="text-p-xlarge mb-8 max-w-2xl mx-auto">
            Try our free bootcamp to get a taste of our teaching style and see if our approach works for you.
          </p>
          <Link href="/bootcamp" className="btn-enhanced btn-l">
            Try Free Bootcamp
            <GraphicalIcon icon="arrow-right" />
          </Link>
        </div>
      </section>
    </div>
  )
}