"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Plus, Upload, X, ImageIcon, Sparkles, Trash2 } from "lucide-react"
import { useSearchParams } from "next/navigation"
import { API_BASE_URL } from "@/lib/api"
import { GENRE_CATEGORIES, type Genre, type Comment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
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

interface GenreContentProps {
  initialGenres: Genre[]
  initialComments: Comment[]
}

type ThumbnailFocus = {
  x: number
  y: number
}

const DEFAULT_THUMBNAIL_FOCUS: ThumbnailFocus = {
  x: 50,
  y: 50,
}

const THUMBNAIL_SIZE = 600
const UPLOAD_MAX_SIZE = 1400


export function GenreContent({ initialGenres, initialComments }: GenreContentProps) {
  const searchParams = useSearchParams()
  const [genres, setGenres] = useState<Genre[]>(initialGenres)
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [selectedGenre, setSelectedGenre] = useState<Genre | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeletePasswordDialog, setShowDeletePasswordDialog] = useState(false)
  const [deleteTargetId, setDeleteTargetId] = useState("")
  const getDefaultTab = (value?: string | null) => {
    const fallback = GENRE_CATEGORIES[0]?.value ?? "action"
    if (!value) return fallback
    return GENRE_CATEGORIES.some((item) => item.value === value) ? value : fallback
  }
  const [activeTab, setActiveTab] = useState<string>(() =>
    getDefaultTab(searchParams.get("category"))
  )
  const [thumbnailSourceIndex, setThumbnailSourceIndex] = useState(0)
  const [thumbnailFocus, setThumbnailFocus] = useState<ThumbnailFocus>({
    ...DEFAULT_THUMBNAIL_FOCUS,
  })

  useEffect(() => {
    setActiveTab(getDefaultTab(searchParams.get("category")))
  }, [searchParams])

  // Form state
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState<Genre["category"]>("action")
  const [description, setDescription] = useState("")
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
    setDeleteTargetId(genres[0]?.id ?? "")
    setShowDeleteDialog(true)
  }

  const clampPercent = (value: number) => {
    return Math.max(0, Math.min(100, value))
  }

  const createThumbnailDataUrl = (
    sourceUrl: string,
    focus: ThumbnailFocus,
  ) => {
    return new Promise<string>((resolve, reject) => {
      const image = new window.Image()

      image.onload = () => {
        const width = image.naturalWidth
        const height = image.naturalHeight

        if (!width || !height) {
          reject(new Error("썸네일 원본 크기를 확인할 수 없습니다."))
          return
        }

        const cropSize = Math.min(width, height)
        const centerX = (clampPercent(focus.x) / 100) * width
        const centerY = (clampPercent(focus.y) / 100) * height

        let cropStartX = centerX - cropSize / 2
        let cropStartY = centerY - cropSize / 2

        cropStartX = Math.max(0, Math.min(cropStartX, width - cropSize))
        cropStartY = Math.max(0, Math.min(cropStartY, height - cropSize))

        const canvas = document.createElement("canvas")
        canvas.width = THUMBNAIL_SIZE
        canvas.height = THUMBNAIL_SIZE

        const context = canvas.getContext("2d")
        if (!context) {
          reject(new Error("썸네일 캔버스를 생성할 수 없습니다."))
          return
        }

        context.drawImage(
          image,
          cropStartX,
          cropStartY,
          cropSize,
          cropSize,
          0,
          0,
          THUMBNAIL_SIZE,
          THUMBNAIL_SIZE,
        )

        resolve(canvas.toDataURL("image/jpeg", 0.92))
      }

      image.onerror = () => {
        reject(new Error("썸네일 이미지를 생성하지 못했습니다."))
      }

      image.src = sourceUrl
    })
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

  const createOptimizedDataUrl = (file: File, maxSize = UPLOAD_MAX_SIZE) => {
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
      if (uploadedImages.length === 0) {
        setThumbnailSourceIndex(0)
        setThumbnailFocus({ ...DEFAULT_THUMBNAIL_FOCUS })
      }
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
    const nextImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(nextImages)

    if (nextImages.length === 0) {
      setThumbnailSourceIndex(0)
      setThumbnailFocus({ ...DEFAULT_THUMBNAIL_FOCUS })
      return
    }

    if (index === thumbnailSourceIndex) {
      setThumbnailSourceIndex(Math.min(index, nextImages.length - 1))
      setThumbnailFocus({ ...DEFAULT_THUMBNAIL_FOCUS })
      return
    }

    if (index < thumbnailSourceIndex) {
      setThumbnailSourceIndex(thumbnailSourceIndex - 1)
    }
  }

  const handleSelectThumbnailSource = (index: number) => {
    setThumbnailSourceIndex(index)
    setThumbnailFocus({ ...DEFAULT_THUMBNAIL_FOCUS })
  }

  const handleThumbnailPreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100

    setThumbnailFocus({
      x: clampPercent(x),
      y: clampPercent(y),
    })
  }

  const handleSave = async () => {
    if (!title.trim() || uploadedImages.length === 0) return

    setIsSaving(true)
    try {
      const sourceIndex = Math.min(thumbnailSourceIndex, uploadedImages.length - 1)
      const thumbnailSource = uploadedImages[sourceIndex] || uploadedImages[0]
      let thumbnailUrl = thumbnailSource

      try {
        thumbnailUrl = await createThumbnailDataUrl(thumbnailSource, thumbnailFocus)
      } catch (error) {
        console.error("Thumbnail generation error:", error)
      }

      const response = await fetch(`${API_BASE_URL}/api/genres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          category,
          description: description.trim() || null,
          thumbnail_url: thumbnailUrl,
          images: uploadedImages,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        const message = errorText || "작품 저장에 실패했습니다."
        throw new Error(message)
      }

      const payload = (await response.json()) as { genre?: Genre }

      if (payload.genre) {
        setGenres((prev) => [payload.genre as Genre, ...prev])
        setShowAddDialog(false)
        resetForm()
      }
    } catch (error) {
      console.error("Save error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteGenre = async () => {
    if (!deleteTargetId) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/genres/${deleteTargetId}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("작품 삭제에 실패했습니다.")
      }

      const payload = (await response.json()) as { deletedId?: string }
      const deletedId = payload.deletedId ?? deleteTargetId

      setGenres((prev) => prev.filter((genre) => genre.id !== deletedId))
      setComments((prev) =>
        prev.filter(
          (comment) => !(comment.content_type === "genre" && comment.content_id === deletedId),
        ),
      )
      setSelectedGenre((prev) => (prev?.id === deletedId ? null : prev))
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
    setCategory("action")
    setDescription("")
    setUploadedImages([])
    setThumbnailSourceIndex(0)
    setThumbnailFocus({ ...DEFAULT_THUMBNAIL_FOCUS })
  }

  const handleGenreClick = async (genre: Genre) => {
    setSelectedGenre(genre)
    if (genre.images.length > 0) return

    setDetailLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/genres/${genre.id}`)
      if (!response.ok) {
        throw new Error("작품 정보를 불러오지 못했습니다.")
      }
      const payload = (await response.json()) as { genre?: Genre }
      if (payload.genre) {
        setSelectedGenre(payload.genre)
      }
    } catch (error) {
      console.error("Genre detail load error:", error)
    } finally {
      setDetailLoading(false)
    }
  }

  const getCommentsForGenre = (genreId: string) => {
    return comments.filter((c) => c.content_id === genreId)
  }

  const getFilteredGenres = () => {
    return genres.filter((genre) => genre.category === activeTab)
  }

  const getCategoryLabel = (value: Genre["category"]) => {
    return GENRE_CATEGORIES.find((item) => item.value === value)?.label || value
  }

  const getCategoryTone = (_value: Genre["category"]) => {
    return "from-[#1c1c1c] via-[#141414] to-[#101010]"
  }

  return (
    <section
      className="netflix-shell relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] p-6 md:p-10"
    >

      <div className="relative z-10 mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-[#e50914] px-3 py-1 text-xs font-semibold uppercase tracking-[0.25em] text-white">
            WEBTOON CUT
            <Sparkles className="size-3" />
          </p>
          <h1 className="netflix-display netflix-title-glow mt-3 text-4xl text-white md:text-5xl">
            웹툰
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
            disabled={genres.length === 0}
            className="border border-white/15 bg-[#1f1f1f] text-white/80 hover:bg-[#2a2a2a] disabled:bg-[#151515] disabled:text-white/40"
          >
            <Trash2 className="mr-2 size-4" />
            작품 삭제
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative z-10 mb-6">
        <TabsList className="h-auto flex-wrap gap-2 rounded-xl border border-white/10 bg-[#141414] p-2">
          {GENRE_CATEGORIES.map((item) => (
            <TabsTrigger
              key={item.value}
              value={item.value}
              className="rounded-lg border border-transparent px-4 py-1.5 text-white/70 data-[state=active]:border-[#e50914]/60 data-[state=active]:bg-[#e50914] data-[state=active]:text-white"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {getFilteredGenres().length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/15 bg-[#141414] py-16">
              <ImageIcon className="mb-4 size-12 text-white/30" />
              <p className="text-white/60">등록된 작품이 없습니다.</p>
            </div>
          ) : (
            <div className="webtoon-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {getFilteredGenres().map((genre) => (
                <Card
                  key={genre.id}
                  className={`netflix-card cursor-pointer overflow-hidden bg-gradient-to-br ${getCategoryTone(genre.category)}`}
                  onClick={() => handleGenreClick(genre)}
                >
                  <div className="relative aspect-square">
                    {genre.thumbnail_url ? (
                      <Image
                        src={genre.thumbnail_url}
                        alt={genre.title}
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
                      {getCategoryLabel(genre.category)}
                    </span>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="text-2xl leading-tight text-white">{genre.title}</h3>
                    {genre.description && (
                      <p className="mt-1 line-clamp-2 text-sm text-white/70">
                        {genre.description}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Genre Detail Modal */}
      <Dialog open={!!selectedGenre} onOpenChange={() => setSelectedGenre(null)}>
        <DialogContent className="h-[100dvh] max-h-[100dvh] w-[100vw] max-w-[100vw] overflow-y-auto border-0 bg-[#0b0b0b] px-0 text-white sm:px-0">
          {selectedGenre && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-3xl text-white">
                  {selectedGenre.title}
                  <span className="rounded-full bg-[#e50914] px-2 py-0.5 text-sm font-normal text-white">
                    {getCategoryLabel(selectedGenre.category)}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {/* Webtoon Scroll View */}
              {selectedGenre.images.length > 0 ? (
                <div className="bg-black p-0">
                  <div className="max-h-[92dvh] overflow-y-auto bg-black p-0">
                    <div className="flex w-full flex-col gap-0">
                      {selectedGenre.images.map((imageUrl, index) => (
                        <div key={`${selectedGenre.id}-${index}`} className="bg-black">
                          <Image
                            src={imageUrl}
                            alt={`${selectedGenre.title} - ${index + 1}`}
                            width={1200}
                            height={1700}
                            className="block h-auto w-full object-contain"
                            sizes="100vw"
                            priority={index === 0}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : detailLoading ? (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">이미지를 불러오는 중...</p>
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">등록된 이미지가 없습니다.</p>
                </div>
              )}

              {/* Description */}
              {selectedGenre.description && (
                <div className="rounded-lg border border-white/10 bg-[#141414] p-4">
                  <p className="text-white/80">{selectedGenre.description}</p>
                </div>
              )}

              {/* Comments */}
              <CommentSection
                contentType="genre"
                contentId={selectedGenre.id}
                initialComments={getCommentsForGenre(selectedGenre.id)}
              />
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Genre Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border border-white/10 bg-[#0f0f0f] text-white">
          <DialogHeader>
            <DialogTitle className="text-3xl text-white">새 작품 등록</DialogTitle>
          </DialogHeader>

          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="genre-title" className="text-white/80">제목</FieldLabel>
              <Input
                id="genre-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="작품 제목"
                className="border border-white/15 bg-[#101010] text-white placeholder:text-white/40"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="genre-category" className="text-white/80">카테고리</FieldLabel>
              <Select
                value={category}
                onValueChange={(value) => setCategory(value as Genre["category"])}
              >
                <SelectTrigger id="genre-category" className="border border-white/15 bg-[#101010] text-white">
                  <SelectValue placeholder="카테고리 선택" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_CATEGORIES.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="genre-description" className="text-white/80">장르 소개글</FieldLabel>
              <Textarea
                id="genre-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="작품에 대한 설명을 작성하세요..."
                rows={4}
                className="border border-white/15 bg-[#101010] text-white placeholder:text-white/40"
              />
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
                      <div
                        key={index}
                        className={`group relative aspect-square cursor-pointer overflow-hidden rounded-md border ${
                          index === thumbnailSourceIndex
                            ? "border-[#e50914]"
                            : "border-white/10"
                        }`}
                        onClick={() => handleSelectThumbnailSource(index)}
                      >
                        <Image
                          src={url}
                          alt={`업로드 이미지 ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveImage(index)
                          }}
                          className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="size-3" />
                        </button>
                        {index === thumbnailSourceIndex && (
                          <span className="absolute bottom-1 left-1 rounded bg-[#e50914] px-1.5 py-0.5 text-xs text-white">
                            썸네일 기준
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {uploadedImages.length > 0 && (
                  <div className="space-y-3 rounded-lg border border-white/10 bg-[#141414] p-3">
                    <p className="text-sm text-white/80">
                      썸네일 위치 선택 (미리보기를 클릭하거나 슬라이더로 조정)
                    </p>

                    <div
                      className="relative mx-auto aspect-square w-full max-w-xs cursor-crosshair overflow-hidden rounded-md border border-white/10 bg-black"
                      onClick={handleThumbnailPreviewClick}
                    >
                      <Image
                        src={uploadedImages[thumbnailSourceIndex] || uploadedImages[0]}
                        alt="썸네일 미리보기"
                        fill
                        className="object-cover"
                        style={{
                          objectPosition: `${thumbnailFocus.x}% ${thumbnailFocus.y}%`,
                        }}
                      />
                      <div className="pointer-events-none absolute left-1/2 top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/90 bg-black/30" />
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="space-y-1 text-xs text-white/60">
                        가로 위치 {Math.round(thumbnailFocus.x)}%
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={thumbnailFocus.x}
                          onChange={(e) =>
                            setThumbnailFocus((prev) => ({
                              ...prev,
                              x: Number(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </label>

                      <label className="space-y-1 text-xs text-white/60">
                        세로 위치 {Math.round(thumbnailFocus.y)}%
                        <input
                          type="range"
                          min={0}
                          max={100}
                          value={thumbnailFocus.y}
                          onChange={(e) =>
                            setThumbnailFocus((prev) => ({
                              ...prev,
                              y: Number(e.target.value),
                            }))
                          }
                          className="w-full"
                        />
                      </label>
                    </div>
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
              disabled={isSaving || !title.trim() || uploadedImages.length === 0}
              className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
            >
              {isSaving ? "저장 중..." : "등록"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Genre Dialog */}
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

          {genres.length === 0 ? (
            <p className="text-white/70">삭제할 작품이 없습니다.</p>
          ) : (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="genre-delete-target" className="text-white/80">삭제할 작품</FieldLabel>
                <Select value={deleteTargetId} onValueChange={setDeleteTargetId}>
                  <SelectTrigger id="genre-delete-target" className="border border-white/15 bg-[#101010] text-white">
                    <SelectValue placeholder="작품 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {genres.map((genre) => (
                      <SelectItem key={genre.id} value={genre.id}>
                        [{getCategoryLabel(genre.category)}] {genre.title}
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
              onClick={handleDeleteGenre}
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
