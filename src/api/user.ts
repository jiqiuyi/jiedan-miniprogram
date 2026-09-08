/**
 * 用户中心相关接口
 * - GET /api/me：当前账号资料（含专业版状态、邀请码 / 邀请关系、支付订单）
 */
import { get } from '@/utils/request'

export interface MeUser {
  id: number
  phone: string
  nickname: string
  inviter?: number | null
  isPro: boolean
  proExpireAt: number
  rebateTotal: number
  firstMonthUsed: boolean
  createdAt?: number
  role?: string
}

export interface MeInvitee {
  id: number
  nickname: string
  phone: string
  paid: boolean
  payAmount: number
  paidAt?: number | null
}

export interface MeOrder {
  id: number
  orderNo: string
  plan: string
  amount: number
  status: 'pending' | 'paid'
  createdAt: number
  paidAt?: number | null
}

export interface MeData {
  user: MeUser
  inviteCode: string
  invitees: MeInvitee[]
  paidInviteeCount: number
  rebateTotal: number
  vipRewardGranted: boolean
  orders: MeOrder[]
}

/** 拉取当前账号资料（静默：失败由调用方自行提示） */
export function fetchMe() {
  return get<MeData>('/api/me', { silent: true })
}
