/**
 * 意见反馈相关接口
 * - POST /api/feedback：在线提交反馈（需登录，按账号记录）
 * - GET /api/feedback/mine：我的反馈列表（含作者回复与处理状态）
 * 契约：type 为 bug / suggestion / other；content 必填，contact 选填；
 * 后端返回 { ok:true, feedbackId } 与 { ok:true, count, feedbacks:[...] }。
 */
import { get, post } from '@/utils/request'

export type FeedbackTypeKey = 'bug' | 'suggestion' | 'other'

export interface FeedbackItem {
  id: number
  uid: number
  type: string
  content: string
  contact: string
  createdAt: number
  reply?: string | null
  repliedAt?: number | null
  status?: string
  processedAt?: number | null
}

/** 提交反馈（静默：错误由页面提示） */
export function submitFeedback(data: {
  type: FeedbackTypeKey
  content: string
  contact?: string
}) {
  return post<{ ok: boolean; feedbackId: number }>('/api/feedback', data, {
    silent: true
  })
}

/** 拉取我的反馈列表（静默：错误由页面提示） */
export function fetchMyFeedbacks() {
  return get<{ ok: boolean; count: number; feedbacks: FeedbackItem[] }>(
    '/api/feedback/mine',
    { silent: true }
  )
}
