export type Profile = {
  id: string
  profile_image_url: string | null
  profile_text: string | null
  created_at: string
  updated_at: string
}

export type Genre = {
  id: string
  category: "action" | "comedy"
  title: string
  description: string | null
  thumbnail_url: string | null
  images: string[]
  created_at: string
  updated_at: string
}

export type ArtProgress = {
  id: string
  title: string
  thumbnail_url: string | null
  images: string[]
  year_category: "2023" | "2024" | "2025"
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  content_type: "genre" | "art_progress"
  content_id: string
  author_name: string
  comment_text: string
  created_at: string
}

export const YEAR_CATEGORIES = [
  { value: "2023", label: "2023년" },
  { value: "2024", label: "2024년" },
  { value: "2025", label: "2025년" },
] as const

export const GENRE_CATEGORIES = [
  { value: "action", label: "액션" },
  { value: "comedy", label: "개그" },
] as const
