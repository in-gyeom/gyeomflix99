import type { Metadata } from 'next'
import { Bebas_Neue, Manrope, Noto_Sans_KR } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import Image from 'next/image'
import Link from 'next/link'
import './globals.css'

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

const notoSansKr = Noto_Sans_KR({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-noto-kr",
  display: "swap",
});

export const metadata: Metadata = {
  title: '겸플릭스',
  description: '작가 포트폴리오 웹사이트',
  generator: 'v0.app',
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${manrope.variable} ${notoSansKr.variable} ${bebasNeue.variable} netflix-theme font-sans antialiased`}>
        <header className="sticky top-0 z-50 border-b border-white/10 bg-[#0b0b0b]/95 px-6 py-4 text-white backdrop-blur">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-start gap-8">
            <Link href="/" className="flex items-center">
              <Image
                src="/gyeomfilx-logo.png.png"
                alt="겸플릭스 로고"
                width={140}
                height={32}
                priority
              />
            </Link>
            <nav className="flex items-center gap-4 text-sm font-semibold text-white/70">
              <Link href="/profile" className="hover:text-white">작가 프로필</Link>
              <Link href="/genre" className="hover:text-white">웹툰</Link>
              <Link href="/art-progress" className="hover:text-white">그림 발전과정</Link>
            </nav>
          </div>
        </header>
        <main className="flex-1 px-6 py-8 md:px-10">
          {children}
        </main>
        <Analytics />
      </body>
    </html>
  )
}
