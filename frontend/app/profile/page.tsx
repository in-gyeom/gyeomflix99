import { getProfileSafe } from "@/lib/api"
import { ProfileContent } from "./profile-content"

export default async function ProfilePage() {
  const profile = await getProfileSafe()

  return <ProfileContent initialProfile={profile} />
}
