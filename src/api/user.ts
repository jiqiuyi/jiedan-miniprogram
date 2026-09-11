/**
 * 用户中心相关接口
 * - GET  /api/me：当前账号资料（含专业版状态、邀请码 / 邀请关系、支付订单）
 * - POST /api/payout/account：保存返现收款账户（微信 / 支付宝 + 姓名 + 账号 + 收款码）
 * - POST /api/payout/apply：申请返现打款（服务端冻结金额 + 账户快照，幂等）
 */
import { get, post } from '@/utils/request'

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
  /** 该笔被邀请人带来的返现（元，服务端现算） */
  rebate?: number
  /** 该笔返现的打款时间；null / 缺省 = 待打款 */
  payoutAt?: number | null
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

/** 返现收款账户摘要（服务端不回传收款码本体，仅返回是否已设置） */
export interface MePayout {
  method?: string
  name?: string
  account?: string
  hasWechatQrcode?: boolean
  hasAlipayQrcode?: boolean
}

export interface MeData {
  user: MeUser
  inviteCode: string
  inviteLink?: string
  invitees: MeInvitee[]
  paidInviteeCount: number
  rebateTotal: number
  /** 已打款返现合计（元） */
  rebatePaid?: number
  /** 待打款返现合计（元） */
  rebatePending?: number
  /** 最早未处理申请时间；null = 尚未申请 */
  payoutApplyAt?: number | null
  payout?: MePayout
  vipRewardGranted: boolean
  orders: MeOrder[]
}

export interface SavePayoutAccountPayload {
  /** wechat / alipay */
  method: string
  name: string
  account: string
  /** data:image/...;base64,...，解码后需 ≤200KB；不重传传空串 */
  wechatQrcode?: string
  alipayQrcode?: string
}

export interface ApplyPayoutResult {
  ok: boolean
  applyCount: number
  applyAmount: number
}

/** 拉取当前账号资料（静默：失败由调用方自行提示） */
export function fetchMe() {
  return get<MeData>('/api/me', { silent: true })
}

/** 保存返现收款账户（与本地钱包提现账户严格分离，不得混用） */
export function savePayoutAccount(payload: SavePayoutAccountPayload) {
  return post<MePayout>(
    '/api/payout/account',
    {
      method: payload.method,
      name: payload.name,
      account: payload.account,
      wechatQrcode: payload.wechatQrcode || '',
      alipayQrcode: payload.alipayQrcode || ''
    },
    { silent: true }
  )
}

/** 申请返现打款（幂等：仅补新增待打款单，不覆盖已写快照） */
export function applyPayout() {
  return post<ApplyPayoutResult>('/api/payout/apply', {}, { silent: true })
}
