"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"

const ADMIN_PASSWORD = "0922"

interface AdminPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  title?: string
  description?: string
}

export function AdminPasswordDialog({
  open,
  onOpenChange,
  onSuccess,
  title = "관리자 인증",
  description = "관리자 비밀번호를 입력하세요.",
}: AdminPasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password === ADMIN_PASSWORD) {
      setPassword("")
      setError("")
      onOpenChange(false)
      onSuccess()
    } else {
      setError("비밀번호가 올바르지 않습니다.")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border border-white/10 bg-[#0f0f0f] text-white">
        <DialogHeader>
          <DialogTitle className="text-white">{title}</DialogTitle>
          <DialogDescription className="text-white/60">{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="password" className="text-white/80">비밀번호</FieldLabel>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError("")
                }}
                placeholder="비밀번호 입력"
                className="border border-white/15 bg-[#101010] text-white placeholder:text-white/40"
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border border-white/15 bg-transparent text-white hover:bg-white/10"
            >
              취소
            </Button>
            <Button type="submit" className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]">확인</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
