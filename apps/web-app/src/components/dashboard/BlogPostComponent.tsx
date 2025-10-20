import Link from 'next/link'
import Image from 'next/image'
import { BlogPost } from '@/lib/api/dashboard'
import { Avatar } from '@/components/common/Avatar'

interface BlogPostComponentProps {
  post: BlogPost
}

export function BlogPostComponent({ post }: BlogPostComponentProps) {
  return (
    <article className="blog-post">
      <Link href={post.links.self}>
        {post.imageUrl && (
          <div className="image">
            <Image 
              src={post.imageUrl} 
              alt={post.title}
              width={300}
              height={200}
            />
          </div>
        )}
        
        <div className="content">
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
          
          <div className="meta">
            <Avatar 
              user={{
                avatarUrl: post.author.avatarUrl,
                handle: post.author.name,
                flair: null
              }}
              size="small"
            />
            <span className="author">{post.author.name}</span>
            <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
          </div>
        </div>
      </Link>
    </article>
  )
}