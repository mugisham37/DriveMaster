import React from 'react'
import { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { GraphicalIcon } from '@/components/common/GraphicalIcon'
import { Avatar } from '@/components/common/Avatar'
import { YoutubePlayer } from '@/components/common/YoutubePlayer'
import { ShareButton } from '@/components/common/ShareButton'

interface BlogPost {
  id: number
  title: string
  slug: string
  content: string
  contentHtml: string
  marketingCopy: string
  publishedAt: string
  imageUrl?: string
  video?: boolean
  youtubeId?: string
  author: {
    id: number
    handle: string
    name: string
    avatarUrl: string
    reputation?: string
    profile?: boolean
  }
}

async function getBlogPost(slug: string): Promise<BlogPost | null> {
  // Mock data - in real implementation, this would fetch from API
  const posts: Record<string, BlogPost> = {
    'introducing-exercism-v3': {
      id: 1,
      title: "Introducing Exercism v3: A New Era of Programming Education",
      slug: "introducing-exercism-v3",
      content: `# Welcome to Exercism v3

After years of development and feedback from our amazing community, we're thrilled to introduce Exercism v3 - a complete reimagining of how programming education should work.

## What's New?

### 1. Mentoring System
Our new mentoring system connects you with experienced developers who provide personalized feedback on your solutions. This isn't just automated testing - it's real human insight into your code.

### 2. Learning Tracks
We've redesigned our tracks to provide a structured learning path. Each track now includes:
- Concept exercises that teach specific programming concepts
- Practice exercises to reinforce your learning
- A clear progression path from beginner to advanced

### 3. Community Features
- Share your solutions with the community
- Learn from others' approaches to the same problems
- Participate in discussions about different coding techniques

## The Journey Ahead

This is just the beginning. We have exciting plans for the future, including:
- More programming languages
- Advanced mentoring features
- Community challenges and events

Thank you to everyone who has supported us on this journey. The future of programming education is bright!`,
      contentHtml: `<h1>Welcome to Exercism v3</h1>
<p>After years of development and feedback from our amazing community, we're thrilled to introduce Exercism v3 - a complete reimagining of how programming education should work.</p>
<h2>What's New?</h2>
<h3>1. Mentoring System</h3>
<p>Our new mentoring system connects you with experienced developers who provide personalized feedback on your solutions. This isn't just automated testing - it's real human insight into your code.</p>
<h3>2. Learning Tracks</h3>
<p>We've redesigned our tracks to provide a structured learning path. Each track now includes:</p>
<ul>
<li>Concept exercises that teach specific programming concepts</li>
<li>Practice exercises to reinforce your learning</li>
<li>A clear progression path from beginner to advanced</li>
</ul>
<h3>3. Community Features</h3>
<ul>
<li>Share your solutions with the community</li>
<li>Learn from others' approaches to the same problems</li>
<li>Participate in discussions about different coding techniques</li>
</ul>
<h2>The Journey Ahead</h2>
<p>This is just the beginning. We have exciting plans for the future, including:</p>
<ul>
<li>More programming languages</li>
<li>Advanced mentoring features</li>
<li>Community challenges and events</li>
</ul>
<p>Thank you to everyone who has supported us on this journey. The future of programming education is bright!</p>`,
      marketingCopy: "After years of development, we're thrilled to introduce Exercism v3 with revolutionary features that will transform how you learn programming.",
      publishedAt: "2024-01-15T10:00:00Z",
      imageUrl: "https://assets.exercism.org/images/blog/exercism-v3-launch.jpg",
      video: false,
      author: {
        id: 1,
        handle: "iHiD",
        name: "Jeremy Walker",
        avatarUrl: "https://assets.exercism.org/images/avatars/jeremy-walker.jpg",
        reputation: "142,567",
        profile: true
      }
    },
    'power-of-mentoring': {
      id: 2,
      title: "The Power of Mentoring in Programming Education",
      slug: "power-of-mentoring",
      content: "Content about mentoring...",
      contentHtml: "<p>Content about mentoring...</p>",
      marketingCopy: "Learn about the impact of mentoring on programming education and how it accelerates learning.",
      publishedAt: "2024-01-10T14:30:00Z",
      imageUrl: "https://assets.exercism.org/images/blog/mentoring-impact.jpg",
      video: true,
      youtubeId: "dQw4w9WgXcQ",
      author: {
        id: 2,
        handle: "kytrinyx",
        name: "Katrina Owen",
        avatarUrl: "https://assets.exercism.org/images/avatars/katrina-owen.jpg",
        reputation: "98,432",
        profile: true
      }
    }
  }

  return posts[slug] || null
}

async function getOtherPosts(excludeId: number) {
  // Mock data for other posts
  return [
    {
      id: 3,
      title: "Building Better Code Through Practice",
      slug: "building-better-code",
      excerpt: "Explore how consistent practice with our exercises helps developers write cleaner, more maintainable code.",
      imageUrl: "https://assets.exercism.org/images/blog/better-code.jpg",
      author: {
        handle: "erikschierboom",
        name: "Erik Schierboom",
        avatarUrl: "https://assets.exercism.org/images/avatars/erik-schierboom.jpg"
      }
    }
  ]
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    return {
      title: 'Post Not Found - Exercism Blog'
    }
  }

  return {
    title: `${post.title} - Exercism Blog`,
    description: post.marketingCopy,
    openGraph: {
      title: post.title,
      description: post.marketingCopy,
      images: post.imageUrl ? [post.imageUrl] : undefined,
    }
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = await getBlogPost(params.slug)
  
  if (!post) {
    notFound()
  }

  const otherPosts = await getOtherPosts(post.id)

  return (
    <div id="page-blog-post" className="pb-80">
      <header className="pt-24 md:pt-48 pb-64 md:pb-128">
        <div className="md-container flex flex-col md:flex-row-reverse">
          <Avatar user={post.author} />
          <div className="block flex-grow">
            <h1 className="text-h0 mb-12 md:mb-18">{post.title}</h1>
            <div className="flex items-center text-14 text-textColor6">
              <Avatar user={post.author} size="small" />
              <span className="ml-8 mr-16">{post.author.name}</span>
              <span>{formatDate(post.publishedAt)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="md-container mb-32 md:mb-48 flex gap-32">
        <article className="shadow-lg bg-backgroundColorA rounded-8 md:max-w-[840px] max-w-[100%]">
          <div className="share-bar border-b-1 border-borderColor6 py-12 md:py-16 px-24 md:px-32 flex items-center">
            <GraphicalIcon 
              icon="lightbulb" 
              category="graphics" 
              className="main-graphic hidden md:block" 
            />
            <div className="info md:hidden">
              <h3 className="text-h6 mb-2">Was this useful?</h3>
              <p className="text-p-small">Share it to help others!</p>
            </div>
            <div className="info hidden md:block mr-auto">
              <h3 className="text-h5 mb-2">Did you find this post useful?</h3>
              <p className="text-p-base">Share it with others who might benefit!</p>
            </div>

            <ShareButton 
              url={`/blog/${post.slug}`}
              title={post.title}
              text={post.marketingCopy}
            />
          </div>

          <div className="p-16 md:py-32 md:px-40 flex flex-col">
            {post.video && post.youtubeId && (
              <div className="mb-24">
                <YoutubePlayer videoId={post.youtubeId} />
              </div>
            )}

            <div 
              className="c-textual-content --large"
              dangerouslySetInnerHTML={{ __html: post.contentHtml }}
            />

            <div className="published-at mt-24 pt-16 border-t-1 border-borderColor6 text-16 text-textColor6 leading-150 md:self-start mb-28">
              {formatDate(post.publishedAt)}
              &middot;
              <span className="ml-4">
                Was this useful?{' '}
                <ShareButton 
                  url={`/blog/${post.slug}`}
                  title={post.title}
                  text="Share it!"
                  variant="link"
                />
              </span>
            </div>

            <div className="byline shadow-sm rounded-8 py-16 px-24 flex flex-col md:flex-row md:items-center border-1 border-borderColor6">
              <div className="flex items-center">
                <Avatar user={post.author} />
                <div className="info ml-12">
                  <div className="text-16 leading-150 text-textColor6 mb-2">Published by</div>
                  <div className="sm:flex hidden items-center mb-4">
                    <div className="text-h4 mr-16">@{post.author.handle}</div>
                    {post.author.reputation && (
                      <div className="text-14 text-textColor6">{post.author.reputation} reputation</div>
                    )}
                  </div>
                  <div className="text-16 leading-150 font-semibold text-textColor6">{post.author.name}</div>
                </div>
              </div>
            </div>
          </div>
        </article>

        <div className="hidden mxl:flex flex-col pt-32 gap-20">
          <h4 className="text-h4">More from our blog</h4>
          {otherPosts.map((otherPost) => (
            <article key={otherPost.id} className="bg-backgroundColorA rounded-8 shadow-base">
              <Link href={`/blog/${otherPost.slug}`} className="block p-16">
                {otherPost.imageUrl && (
                  <Image 
                    src={otherPost.imageUrl} 
                    alt="" 
                    width={200}
                    height={120}
                    className="w-full h-24 object-cover rounded-4 mb-12" 
                  />
                )}
                <h5 className="text-h6 mb-8 line-clamp-2">{otherPost.title}</h5>
                <p className="text-p-small text-textColor6 line-clamp-2">{otherPost.excerpt}</p>
              </Link>
            </article>
          ))}
        </div>
      </div>

      <div className="sm-container flex flex-col">
        <h2 className="text-h3 mb-24">Community Posts</h2>
        <div className="grid gap-24 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 mb-32">
          {otherPosts.map((otherPost) => (
            <article key={otherPost.id} className="bg-backgroundColorA rounded-8 shadow-base">
              <Link href={`/blog/${otherPost.slug}`} className="block">
                {otherPost.imageUrl && (
                  <Image 
                    src={otherPost.imageUrl} 
                    alt="" 
                    width={300}
                    height={160}
                    className="w-full h-40 object-cover rounded-t-8" 
                  />
                )}
                <div className="p-16">
                  <h3 className="text-h6 mb-8 line-clamp-2">{otherPost.title}</h3>
                  <p className="text-p-small text-textColor6 mb-12 line-clamp-3">{otherPost.excerpt}</p>
                  <div className="flex items-center text-12 text-textColor6">
                    <Avatar user={otherPost.author} size="small" />
                    <span className="ml-6">{otherPost.author.name}</span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>

        <div className="self-center">
          <Link href="/blog" className="c-prominent-link">
            <span>View all posts</span>
            <GraphicalIcon icon="arrow-right" />
          </Link>
        </div>
      </div>
    </div>
  )
}