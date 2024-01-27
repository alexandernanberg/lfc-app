interface Tag {
  id: number
  value: string
}

interface User {
  id: string
  name: string
  avatarUrl: string
  url: string
}

export interface Post {
  id: string
  slug: string
  title: string
  excerpt: string
  publishedAt: Date
  imageUrl: string
  content: string
  tags: Array<Tag>
  author: User
  commentsCount: number
}

export interface Comment {
  id: string
  parentId: string
  createdAt: Date
  updatedAt: Date
  author: User
  comment: string
  numberOfLikes: number
}
