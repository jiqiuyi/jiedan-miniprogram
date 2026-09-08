/**
 * 支付相关接口
 * - POST /api/pay/create：创建 ZPAY（易支付）跳转订单，返回支付 url
 *   契约：需登录；支付渠道未配置时返回 { ok:false, error:'未配置支付渠道' }；
 *   配置成功返回 { ok:true, url, amount, plan, ... }。
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
