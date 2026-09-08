/**
 * 管理后台接口（仅管理员账号可访问，无权限时后端返回 401）
 * - GET /api/admin/stats：经营概览统计
 * - GET /api/admin/orders?status=：订单列表（confirming / spotcheck / paid / all）
 * - GET /api/admin/spotchecks：抽查单列表
 * - GET /api/admin/rebates：返现明细与用户汇总
 * - GET /api/admin/payouts：待打款汇总
 * 页面调用统一静默 + 保留登录态，无权限时由页面展示提示。
 */
import { get } from '@/utils/request'

export interface AdminStats {
  ok: boolean
  total_users: number
  users_today: number
  paid_users: number
  vip_users: number
  income_today: number
  total_income: number
  invitee_count: number
  new_users_last7d: { date: string; count: number }[]
  storage_mode_stats: { available: boolean; note: string; serverSyncedUsers: number }
  feedback: { total: number; pending: number }
}

export interface AdminOrder {
  id: number
  orderNo: string
  userId: number
  plan: string
  amount: number
  status: string
  inviter?: number | null
  rebate?: number
  createdAt?: number
  confirmAt?: number | null
  paidAt?: number | null
}

export interface AdminSpotcheck {
  id: number
  status?: string
  reason?: string
  reportedAmount?: number
  reportedAt?: number
  order?: Record<string, unknown> | null
  [key: string]: unknown
}

export interface AdminRebate {
  id: number
  orderNo: string
  userId: number
  inviter: number | string
  amount: number
  rebate: number
  paidAt?: number
}

export interface AdminRebateTotal {
  id: number
  phone: string
  nickname: string
  rebateTotal: number
}

export interface AdminPayout {
  id: number
  orderNo: string
  userId: number
  inviter: number | string
  amount: number
  rebate: number
  paidAt?: number
}

/** 数据看板统计（静默 + 保留登录态） */
export function fetchAdminStats() {
  return get<AdminStats>('/api/admin/stats', { silent: true, keepAuthOn401: true })
}

/** 订单列表 */
export function fetchAdminOrders(status = 'all') {
  return get<{ ok: boolean; count: number; orders: AdminOrder[] }>(
    `/api/admin/orders?status=${status}`,
    { silent: true, keepAuthOn401: true }
  )
}

/** 抽查单列表 */
export function fetchAdminSpotchecks() {
  return get<{ ok: boolean; count: number; spotchecks: AdminSpotcheck[] }>(
    '/api/admin/spotchecks',
    { silent: true, keepAuthOn401: true }
  )
}

/** 返现明细与用户汇总 */
export function fetchAdminRebates() {
  return get<{
    ok: boolean
    count: number
    details: AdminRebate[]
    totals: AdminRebateTotal[]
  }>('/api/admin/rebates', { silent: true, keepAuthOn401: true })
}

/** 待打款列表 */
export function fetchAdminPayouts() {
  return get<{ ok: boolean; count: number; totalRebate: number; payouts: AdminPayout[] }>(
    '/api/admin/payouts',
    { silent: true, keepAuthOn401: true }
  )
}
