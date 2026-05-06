"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Palette, TrendingUp } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const menuItems = [
  {
    title: "작가 프로필",
    href: "/profile",
    icon: User,
  },
  {
    title: "웹툰",
    href: "/genre",
    icon: Palette,
  },
  {
    title: "그림발전과정",
    href: "/art-progress",
    icon: TrendingUp,
  },
]

export function AppSidebar() {
  const pathname = usePathname()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <Sidebar className="border-r border-white/10 bg-[#0f0f0f]">
      <SidebarHeader className="border-b border-white/10 bg-[#121212] px-5 py-5">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-2xl bg-[#e50914] text-xs font-semibold uppercase text-white">
            SN
          </div>
          <div>
            <span className="text-base font-semibold text-white">겸플릭스</span>
            <p className="text-xs text-white/50">Creative Webtoon</p>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="bg-[#0f0f0f]">
        <SidebarGroup className="p-3">
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.3em] text-white/50">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-2">
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={mounted && pathname === item.href}
                    className="h-11 rounded-xl border border-white/10 bg-[#141414] px-3 text-white/70 transition-all hover:border-white/20 hover:bg-[#1c1c1c] hover:text-white data-[active=true]:border-[#e50914]/60 data-[active=true]:bg-[#1a1a1a] data-[active=true]:text-white"
                  >
                    <Link href={item.href} className="flex w-full items-center gap-3">
                      <item.icon className="size-4" />
                      <span className="text-sm font-medium leading-none">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
