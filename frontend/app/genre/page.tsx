import { Suspense } from "react"
import { getCommentsSafe, getGenresSafe } from "@/lib/api"
import { GenreContent } from "./genre-content"

export const revalidate = 60

export default async function GenrePage() {
  const [genres, comments] = await Promise.all([
    getGenresSafe({ summary: true }),
    getCommentsSafe("genre"),
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GenreContent
        initialGenres={genres}
        initialComments={comments}
      />
    </Suspense>
  )
}
