/**
 * 钱包本地账本（MVP）
 * - 充值：出示收款码 + 手动确认到账（真实支付通道接入前）
 * - 提现：申请登记 + 人工打款（状态人工更新为「已提现」）
 * - 收款码：微信 / 支付宝个人收款码本地图片路径（云端存储后续接入）
 * 口径：余额 = 收款合计 + 已到账充值 - 提现（全部，提交即扣减）
 */
import { storage } from '@/utils/storage'
import {
  WALLET_RECHARGE_KEY,
  WALLET_WITHDRAW_KEY,
  WALLET_ACCOUNT_KEY,
  PAYCODE_WX_KEY,
  PAYCODE_ALI_KEY
} from '@/utils/config'

export type RechargeMethodKey = 'wechat' | 'alipay'
export type WithdrawMethodKey = 'wechat' | 'alipay' | 'bank'
export type RecStatus = 'pending' | 'processing' | 'done'

export interface RechargeRec {
  id: number
  amount: number // 分
  method: RechargeMethodKey
  status: 'pending' | 'done'
  createdAt: number
  note: string
}

export interface WithdrawRec {
  id: number
  amount: number // 分
  method: WithdrawMethodKey
  status: WithdrawRecStatus
  createdAt: number
  accountName: string
  accountNo: string
  note: string
}

type WithdrawRecStatus = 'pending' | 'processing' | 'done'

export interface WithdrawAccount {
  method: WithdrawMethodKey
  name: string
  no: string
}

export const RECHARGE_METHODS: { key: RechargeMethodKey; label: string }[] = [
  { key: 'wechat', label: '微信' },
  { key: 'alipay', label: '支付宝' }
]

export const WITHDRAW_METHODS: {
  key: WithdrawMethodKey
  label: string
  noHint: string
}[] = [
  { key: 'wechat', label: '微信', noHint: '收款微信号' },
  { key: 'alipay', label: '支付宝', noHint: '收款支付宝账号' },
  { key: 'bank', label: '银行卡', noHint: '收款银行卡号' }
]

export const RECHARGE_NOTICE =
  '充值到账后计入钱包余额，可用于后续开通专业版等消费；当前为手动确认模式，付款后请点击「确认到账」完成入账。'

export const WITHDRAW_NOTICE =
  '提现申请提交后由人工核对打款，到账后状态更新为「已提现」；接入官方收款通道后自动到账。'

export function methodLabel(
  key: RechargeMethodKey | WithdrawMethodKey
): string {
  const w = WITHDRAW_METHODS.find((m) => m.key === key)
  if (w) return w.label
  const r = RECHARGE_METHODS.find((m) => m.key === key)
  return r ? r.label : ''
}

export function rechargeStatusText(s: RechargeRec['status']): string {
  return s === 'done' ? '已到账' : '待确认'
}

export function withdrawStatusText(s: WithdrawRecStatus): string {
  if (s === 'done') return '已提现'
  if (s === 'processing') return '处理中'
  return '待处理'
}

/** 金额字符串（元）→ 分；非法 / 负数返回 0 */
export function yuanToFen(text: string): number {
  const t = (text || '').trim()
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return 0
  return Math.round(Number(t) * 100)
}

function readList<T>(key: string): T[] {
  return storage.getJson<T[]>(key) || []
}

function writeList<T>(key: string, list: T[]) {
  storage.setJson(key, list)
}

// ---------- 充值记录 ----------
export function loadRecharges(): RechargeRec[] {
  return readList<RechargeRec>(WALLET_RECHARGE_KEY).sort(
    (a, b) => b.createdAt - a.createdAt
  )
}

export function addRecharge(p: {
  amount: number
  method: RechargeMethodKey
  /** 默认 pending；确认到账时直接以 done 入账（对齐 App 手动确认到账语义） */
  status?: RechargeRec['status']
  note?: string
}): RechargeRec {
  const rec: RechargeRec = {
    id: Date.now(),
    amount: p.amount,
    method: p.method,
    status: p.status || 'pending',
    createdAt: Date.now(),
    note: p.note || ''
  }
  writeList(WALLET_RECHARGE_KEY, [...readList<RechargeRec>(WALLET_RECHARGE_KEY), rec])
  return rec
}

export function markRechargeDone(id: number): boolean {
  const list = readList<RechargeRec>(WALLET_RECHARGE_KEY)
  const idx = list.findIndex((r) => r.id === id)
  if (idx < 0) return false
  list[idx] = { ...list[idx], status: 'done' }
  writeList(WALLET_RECHARGE_KEY, list)
  return true
}

// ---------- 提现记录 ----------
export function loadWithdrawals(): WithdrawRec[] {
  return readList<WithdrawRec>(WALLET_WITHDRAW_KEY).sort(
    (a, b) => b.createdAt - a.createdAt
  )
}

export function addWithdrawal(p: {
  amount: number
  method: WithdrawMethodKey
  accountName: string
  accountNo: string
  note?: string
}): WithdrawRec {
  const rec: WithdrawRec = {
    id: Date.now(),
    amount: p.amount,
    method: p.method,
    status: 'pending',
    createdAt: Date.now(),
    accountName: p.accountName,
    accountNo: p.accountNo,
    note: p.note || ''
  }
  writeList(
    WALLET_WITHDRAW_KEY,
    [...readList<WithdrawRec>(WALLET_WITHDRAW_KEY), rec]
  )
  return rec
}

export function markWithdrawDone(id: number): boolean {
  const list = readList<WithdrawRec>(WALLET_WITHDRAW_KEY)
  const idx = list.findIndex((r) => r.id === id)
  if (idx < 0) return false
  list[idx] = { ...list[idx], status: 'done' }
  writeList(WALLET_WITHDRAW_KEY, list)
  return true
}

// ---------- 提现账户 ----------
export function loadAccount(): WithdrawAccount | null {
  return storage.getJson<WithdrawAccount>(WALLET_ACCOUNT_KEY)
}

export function saveAccount(acc: WithdrawAccount) {
  storage.setJson(WALLET_ACCOUNT_KEY, acc)
}

/** 账户是否已填写完整（对齐 App WithdrawAccount.filled：姓名与账号均非空） */
export function isAccountFilled(acc: WithdrawAccount | null): boolean {
  if (!acc) return false
  return !!(acc.name || '').trim() && !!(acc.no || '').trim()
}

// ---------- 收款码图片路径 ----------
export type PayCodeKind = 'wechat' | 'alipay'

export function getPayCodePath(kind: PayCodeKind): string {
  const key = kind === 'wechat' ? PAYCODE_WX_KEY : PAYCODE_ALI_KEY
  return (storage.getJson<string>(key) || '').trim()
}

export function setPayCodePath(kind: PayCodeKind, path: string) {
  const key = kind === 'wechat' ? PAYCODE_WX_KEY : PAYCODE_ALI_KEY
  if (path) storage.setJson(key, path)
  else storage.remove(key)
}

export function hasAnyPayCode(): boolean {
  return !!(getPayCodePath('wechat') || getPayCodePath('alipay'))
}
