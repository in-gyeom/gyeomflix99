import type { ArtProgress, Comment, Genre, Profile } from "@/lib/types"

const DEFAULT_API_BASE_URL = "http://127.0.0.1:5000"

export const API_BASE_URL = (() => {
  const explicitBase = process.env.NEXT_PUBLIC_API_BASE_URL?.trim()
  if (explicitBase) {
    return explicitBase.replace(/\/$/, "")
  }

  if (typeof window !== "undefined") {
    return DEFAULT_API_BASE_URL
  }

  return process.env.API_BASE_URL?.trim().replace(/\/$/, "") || DEFAULT_API_BASE_URL
})()

async function requestJSON<T>(path: string, init?: RequestInit): Promise<T> {
  const hasBody = init?.body !== undefined
  const headers: HeadersInit = hasBody
    ? { "Content-Type": "application/json", ...(init?.headers || {}) }
    : init?.headers || {}

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
    next: { revalidate: 60 },
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export async function getProfileSafe(): Promise<Profile | null> {
  try {
    const data = await requestJSON<{ profile: Profile | null }>("/api/profile")
    return data.profile ?? null
  } catch {
    return null
  }
}

export async function getGenresSafe(options?: { summary?: boolean }): Promise<Genre[]> {
  try {
    const query = options?.summary ? "?summary=1" : ""
    const data = await requestJSON<{ genres: Genre[] }>(`/api/genres${query}`)
    return data.genres || []
  } catch {
    return []
  }
}

export async function getArtProgressSafe(options?: { summary?: boolean }): Promise<ArtProgress[]> {
  try {
    const query = options?.summary ? "?summary=1" : ""
    const data = await requestJSON<{ artProgress: ArtProgress[] }>(`/api/art-progress${query}`)
    return data.artProgress || []
  } catch {
    return []
  }
}

export async function getCommentsSafe(
  contentType: "genre" | "art_progress",
): Promise<Comment[]> {
  try {
    const data = await requestJSON<{ comments: Comment[] }>(
      `/api/comments?contentType=${contentType}`,
    )
    return data.comments || []
  } catch {
    return []
  }
}
