import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Avatar } from '@/components/common/Avatar'
import { Pagination } from '@/components/common/Pagination'

export const metadata: Metadata = {
  title: 'Blog - Exercism',
  description: 'Read the latest updates, tutorials, and insights from the Exercism community.',
}

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  description: string
  publishedAt: string
  imageUrl?: string
  video?: boolean
  youtubeId?: string
  author: {
    id: number
    handle: string
    name: string
    avatarUrl: string
  }
  links: {
    self: string
  }
}

async function getBlogPosts(page: number = 1) {
  // Mock data - in real implementation, this would fetch from API
  const posts: BlogPost[] = [
    {
      id: 1,
      title: "Introducing Exercism v3: A New Era of Programming Education",
      slug: "introducing-exercism-v3",
      excerpt: "We're excited to announce the launch of Exercism v3, featuring mentoring, tracks, and a completely redesigned learning experience.",
      description: "After years of development, we're thrilled to introduce Exercism v3 with revolutionary features that will transform how you learn programming.",
      publishedAt: "2024-01-15T10:00:00Z",
      imageUrl: "https://assets.exercism.org/images/blog/exercism-v3-launch.jpg",
      video: false,
      author: {
        id: 1,
        handle: "iHiD",
        name: "Jeremy Walker",
        avatarUrl: "https://assets.exercism.org/images/avatars/jeremy-walker.jpg"
      },
      links: {
        self: "/blog/introducing-exercism-v3"
      }
    },
    {
      id: 2,
      title: "The Power of Mentoring in Programming Education",
      slug: "power-of-mentoring",
      excerpt: "Discover how our mentoring system helps thousands of developers improve their coding skills through personalized feedback.",
      description: "Learn about the impact of mentoring on programming education and how it accelerates learning.",
      publishedAt: "2024-01-10T14:30:00Z",
      imageUrl: "https://assets.exercism.org/images/blog/mentoring-impact.jpg",
      video: true,
      youtubeId: "dQw4w9WgXcQ",
      author: {
        id: 2,
        handle: "kytrinyx",
        name: "Katrina Owen",
        avatarUrl: "https://assets.exercism.org/images/avatars/katrina-owen.jpg"
      },
      links: {
        self: "/blog/power-of-mentoring"
      }
    },
    {
      id: 3,
      title: "Building Better Code Through Practice",
      slug: "building-better-code",
      excerpt: "Explore how consistent practice with our exercises helps developers write cleaner, more maintainable code.",
      description: "A deep dive into the methodology behind our exercise design and how it improves coding skills.",
      publishedAt: "2024-01-05T09:15:00Z",
      imageUrl: "https://assets.exercism.org/images/blog/better-code.jpg",
      video: false,
      author: {
        id: 3,
        handle: "erikschierboom",
        name: "Erik Schierboom",
        avatarUrl: "https://assets.exercism.org/images/avatars/erik-schierboom.jpg"
      },
      links: {
        self: "/blog/building-better-code"
      }
    }
  ]

  return {
    posts,
    totalPages: 5,
    currentPage: page
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default async function BlogPage({
  searchParams
}: {
  searchParams: { page?: string }
}) {
  const page = parseInt(searchParams.page || '1')
  const { posts, totalPages, currentPage } = await getBlogPosts(page)
  const mainPost = posts[0]
  const otherPosts = posts.slice(1)

  return (
    <div id="page-blog">
      <header className="pt-16 pb-24 md:pb-16 mb-32 md:mb-48">
        <div className="lg-container flex flex-col md:flex-row items-center">
          <GraphicalIcon 
            icon="community-solutions" 
            category="graphics" 
            className="main-graphic mb-8 md:mb-0 md:mr-24" 
          />
          <div className="flex flex-col md:mr-auto">
            <h1 className="text-h1 mb-8 text-center md:text-left">
              Exercism&apos;s Blog
            </h1>
            <p className="text-p-large mb-20 md:mb-0">
              Updates from our incredible{' '}
              <Link href="/contributing/contributors" className="text-linkColor underline">
                community of contributors
              </Link>
            </p>
          </div>

          <div className="socials flex items-center md:ml-24">
            <Link href="https://github.com/exercism" className="c-social-icon">
              <GraphicalIcon icon="external-site-github" className="filter-textColor1" />
              GitHub
            </Link>
            <Link href="https://twitter.com/exercism_io" className="c-social-icon twitter">
              <GraphicalIcon icon="external-site-twitter" />
              Twitter
            </Link>
            <Link href="https://www.youtube.com/c/Exercism-videos" className="c-social-icon">
              <GraphicalIcon icon="external-site-youtube" />
              YouTube
            </Link>
          </div>
        </div>
      </header>

      <div className="lg-container">
        {mainPost && (
          <Link 
            href={mainPost.links.self}
            className="highlighted-post p-24 md:p-32 shadow-base flex flex-stretch mb-48 block hover:shadow-lg transition-shadow"
          >
            <div className="mr-auto">
              <h2 className="text-h0 mb-12">{mainPost.title}</h2>
              <div className="flex items-center mb-16 text-14 text-textColor6">
                <Avatar user={mainPost.author} />
                <span className="ml-8 mr-16">{mainPost.author.name}</span>
                <span>{formatDate(mainPost.publishedAt)}</span>
              </div>

              <p className="text-p-large mb-16 md:mb-20">{mainPost.description}</p>
              <div className="c-prominent-link">
                <span>{mainPost.video ? 'Watch video' : 'Read more'}</span>
                <GraphicalIcon icon="arrow-right" />
              </div>
            </div>

            {mainPost.imageUrl && (
              <div className="hidden lg:block lg:ml-48 self-start main-image-link">
                <Image 
                  src={mainPost.imageUrl} 
                  alt="" 
                  width={300}
                  height={200}
                  className="rounded-8 w-100" 
                />
              </div>
            )}
          </Link>
        )}

        <h2 className="text-h3 mb-24 md:mb-40">Other Posts</h2>
        <div className="grid gap-24 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {otherPosts.map((post) => (
            <article key={post.id} className="bg-backgroundColorA rounded-8 shadow-base hover:shadow-lg transition-shadow">
              <Link href={post.links.self} className="block">
                {post.imageUrl && (
                  <div className="relative">
                    <Image 
                      src={post.imageUrl} 
                      alt="" 
                      width={300}
                      height={160}
                      className="w-full h-40 object-cover rounded-t-8" 
                    />
                    {post.video && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <GraphicalIcon icon="video-play" className="w-12 h-12 text-white drop-shadow-lg" />
                      </div>
                    )}
                  </div>
                )}
                <div className="p-16">
                  <h3 className="text-h6 mb-8 line-clamp-2">{post.title}</h3>
                  <p className="text-p-small text-textColor6 mb-12 line-clamp-3">{post.excerpt}</p>
                  <div className="flex items-center text-xs text-textColor6">
                    <Avatar user={post.author} size="small" />
                    <span className="ml-6">{post.author.name}</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="mt-48 flex justify-center">
          <Pagination 
            current={currentPage}
            total={totalPages}
            setPage={(page) => {
              window.location.href = `/blog?page=${page}`
            }}
          />
        </div>
      </div>
    </div>
  )
}