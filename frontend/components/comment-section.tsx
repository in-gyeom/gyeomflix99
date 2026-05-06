"use client"

import { useState } from "react"
import { MessageSquare, Send, Sparkles } from "lucide-react"
import { API_BASE_URL } from "@/lib/api"
import type { Comment } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FieldGroup, Field, FieldLabel } from "@/components/ui/field"


interface CommentSectionProps {
  contentType: "genre" | "art_progress"
  contentId: string
  initialComments: Comment[]
}

export function CommentSection({
  contentType,
  contentId,
  initialComments,
}: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [authorName, setAuthorName] = useState("")
  const [commentText, setCommentText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authorName.trim() || !commentText.trim()) return

    setIsSubmitting(true)
    try {
      const response = await fetch(`${API_BASE_URL}/api/comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content_type: contentType,
          content_id: contentId,
          author_name: authorName.trim(),
          comment_text: commentText.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error("댓글 등록에 실패했습니다.")
      }

      const payload = (await response.json()) as { comment?: Comment }

      if (payload.comment) {
        setComments((prev) => [payload.comment as Comment, ...prev])
        setAuthorName("")
        setCommentText("")
      }
    } catch (error) {
      console.error("Comment submit error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <div className="space-y-6 rounded-xl border border-white/10 bg-[#141414] p-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-white" />
        <h3 className="text-2xl text-white">댓글 ({comments.length})</h3>
        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-[#e50914] px-2 py-1 text-xs text-white">
          TALK
          <Sparkles className="size-3" />
        </span>
      </div>

      {/* Comment Form */}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-white/10 bg-[#101010] p-4">
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="author" className="text-white/80">닉네임</FieldLabel>
            <Input
              id="author"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="닉네임을 입력하세요"
              maxLength={50}
              className="border border-white/15 bg-[#0f0f0f] text-white placeholder:text-white/40"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="comment" className="text-white/80">댓글</FieldLabel>
            <Textarea
              id="comment"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="댓글을 작성하세요..."
              rows={3}
              className="border border-white/15 bg-[#0f0f0f] text-white placeholder:text-white/40"
            />
          </Field>
        </FieldGroup>
        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSubmitting || !authorName.trim() || !commentText.trim()}
            className="border border-[#e50914]/60 bg-[#e50914] text-white hover:bg-[#f6121d]"
          >
            <Send className="mr-2 size-4" />
            {isSubmitting ? "등록 중..." : "댓글 등록"}
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-4">
        {comments.length === 0 ? (
          <p className="py-8 text-center text-white/60">첫 번째 댓글을 남겨보세요!</p>
        ) : (
          comments.map((comment) => (
            <div
              key={comment.id}
              className="rounded-lg border border-white/10 bg-[#101010] p-4 shadow-[0_14px_40px_rgba(0,0,0,0.45)]"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="text-lg text-white">
                  {comment.author_name}
                </span>
                <span className="text-xs text-white/50">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="text-white/85">{comment.comment_text}</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
