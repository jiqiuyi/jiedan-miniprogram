/**
 * 管理后台接口（仅管理员账号可访问，无权限时后端返回 401）
 * - GET /api/admin/stats：经营概览统计
 * - GET /api/admin/orders?status=：订单列表（confirming / spotcheck / paid / all）
 * - GET /api/admin/spotchecks：抽查单列表
 * - GET /api/admin/rebates：返现明细与用户汇总
 * - GET /api/admin/payouts：待打款汇总
 * - POST /api/admin/spotcheck/review：抽查复核（approve / reject）
 * - GET/POST /api/admin/qrcode：收款码配置查询 / 保存
 * - GET /api/admin/listener：监听状态汇总
 * - GET /api/admin/logs：管理操作日志
 * 页面调用统一静默 + 保留登录态，无权限时由页面展示提示。
 */
import { get, post } from '@/utils/request'

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

/** 返现明细项（正本 admin_page.dart 读取 fromNickname / fromPhone / rebate） */
export interface AdminRebateDetail {
  id?: number
  rebate?: number
  fromNickname?: string
  fromPhone?: string
  [key: string]: unknown
}

/** 返现汇总（正本读取 totals 映射中的 totalRebate / totalPayout） */
export interface AdminRebateTotals {
  totalRebate?: number
  totalPayout?: number
  [key: string]: unknown
}

/** 待打款项（正本 admin_page.dart 读取 nickname / phone / rebate / available） */
export interface AdminPayoutRow {
  id?: number
  nickname?: string
  phone?: string
  rebate?: number
  available?: number
  [key: string]: unknown
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

/** 监听状态汇总（服务状态 Tab） */
export interface AdminListenerData {
  todayReports?: number
  todayMatched?: number
  todaySpotcheck?: number
  qrcodeConfigured?: boolean
  totalReports?: number
  [key: string]: unknown
}

/** 管理操作日志 */
export interface AdminLog {
  id?: number
  action?: string
  adminId?: number
  detail?: string
  at?: number
  [key: string]: unknown
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
    details: AdminRebateDetail[]
    totals: AdminRebateTotals
  }>('/api/admin/rebates', { silent: true, keepAuthOn401: true })
}

/** 待打款列表 */
export function fetchAdminPayouts() {
  return get<{ ok: boolean; count: number; totalRebate: number; payouts: AdminPayoutRow[] }>(
    '/api/admin/payouts',
    { silent: true, keepAuthOn401: true }
  )
}

/** 抽查复核：action = approve（通过）| reject（驳回） */
export function reviewAdminSpotcheck(spotcheckId: number, action: 'approve' | 'reject') {
  return post<{ ok: boolean }>(
    '/api/admin/spotcheck/review',
    { spotcheckId, action },
    { silent: true, keepAuthOn401: true }
  )
}

/** 收款码配置回显（GET /api/admin/qrcode） */
export function fetchAdminQrcode() {
  return get<{ ok: boolean; wechat?: string; alipay?: string }>('/api/admin/qrcode', {
    silent: true,
    keepAuthOn401: true
  })
}

/** 收款码配置保存（POST /api/admin/qrcode） */
export function saveAdminQrcode(wechat: string, alipay: string) {
  return post<{ ok: boolean }>(
    '/api/admin/qrcode',
    { wechat, alipay },
    { silent: true, keepAuthOn401: true }
  )
}

/** 监听状态汇总（服务状态） */
export function fetchAdminListener() {
  return get<{ ok: boolean } & AdminListenerData>('/api/admin/listener', {
    silent: true,
    keepAuthOn401: true
  })
}

/** 管理操作日志 */
export function fetchAdminLogs() {
  return get<{ ok: boolean; logs: AdminLog[] }>('/api/admin/logs', {
    silent: true,
    keepAuthOn401: true
  })
}
