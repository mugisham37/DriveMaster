import Link from 'next/link'
import { User } from 'next-auth'
import { SiteUpdate } from '@/types'
import { BlogPost } from '@/lib/api/dashboard'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { ProminentLink } from '@/components/common/ProminentLink'
import { BlogPostComponent } from './BlogPostComponent'
import { SiteUpdatesList } from '@/components/common/SiteUpdatesList'

interface DashboardContentProps {
  user: User
  blogPosts: BlogPost[]
  updates: SiteUpdate[]
}

export function DashboardContent({ user, blogPosts, updates }: DashboardContentProps) {
  return (
    <div className="lhs">
      <div className="header-intro mb-16">
        <GraphicalIcon icon="logo" />
        <div className="content">
          <h1 className="flex">Welcome back, {user.handle}!</h1>
          <p className="welcome">
            Continue your coding journey and level up your skills.{' '}
            <strong>Exercism is 100% free forever.</strong>
          </p>
        </div>
      </div>

      <h2 className="text-h3 mb-16">Where to start</h2>
      
      <section className="actions-section">
        <Link href="/tracks" className="action e-hover-grow">
          <GraphicalIcon icon="bookworm" category="graphics" />
          <span>Continue Learning</span>
        </Link>
        
        <Link href="/mentoring/inbox" className="action e-hover-grow">
          <GraphicalIcon icon="mentoring" category="graphics" />
          <span>Try Mentoring</span>
        </Link>
        
        <Link href="/community" className="action e-hover-grow">
          <GraphicalIcon icon="contributing-header" category="graphics" />
          <span>Get Involved</span>
        </Link>
        
        <Link href="/donate" className="action e-hover-grow">
          <GraphicalIcon icon="floating-cash" category="graphics" />
          <span>Donate</span>
        </Link>
      </section>

      <section className="posts-section">
        <h2>Community Posts</h2>
        <div className="posts">
          {blogPosts.map((post) => (
            <BlogPostComponent key={post.id} post={post} />
          ))}
        </div>
        <ProminentLink link="/blog" text="See all posts" />
      </section>

      <section className="activity-section">
        <h2>New on Exercism</h2>
        <SiteUpdatesList updates={updates} context="track" />
      </section>
    </div>
  )
}