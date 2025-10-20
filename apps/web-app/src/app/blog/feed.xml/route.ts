import { NextRequest, NextResponse } from 'next/server'

interface BlogPost {
  id: number
  title: string
  slug: string
  excerpt: string
  publishedAt: string
  author: {
    name: string
  }
}

async function getBlogPosts(): Promise<BlogPost[]> {
  // Mock data - in real implementation, this would fetch from API
  return [
    {
      id: 1,
      title: "Introducing Exercism v3: A New Era of Programming Education",
      slug: "introducing-exercism-v3",
      excerpt: "We're excited to announce the launch of Exercism v3, featuring mentoring, tracks, and a completely redesigned learning experience.",
      publishedAt: "2024-01-15T10:00:00Z",
      author: {
        name: "Jeremy Walker"
      }
    },
    {
      id: 2,
      title: "The Power of Mentoring in Programming Education",
      slug: "power-of-mentoring",
      excerpt: "Discover how our mentoring system helps thousands of developers improve their coding skills through personalized feedback.",
      publishedAt: "2024-01-10T14:30:00Z",
      author: {
        name: "Katrina Owen"
      }
    }
  ]
}

export async function GET(request: NextRequest) {
  const posts = await getBlogPosts()
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://exercism.org'

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Exercism's Blog</title>
    <description>Updates from our incredible community of contributors</description>
    <link>${baseUrl}/blog</link>
    <atom:link href="${baseUrl}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    
    ${posts.map(post => `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <description><![CDATA[${post.excerpt}]]></description>
      <link>${baseUrl}/blog/${post.slug}</link>
      <guid isPermaLink="true">${baseUrl}/blog/${post.slug}</guid>
      <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
      <author>${post.author.name}</author>
    </item>
    `).join('')}
  </channel>
</rss>`

  return new NextResponse(rss, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  })
}