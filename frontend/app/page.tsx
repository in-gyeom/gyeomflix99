"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { User, Palette, TrendingUp, Sparkles } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { API_BASE_URL } from "@/lib/api"
import type { ArtProgress } from "@/lib/types"

const categories = [
  {
    id: "profile",
    title: "작가 프로필",
    description: "작가의 세계관과 캐릭터 같은 작업 철학을 한눈에 만나보세요.",
    href: "/profile",
    icon: User,
    burst: "Profile",
    cardTone: "from-[#141414] via-[#141414] to-[#101010]",
    burstTone: "netflix-badge",
    heroImage: null,
  },
  {
    id: "webtoon",
    title: "웹툰",
    description: "액션과 개그로 분류된 작품을 넘기며 만화책처럼 감상해보세요.",
    href: "/genre",
    icon: Palette,
    burst: "Webtoon",
    cardTone: "from-[#141414] via-[#141414] to-[#101010]",
    burstTone: "netflix-badge",
    heroImage: {
      src: "/placeholder.jpg",
      alt: "웹툰 대표 이미지",
    },
  },
  {
    id: "growth",
    title: "그림 발전과정",
    description: "연도별 컷을 따라가며 드로잉이 진화하는 과정을 확인하세요.",
    href: "/art-progress",
    icon: TrendingUp,
    burst: "Growth",
    cardTone: "from-[#141414] via-[#141414] to-[#101010]",
    burstTone: "netflix-badge",
    heroImage: {
      src: "/placeholder-user.jpg",
      alt: "그림 발전과정 대표 이미지",
    },
  },
]

const HERO_IMAGE_KEYS = {
  webtoon: "home.hero.webtoon",
  growth: "home.hero.growth",
  feature: "home.hero.feature",
  feature2: "home.hero.feature2",
} as const

type HeroKey = keyof typeof HERO_IMAGE_KEYS

export default function HomePage() {
  const [heroImages, setHeroImages] = useState<Record<HeroKey, string | null>>({
    webtoon: null,
    growth: null,
    feature: null,
    feature2: null,
  })
  const [homeArtProgress, setHomeArtProgress] = useState<ArtProgress[]>([])
  const [artLoading, setArtLoading] = useState(true)
  const [heroIndex, setHeroIndex] = useState(0)
  const [yearPages, setYearPages] = useState<Record<string, number>>({
    "2025": 0,
    "2024": 0,
    "2023": 0,
  })
  const [yearTransitions, setYearTransitions] = useState<Record<string, boolean>>({
    "2025": false,
    "2024": false,
    "2023": false,
  })
  const [selectedHomeArt, setSelectedHomeArt] = useState<ArtProgress | null>(null)
  const [homeArtIndex, setHomeArtIndex] = useState(0)
  const [homeArtLoading, setHomeArtLoading] = useState(false)
  const [homeArtTransitioning, setHomeArtTransitioning] = useState(false)
  const webtoonInputRef = useRef<HTMLInputElement>(null)
  const growthInputRef = useRef<HTMLInputElement>(null)
  const featureInputRef = useRef<HTMLInputElement>(null)
  const feature2InputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const nextImages: Record<HeroKey, string | null> = {
      webtoon: null,
      growth: null,
      feature: null,
      feature2: null,
    }

    ;(Object.keys(HERO_IMAGE_KEYS) as HeroKey[]).forEach((key) => {
      const stored = localStorage.getItem(HERO_IMAGE_KEYS[key])
      nextImages[key] = stored || null
    })

    setHeroImages(nextImages)
  }, [])

  useEffect(() => {
    let cancelled = false

    const loadArtProgress = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/art-progress?summary=1`)
        if (!response.ok) {
          throw new Error("art-progress fetch failed")
        }
        const payload = (await response.json()) as { artProgress?: ArtProgress[] }
        if (!cancelled) {
          setHomeArtProgress(payload.artProgress || [])
        }
      } catch (error) {
        console.error("Home art progress load error:", error)
      } finally {
        if (!cancelled) setArtLoading(false)
      }
    }

    loadArtProgress()
    return () => {
      cancelled = true
    }
  }, [])

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

  const createOptimizedDataUrl = (file: File, maxSize = 1600) => {
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

  const handleHeroImageChange = async (key: HeroKey, file?: File | null) => {
    if (!file) return

    try {
      const url = await createOptimizedDataUrl(file)
      setHeroImages((prev) => ({ ...prev, [key]: url }))
      try {
        localStorage.setItem(HERO_IMAGE_KEYS[key], url)
      } catch (storageError) {
        console.warn("Hero image storage skipped:", storageError)
      }
    } catch (error) {
      console.error("Hero image upload error:", error)
    }
  }

  const handleHeroImageRemove = (key: HeroKey) => {
    setHeroImages((prev) => ({ ...prev, [key]: null }))
    localStorage.removeItem(HERO_IMAGE_KEYS[key])
  }

  const triggerInput = (key: HeroKey) => {
    if (key === "webtoon") webtoonInputRef.current?.click()
    if (key === "growth") growthInputRef.current?.click()
    if (key === "feature") featureInputRef.current?.click()
    if (key === "feature2") feature2InputRef.current?.click()
  }


  const heroSlides = [
    {
      src: heroImages.feature || "/sonagi-hero.png.png",
      alt: "겸플릭스 메인 이미지",
      href: "/genre?category=action",
      label: "액션 웹툰 바로 보기",
    },
    {
      src: heroImages.feature2 || "/placeholder.jpg",
      alt: "겸플릭스 두 번째 메인 이미지",
      href: "/genre?category=comedy",
      label: "개그 웹툰 바로 보기",
    },
  ]

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setHeroIndex((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1))
    }, 5000)

    return () => window.clearInterval(intervalId)
  }, [heroSlides.length])

  useEffect(() => {
    if (!selectedHomeArt) return
    setHomeArtIndex(0)
  }, [selectedHomeArt])

  useEffect(() => {
    if (!selectedHomeArt) return
    setHomeArtTransitioning(true)
    const timeoutId = window.setTimeout(() => {
      setHomeArtTransitioning(false)
    }, 240)

    return () => window.clearTimeout(timeoutId)
  }, [homeArtIndex, selectedHomeArt])

  const handleHeroPrev = () => {
    setHeroIndex((prev) => (prev === 0 ? heroSlides.length - 1 : prev - 1))
  }

  const handleHeroNext = () => {
    setHeroIndex((prev) => (prev === heroSlides.length - 1 ? 0 : prev + 1))
  }

  const yearOrder = ["2025", "2024", "2023"] as const
  const itemsPerPage = 6
  const getYearItems = (year: string) => {
    return homeArtProgress.filter((item) => item.year_category === year)
  }

  const getPagedItems = (year: string) => {
    const items = getYearItems(year)
    const page = yearPages[year] || 0
    const start = page * itemsPerPage
    return items.slice(start, start + itemsPerPage)
  }

  const getPlaceholders = (year: string) => {
    const count = getPagedItems(year).length
    return Math.max(0, itemsPerPage - count)
  }

  const getMaxPage = (year: string) => {
    const total = getYearItems(year).length
    return Math.max(0, Math.ceil(total / itemsPerPage) - 1)
  }

  const handleYearPrev = (year: string) => {
    setYearTransitions((prev) => ({ ...prev, [year]: true }))
    setYearPages((prev) => ({
      ...prev,
      [year]: (prev[year] || 0) === 0 ? getMaxPage(year) : (prev[year] || 0) - 1,
    }))
    window.setTimeout(() => {
      setYearTransitions((prev) => ({ ...prev, [year]: false }))
    }, 220)
  }

  const handleYearNext = (year: string) => {
    setYearTransitions((prev) => ({ ...prev, [year]: true }))
    setYearPages((prev) => {
      const maxPage = getMaxPage(year)
      return {
        ...prev,
        [year]: (prev[year] || 0) >= maxPage ? 0 : (prev[year] || 0) + 1,
      }
    })
    window.setTimeout(() => {
      setYearTransitions((prev) => ({ ...prev, [year]: false }))
    }, 220)
  }

  const handleHomeArtClick = async (art: ArtProgress) => {
    setSelectedHomeArt(art)
    if (art.images.length > 0) return

    setHomeArtLoading(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/art-progress/${art.id}`)
      if (!response.ok) {
        throw new Error("art-progress fetch failed")
      }
      const payload = (await response.json()) as { artProgress?: ArtProgress }
      if (payload.artProgress) {
        setSelectedHomeArt(payload.artProgress)
      }
    } catch (error) {
      console.error("Home art detail load error:", error)
    } finally {
      setHomeArtLoading(false)
    }
  }

  const handleHomeArtPrev = () => {
    if (!selectedHomeArt || selectedHomeArt.images.length === 0) return
    setHomeArtIndex((prev) =>
      prev > 0 ? prev - 1 : selectedHomeArt.images.length - 1,
    )
  }

  const handleHomeArtNext = () => {
    if (!selectedHomeArt || selectedHomeArt.images.length === 0) return
    setHomeArtIndex((prev) =>
      prev < selectedHomeArt.images.length - 1 ? prev + 1 : 0,
    )
  }

  return (
    <section className="netflix-home">
      <div className="netflix-hero">
        {heroSlides.map((slide, index) => (
          <Link
            key={slide.href}
            href={slide.href}
            className={`absolute inset-0 z-0 transition-opacity duration-700 ${
              index === heroIndex ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-label={slide.label}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              className="object-cover object-[28%_center]"
              sizes="100vw"
              priority={index === 0}
            />
          </Link>
        ))}
        <div className="netflix-vignette pointer-events-none absolute inset-0" />
        <button
          type="button"
          onClick={handleHeroPrev}
          className="netflix-hero-arrow left-6"
          aria-label="이전 대표 이미지"
        >
          <span aria-hidden>←</span>
        </button>
        <button
          type="button"
          onClick={handleHeroNext}
          className="netflix-hero-arrow right-6"
          aria-label="다음 대표 이미지"
        >
          <span aria-hidden>→</span>
        </button>
        <div className="netflix-hero-content">
          <p className="netflix-display netflix-title-glow text-xs font-semibold uppercase tracking-[0.45em] text-[#e50914]">
            Portfolio
          </p>
          <input
            ref={featureInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleHeroImageChange("feature", e.target.files?.[0])}
          />
          <input
            ref={feature2InputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleHeroImageChange("feature2", e.target.files?.[0])}
          />
        </div>
      </div>


      <div className="netflix-rows">
        <input
          ref={webtoonInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleHeroImageChange("webtoon", e.target.files?.[0])}
        />
        <input
          ref={growthInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleHeroImageChange("growth", e.target.files?.[0])}
        />

        <div className="netflix-row">
          <div className="netflix-row-header">
            <h2 className="netflix-display text-xl text-white">카테고리</h2>
            <span className="text-xs text-white/50">Explore</span>
          </div>
          <div className="netflix-row-track">
            {categories.map((category) => (
              <Link key={category.href} href={category.href} className="netflix-row-card group">
                <Card className={`netflix-card netflix-tilt ${category.cardTone}`}>
                  {category.heroImage && (
                    <div className="netflix-image-ring netflix-thumb relative aspect-[16/9] w-full overflow-hidden rounded-none">
                      <Image
                        src={heroImages[category.id as HeroKey] || category.heroImage.src}
                        alt={category.heroImage.alt}
                        fill
                        className="object-cover transition-transform duration-300 group-hover:scale-105"
                        sizes="(min-width: 1024px) 420px, 80vw"
                      />
                    </div>
                  )}
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 text-white">
                          <category.icon className="size-5" />
                        </div>
                        <CardTitle className="text-xl font-semibold text-white">
                          {category.title}
                        </CardTitle>
                      </div>
                      <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] ${category.burstTone}`}>
                        {category.burst}
                      </span>
                    </div>
                    <CardDescription className="text-sm leading-relaxed text-white/70">
                      {category.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <span className="inline-flex items-center gap-2 text-sm font-semibold text-white">
                        자세히 보기
                        <Sparkles className="size-4" />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        <div className="netflix-row">
          <div className="netflix-row-header">
            <h2 className="netflix-display text-xl text-white">그림 발전과정</h2>
            <span className="text-xs text-white/50">2025 → 2024 → 2023</span>
          </div>
          {artLoading ? (
            <div className="text-sm text-white/60">이미지를 불러오는 중...</div>
          ) : (
            yearOrder.map((year) => (
              <div key={year} className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">{year}</h3>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => handleYearPrev(year)}
                      className="h-8 w-8 rounded-md border border-white/15 text-white/70 hover:text-white"
                      aria-label={`${year} 이전 페이지`}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => handleYearNext(year)}
                      className="h-8 w-8 rounded-md border border-white/15 text-white/70 hover:text-white"
                      aria-label={`${year} 다음 페이지`}
                    >
                      →
                    </button>
                    <Link href={`/art-progress?year=${year}`} className="text-xs text-white/50 hover:text-white">
                      모두 보기
                    </Link>
                  </div>
                </div>
                <div
                  className={`netflix-row-track transition-opacity duration-300 ${
                    yearTransitions[year] ? "opacity-50" : "opacity-100"
                  }`}
                >
                  {getYearItems(year).length === 0 ? (
                    <div className="text-sm text-white/40">등록된 이미지가 없습니다.</div>
                  ) : (
                    getPagedItems(year).map((art) => (
                      <button
                        key={art.id}
                        type="button"
                        onClick={() => handleHomeArtClick(art)}
                        className="netflix-row-card group text-left"
                      >
                        <Card className="netflix-card netflix-tilt overflow-hidden">
                          <div className="netflix-image-ring netflix-thumb relative aspect-[4/5] w-full overflow-hidden rounded-none">
                            {art.thumbnail_url ? (
                              <Image
                                src={art.thumbnail_url}
                                alt={art.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="(min-width: 1024px) 220px, 45vw"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center bg-black/40 text-white/40">
                                이미지 없음
                              </div>
                            )}
                          </div>
                          <CardContent className="p-3">
                            <p className="text-sm font-semibold text-white">{art.title}</p>
                          </CardContent>
                        </Card>
                      </button>
                    ))
                  )}
                  {getPlaceholders(year) > 0 &&
                    Array.from({ length: getPlaceholders(year) }).map((_, index) => (
                      <div
                        key={`placeholder-${year}-${index}`}
                        className="netflix-row-card invisible"
                      >
                        <div className="h-full w-full" />
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={!!selectedHomeArt} onOpenChange={() => setSelectedHomeArt(null)}>
        <DialogContent className="max-h-[100dvh] w-full max-w-[100vw] overflow-y-auto border-0 bg-[#0b0b0b] text-white sm:max-w-[100vw] px-0 sm:px-0">
          {selectedHomeArt && (
            <>
              <DialogHeader className="px-6 sm:px-10 pt-6">
                <DialogTitle className="flex items-center gap-2 text-3xl text-white">
                  {selectedHomeArt.title}
                  <span className="rounded-full bg-[#e50914] px-2 py-0.5 text-sm font-normal text-white">
                    {selectedHomeArt.year_category}
                  </span>
                </DialogTitle>
              </DialogHeader>

              {selectedHomeArt.images.length > 0 ? (
                <div className="relative w-full bg-black mt-4 pb-8">
                  <div className="relative w-full min-h-[75vh]">
                    <Image
                      src={selectedHomeArt.images[homeArtIndex]}
                      alt={`${selectedHomeArt.title} - ${homeArtIndex + 1}`}
                      fill
                      className={`object-contain transition-opacity duration-300 ${
                        homeArtTransitioning ? "opacity-0" : "opacity-100"
                      }`}
                    />
                  </div>
                  {selectedHomeArt.images.length > 1 && (
                    <>
                      <button
                        type="button"
                        className="absolute left-6 top-1/2 z-10 h-16 w-16 -translate-y-1/2 rounded-md border-2 border-[#e50914] bg-transparent text-[#e50914] hover:bg-[#e50914]/10"
                        onClick={handleHomeArtPrev}
                        aria-label="이전 이미지"
                      >
                        ←
                      </button>
                      <button
                        type="button"
                        className="absolute right-6 top-1/2 z-10 h-16 w-16 -translate-y-1/2 rounded-md border-2 border-[#e50914] bg-transparent text-[#e50914] hover:bg-[#e50914]/10"
                        onClick={handleHomeArtNext}
                        aria-label="다음 이미지"
                      >
                        →
                      </button>
                    </>
                  )}
                </div>
              ) : homeArtLoading ? (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">이미지를 불러오는 중...</p>
                </div>
              ) : (
                <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-white/15 bg-[#141414]">
                  <p className="text-white/60">등록된 이미지가 없습니다.</p>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

    </section>
  )
}
