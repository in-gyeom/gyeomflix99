"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Edit, Sparkles, Upload, User } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import type { Profile } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { AdminPasswordDialog } from "@/components/admin-password-dialog"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

interface ProfileContentProps {
  initialProfile: Profile | null
}


export function ProfileContent({ initialProfile }: ProfileContentProps) {
  const [profile, setProfile] = useState<Profile | null>(initialProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [profileText, setProfileText] = useState(profile?.profile_text || "")
  const [fontSize, setFontSize] = useState(16)
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)

  const handleEditClick = () => {
    setShowPasswordDialog(true)
  }

  const handlePasswordSuccess = () => {
    setIsEditing(true)
  }

  useEffect(() => {
    if (!isEditing || !editorRef.current) return
    editorRef.current.innerHTML = profileText
  }, [isEditing, profileText])

  const readFileAsDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = () => {
        if (typeof reader.result === "string") {
          resolve(reader.result)
          return
        }

        reject(new Error("이미지를 읽을 수 없습니다."))
      }

      reader.onerror = () => {
        reject(new Error("이미지를 읽는 중 오류가 발생했습니다."))
      }

      reader.readAsDataURL(file)
    })
  }

  const saveProfile = async (payload: {
    profile_text?: string
    profile_image_url?: string | null
  }) => {
    const response = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("프로필 저장에 실패했습니다.")
    }

    const data = (await response.json()) as { profile?: Profile | null }

    if (data.profile) {
      setProfile(data.profile)
    }

    return data.profile ?? null
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      const imageUrl = await readFileAsDataUrl(file)
      await saveProfile({ profile_image_url: imageUrl })
    } catch (error) {
      console.error("Image upload error:", error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveText = async () => {
    setIsSaving(true)
    try {
      const savedProfile = await saveProfile({ profile_text: profileText })
      if (savedProfile) {
        setIsEditing(false)
      }
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const applyFontSize = (size: number) => {
    const selection = window.getSelection()
    if (!selection || selection.rangeCount === 0) return

    const range = selection.getRangeAt(0)
    if (range.collapsed) return

    const span = document.createElement("span")
    span.style.fontSize = `${size}px`
    span.appendChild(range.extractContents())
    range.insertNode(span)
    selection.removeAllRanges()
    selection.addRange(range)

    if (editorRef.current) {
      setProfileText(editorRef.current.innerHTML)
    }
  }

  const toggleBold = () => {
    document.execCommand("bold")
    if (editorRef.current) {
      setProfileText(editorRef.current.innerHTML)
    }
  }

  return (
    <section
      className="netflix-shell relative isolate mx-auto max-w-4xl overflow-hidden rounded-[2rem] p-6 md:p-10"
    >

      <div className="relative z-10 mb-6 flex items-start justify-between gap-3">
        <div>
          <p
            className="inline-flex items-center gap-2 rounded-full bg-[#e50914] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white"
          >
            PROFILE CUT
            <Sparkles className="size-3" />
          </p>
            <h1 className="netflix-display netflix-title-glow mt-3 text-4xl text-white md:text-5xl">
            작가 프로필
          </h1>
        </div>
        {!isEditing && (
          <Button
            onClick={handleEditClick}
            className="border border-[#e50914]/60 bg-[#e50914] text-white shadow-[0_16px_40px_rgba(229,9,20,0.35)] hover:bg-[#f6121d]"
          >
            <Edit className="mr-2 size-4" />
            편집
          </Button>
        )}
      </div>

      <Card className="netflix-card relative z-10 border border-white/10 bg-[#141414]">
        <CardHeader>
          <CardTitle className="text-2xl text-white">프로필 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative size-40 overflow-hidden rounded-full border border-white/15 bg-[#101010] shadow-[0_12px_35px_rgba(0,0,0,0.45)]">
              {profile?.profile_image_url ? (
                <Image
                  src={profile.profile_image_url}
                  alt="프로필 이미지"
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="flex size-full items-center justify-center">
                  <User className="size-16 text-white/40" />
                </div>
              )}
            </div>
            {isEditing && (
              <div>
                <input
                  type="file"
                  id="profile-image"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Button
                  asChild
                  disabled={isUploading}
                  className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
                >
                  <label htmlFor="profile-image" className="cursor-pointer">
                    <Upload className="mr-2 size-4" />
                    {isUploading ? "업로드 중..." : "이미지 업로드"}
                  </label>
                </Button>
              </div>
            )}
          </div>

          <FieldGroup>
            <Field>
              <FieldLabel className="text-white/80">소개글</FieldLabel>
              {isEditing ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3 text-xs text-white/60">
                    <span>글자 크기</span>
                    <select
                      value={fontSize}
                      onChange={(e) => setFontSize(Number(e.target.value))}
                      className="rounded-md border border-white/15 bg-[#101010] px-2 py-1 text-white"
                    >
                      {[12, 14, 16, 18, 20, 24, 28].map((size) => (
                        <option key={size} value={size}>
                          {size}px
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      onClick={() => applyFontSize(fontSize)}
                      className="h-7 rounded-md border border-[#e50914]/60 bg-[#e50914] px-3 text-xs text-white hover:bg-[#f6121d]"
                    >
                      적용
                    </Button>
                    <Button
                      type="button"
                      onClick={toggleBold}
                      className="h-7 rounded-md border border-white/20 bg-[#141414] px-3 text-xs text-white hover:bg-[#1f1f1f]"
                    >
                      굵게
                    </Button>
                    <span className="text-white/40">원하는 구간을 드래그 후 적용</span>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    onInput={(e) => setProfileText(e.currentTarget.innerHTML)}
                    className="min-h-40 rounded-md border border-white/15 bg-[#101010] p-4 text-white outline-none placeholder:text-white/40"
                    data-placeholder="작가 소개글을 작성하세요..."
                    suppressContentEditableWarning
                  />
                </div>
              ) : (
                <div
                  className="min-h-24 whitespace-pre-wrap break-words rounded-md border border-white/10 bg-[#101010] p-4 text-white"
                >
                  {profile?.profile_text ? (
                    <div
                      className="prose prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: profile.profile_text }}
                    />
                  ) : (
                    <span className="text-white/50">소개글이 없습니다.</span>
                  )}
                </div>
              )}
            </Field>
          </FieldGroup>

          {isEditing && (
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false)
                  setProfileText(profile?.profile_text || "")
                }}
                className="border border-white/15 bg-transparent text-white hover:bg-white/10"
              >
                취소
              </Button>
              <Button
                onClick={handleSaveText}
                disabled={isSaving}
                className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
              >
                {isSaving ? "저장 중..." : "저장"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <AdminPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onSuccess={handlePasswordSuccess}
      />
    </section>
  )
}
