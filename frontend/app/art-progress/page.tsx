import { Suspense } from "react"
import { getArtProgressSafe, getCommentsSafe } from "@/lib/api"
import { ArtProgressContent } from "./art-progress-content"

export const revalidate = 60

export default async function ArtProgressPage() {
  const [artProgress, comments] = await Promise.all([
    getArtProgressSafe({ summary: true }),
    getCommentsSafe("art_progress"),
  ])

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ArtProgressContent
        initialArtProgress={artProgress}
        initialComments={comments}
      />
    </Suspense>
  )
}
