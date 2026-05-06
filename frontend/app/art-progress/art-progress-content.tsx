"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Plus, Upload, X, ImageIcon, ChevronLeft, ChevronRight, Sparkles, Trash2 } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import type { ArtProgress, Comment } from "@/lib/types"
import { YEAR_CATEGORIES } from "@/lib/types"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AdminPasswordDialog } from "@/components/admin-password-dialog"
import { CommentSection } from "@/components/comment-section"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

interface ArtProgressContentProps {
  initialArtProgress: ArtProgress[]
  initialComments: Comment[]
}


export function ArtProgressContent({
  initialArtProgress,
  initialComments,
}: ArtProgressContentProps) {
  const searchParams = useSearchParams()
  const [artProgress, setArtProgress] = useState<ArtProgress[]>(initialArtProgress)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [selectedArt, setSelectedArt] = useState<ArtProgress | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState("")
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const getDefaultTab = (value?: string | null) => {
    const fallback = YEAR_CATEGORIES[0]?.value ?? ""
    if (!value) return fallback
    return YEAR_CATEGORIES.some((item) => item.value === value) ? value : fallback
  }
  const [activeTab, setActiveTab] = useState<string>(() =>
    getDefaultTab(searchParams.get("year"))
  )

  // Form state
  const [title, setTitle] = useState("")
  const [yearCategory, setYearCategory] = useState<string>("")
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleAddClick = () => {
    setShowPasswordDialog(true)
  }

  const handleDeleteClick = () => {
    setShowDeletePasswordDialog(true)
  }

  const handlePasswordSuccess = () => {
    setShowAddDialog(true)
  }

  const handleDeletePasswordSuccess = () => {
    setDeleteTargetId(artProgress[0]?.id ?? "")
    setShowDeleteDialog(true)
  }

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

  const createOptimizedDataUrl = (file: File, maxSize = 1400) => {
    return new Promise<string>((resolve, reject) => {
      const image = new window.Image()

      image.onload = () => {
        const width = image.naturalWidth
        const height = image.naturalHeight

        if (!width || !height) {
          reject(new Error("이미지 크기를 확인할 수 없습니다."))
          return
        }

        const scale = Math.min(1, maxSize / Math.max(width, height))
        const targetWidth = Math.round(width * scale)
        const targetHeight = Math.round(height * scale)

        const canvas = document.createElement("canvas")
        canvas.width = targetWidth
        canvas.height = targetHeight

        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("이미지 캔버스를 생성할 수 없습니다."))
          return
        }

        context.drawImage(image, 0, 0, targetWidth, targetHeight)
        resolve(canvas.toDataURL("image/jpeg", 0.82))
      }

      image.onerror = () => {
        reject(new Error("이미지를 처리하지 못했습니다."))
      }

      readFileAsDataUrl(file)
        .then((dataUrl) => {
          image.src = dataUrl
        })
        .catch(reject)
    })
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setIsUploading(true)
    try {
      const urls = await Promise.all(Array.from(files).map(createOptimizedDataUrl))
      setUploadedImages((prev) => [...prev, ...urls])
    } catch (error) {
      console.error("Image upload error:", error)
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    }
  }

  const handleRemoveImage = (index: number) => {
    setUploadedImages(uploadedImages.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!title.trim() || !yearCategory || uploadedImages.length === 0) return

    setIsSaving(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/art-progress`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          thumbnail_url: uploadedImages[0],
          images: uploadedImages,
          year_category: yearCategory,
        }),
      })

      if (!response.ok) {
        throw new Error("작품 저장에 실패했습니다.")
      }

      const payload = (await response.json()) as { artProgress?: ArtProgress }

      if (payload.artProgress) {
        setArtProgress((prev) => [payload.artProgress as ArtProgress, ...prev])
        setShowAddDialog(false)
        resetForm()
      }
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteArt = async () => {
    if (!deleteTargetId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/art-progress/${deleteTargetId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("작품 삭제에 실패했습니다.")
      }

      const payload = (await response.json()) as { deletedId?: string }
      const deletedId = payload.deletedId ?? deleteTargetId

      setArtProgress((prev) => prev.filter((art) => art.id !== deletedId))
      setComments((prev) =>
        prev.filter(
          (comment) =>
            !(comment.content_type === "art_progress" && comment.content_id === deletedId),
        ),
      )
      setSelectedArt((prev) => (prev?.id === deletedId ? null : prev))
      setCurrentImageIndex(0)
      setDeleteTargetId("")
      setShowDeleteDialog(false)
    } catch (error) {
      console.error("Delete error:", error)
    } finally {
      setIsDeleting(false)
    }
  }

  const resetForm = () => {
    setTitle("")
    setYearCategory("")
    setUploadedImages([])
  }

  const handleArtClick = async (art: ArtProgress) => {
    setSelectedArt(art)
    setCurrentImageIndex(0)
    if (art.images.length > 0) return

    setDetailLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/art-progress/${art.id}`)
      if (!response.ok) {
        throw new Error("작품 정보를 불러오지 못했습니다.")
      }
      const payload = (await response.json()) as { artProgress?: ArtProgress }
      if (payload.artProgress) {
        setSelectedArt(payload.artProgress)
      }
    } catch (error) {
      console.error("Art detail load error:", error)
    } finally {
      setDetailLoading(false)
    }
  }

  const getCommentsForArt = (artId: string) => {
    return comments.filter((c) => c.content_id === artId)
  }

  const getFilteredArt = () => {
    return artProgress.filter((art) => art.year_category === activeTab)
  }

  const nextImage = () => {
    if (selectedArt) {
      setCurrentImageIndex((prev) =>
        prev < selectedArt.images.length - 1 ? prev + 1 : 0
      )
    }
  }

  const prevImage = () => {
    if (selectedArt) {
      setCurrentImageIndex((prev) =>
        prev > 0 ? prev - 1 : selectedArt.images.length - 1
      )
    }
  }

  const getYearLabel = (value: string) => {
    return YEAR_CATEGORIES.find((c) => c.value === value)?.label || value
  }

  const getYearTone = (_value: ArtProgress["year_category"]) => {
    return "from-[#1c1c1c] via-[#141414] to-[#101010]"
  }

  useEffect(() => {
    setActiveTab(getDefaultTab(searchParams.get("year")))
  }, [searchParams])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedArt || selectedArt.images.length <= 1) return
      
      if (e.key === "ArrowLeft") {
        prevImage()
      } else if (e.key === "ArrowRight") {
        nextImage()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedArt, currentImageIndex])

  return (
    <section
      className="netflix-shell relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] p-6 md:p-10"
    >

      <div className="relative z-10 mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e50914] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
            GROWTH CUT
            <Sparkles className="size-3" />
          </p>
          <h1 className="netflix-display netflix-title-glow mt-3 text-4xl text-white md:text-5xl">
            그림 발전과정
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={handleAddClick}
            className="border border-[#e50914]/60 bg-[#e50914] text-white shadow-[0_16px_40px_rgba(229,9,20,0.35)] hover:bg-[#f6121d]"
          >
            <Plus className="mr-2 size-4" />
            작품 등록
          </Button>
          <Button
            onClick={handleDeleteClick}
            disabled={artProgress.length === 0}
            className="border border-white/15 bg-[#1f1f1f] text-white/80 hover:bg-[#2a2a2a] disabled:bg-[#151515] disabled:text-white/40"
          >
            <Trash2 className="mr-2 size-4" />
            작품 삭제
          </Button>
        </div>
      </div>

      {/* Year Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10 mb-6">
        <TabsList className="h-auto flex-wrap gap-2 rounded-xl border border-white/10 bg-[#141414] p-2">
          {YEAR_CATEGORIES.map((category) => (
            <TabsTrigger
              key={category.value}
              value={category.value}
              className="rounded-lg border border-transparent px-4 py-1.5 text-white/70 data-[state=active]:border-[#e50914]/60 data-[state=active]:bg-[#e50914] data-[state=active]:text-white"
            >
              {category.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {getFilteredArt().length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#141414] py-16">
              <ImageIcon className="mb-4 size-12 text-white/30" />
              <p className="text-white/60">등록된 작품이 없습니다.</p>
            </div>
          ) : (
            <div className="webtoon-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {getFilteredArt().map((art) => (
                <Card
                  key={art.id}
                  className={`netflix-card cursor-pointer overflow-hidden bg-gradient-to-br ${getYearTone(art.year_category)}`}
                  onClick={() => handleArtClick(art)}
                >
                  <div className="relative aspect-square">
                    {art.thumbnail_url ? (
                      <Image
                        src={art.thumbnail_url}
                        alt={art.title}
                        fill
                        className="object-cover"
                        loading="lazy"
                        sizes="(min-width: 1024px) 320px, (min-width: 640px) 45vw, 90vw"
                      />
                    ) : (
                      <div className="flex size-full items-center justify-center bg-muted">
                        <ImageIcon className="size-12 text-muted-foreground" />
                      </div>
                    )}
                    <span className="absolute right-2 top-2 rounded-full bg-[#e50914] px-2 py-1 text-xs text-white">
                      {getYearLabel(art.year_category)}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-2xl leading-tight text-white">{art.title}</h3>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Art Detail Modal */}
      <Dialog open={!!selectedArt} onOpenChange={() => setSelectedArt(null)}>
        <DialogContent className="max-h-[100dvh] w-full max-w-[100vw] overflow-y-auto border-0 bg-[#0b0b0b] text-white sm:max-w-[100vw] px-0 sm:px-0">
          {selectedArt && (
            <>
              <DialogHeader className="px-6 sm:px-10 pt-6">
                <DialogTitle className="flex items-center gap-2 text-3xl text-white">
                  {selectedArt.title}
                  <span className="rounded-full bg-[#e50914] px-2 py-0.5 text-sm font-normal text-white">
                    {getYearLabel(selectedArt.year_category)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Image Carousel */}
              {selectedArt.images.length > 0 && (
                <div className="relative w-full bg-black mt-4 pb-8">
                  <div className="relative w-full min-h-[75vh]">
                    <Image
                      src={selectedArt.images[currentImageIndex]}
                      alt={`${selectedArt.title} - ${currentImageIndex + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                  {selectedArt.images.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute left-6 top-1/2 z-10 h-16 w-16 -translate-y-1/2 rounded-md border-2 border-[#e50914] bg-transparent text-[#e50914] hover:bg-[#e50914]/10"
                        onClick={prevImage}
                      >
                        <ChevronLeft className="size-8" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="absolute right-6 top-1/2 z-10 h-16 w-16 -translate-y-1/2 rounded-md border-2 border-[#e50914] bg-transparent text-[#e50914] hover:bg-[#e50914]/10"
                        onClick={nextImage}
                      >
                        <ChevronRight className="size-8" />
                      </Button>
                    </>
                  )}
                </div>
              )}
              {selectedArt.images.length === 0 && detailLoading && (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">이미지를 불러오는 중...</p>
                </div>
              )}
              {selectedArt.images.length === 0 && !detailLoading && (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">등록된 이미지가 없습니다.</p>
                </div>
              )}

              {/* Comments */}
              <div className="px-6 sm:px-10 pb-6 w-full max-w-6xl mx-auto">
                <CommentSection
                  contentType="art_progress"
                  contentId={selectedArt.id}
                  initialComments={getCommentsForArt(selectedArt.id)}
                />
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Art Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border border-white/10 bg-[#0f0f0f] text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl text-white">새 작품 등록</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="art-title" className="text-white/80">제목</FieldLabel>
              <Input
                id="art-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="작품 제목"
                className="border border-white/15 bg-[#101010] text-white placeholder:text-white/40"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="year-category" className="text-white/80">연도 카테고리</FieldLabel>
              <Select value={yearCategory} onValueChange={setYearCategory}>
                <SelectTrigger id="year-category" className="border border-white/15 bg-[#101010] text-white">
                  <SelectValue placeholder="연도 선택" />
                </SelectTrigger>
                <SelectContent>
                  {YEAR_CATEGORIES.map((category) => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel className="text-white/80">이미지 업로드</FieldLabel>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
                <Button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="w-full border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
                >
                  <Upload className="mr-2 size-4" />
                  {isUploading ? "업로드 중..." : "이미지 선택"}
                </Button>

                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {uploadedImages.map((url, index) => (
                      <div key={index} className="group relative aspect-square">
                        <Image
                          src={url}
                          alt={`업로드 이미지 ${index + 1}`}
                          fill
                          className="rounded-md object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#e50914] px-1.5 py-0.5 text-xs text-white">
                            썸네일
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
          </FieldGroup>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
              className="border border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              취소
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !yearCategory || uploadedImages.length === 0}
              className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
            >
              {isSaving ? "저장 중..." : "등록"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Art Dialog */}
      <Dialog
        open={showDeleteDialog}
        onOpenChange={(open) => {
          setShowDeleteDialog(open)
          if (!open) {
            setDeleteTargetId("")
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto border border-white/10 bg-[#0f0f0f] text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl text-white">작품 삭제</DialogTitle>
          </DialogHeader>

          {artProgress.length === 0 ? (
            <p className="text-white/70">삭제할 작품이 없습니다.</p>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="art-delete-target" className="text-white/80">삭제할 작품</FieldLabel>
                <Select value={deleteTargetId} onValueChange={setDeleteTargetId}>
                  <SelectTrigger id="art-delete-target" className="border border-white/15 bg-[#101010] text-white">
                    <SelectValue placeholder="작품 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {artProgress.map((art) => (
                      <SelectItem key={art.id} value={art.id}>
                        [{getYearLabel(art.year_category)}] {art.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </FieldGroup>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setDeleteTargetId("")
              }}
              className="border border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              취소
            </Button>
            <Button
              onClick={handleDeleteArt}
              disabled={isDeleting || !deleteTargetId}
              className="border border-white/10 bg-[#1f1f1f] text-white/80 hover:bg-[#2a2a2a] disabled:bg-[#151515] disabled:text-white/40"
            >
              {isDeleting ? "삭제 중..." : "삭제"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AdminPasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        onSuccess={handlePasswordSuccess}
        description="게시글을 등록하려면 관리자 비밀번호를 입력하세요."
      />

      <AdminPasswordDialog
        open={showDeletePasswordDialog}
        onOpenChange={setShowDeletePasswordDialog}
        onSuccess={handleDeletePasswordSuccess}
        description="게시글을 삭제하려면 관리자 비밀번호를 입력하세요."
      />
    </section>
  )
}
