/**
 * 支付相关接口
 * - POST /api/pay/create：创建 ZPAY（易支付）跳转订单，返回支付 url
 *   契约：需登录；支付渠道未配置时返回 { ok:false, error:'未配置支付渠道' }；
 *   配置成功返回 { ok:true, url, amount, plan, ... }。
 * - POST /api/redeem：兑换码核销开通专业版（路由与 App 正本一致：
 *   D:\dev\jiedan_app\lib\api_client.dart → redeemCode）
 * - POST /api/jianpay/refund/status：退款资格查询（App 正本 jianpayRefundStatus）
 * - POST /api/jianpay/refund：提交退款（App 正本 jianpayRefund）
 */
import { post } from '@/utils/request'

export type PayPlanKey = 'firstMonth' | 'month' | 'year' | 'forever'

export interface PayCreateData {
  ok: boolean
  orderId: number
  tradeOrderId: string
  plan: string
  amount: number
  url: string
  url_qrcode: string | null
}

/** 创建支付订单（静默：错误提示由页面按契约自行展示） */
export function payCreate(plan: PayPlanKey) {
  return post<PayCreateData>('/api/pay/create', { plan }, { silent: true })
}

/** 兑换码核销结果 */
export interface RedeemData {
  ok?: boolean
  user?: Record<string, unknown>
  message?: string
}

/** 兑换码核销开通专业版（静默：失败提示由页面展示） */
export function redeemCode(code: string) {
  return post<RedeemData>('/api/redeem', { code }, { silent: true })
}

/** 退款资格（服务端现算：开通 6h 内、每账号 1 次） */
export interface RefundStatusData {
  canRefund?: boolean
  reason?: string
  orderNo?: string
}

/** 查询退款资格（静默：失败提示由页面展示） */
export function jianpayRefundStatus() {
  return post<RefundStatusData>('/api/jianpay/refund/status', {}, { silent: true })
}

/** 提交退款（静默：失败提示由页面展示） */
export function jianpayRefund(orderNo: string) {
  return post<{ ok?: boolean; message?: string }>(
    '/api/jianpay/refund',
    { orderNo },
    { silent: true }
  )
}
