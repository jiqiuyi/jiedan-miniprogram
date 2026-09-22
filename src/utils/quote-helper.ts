/**
 * 报价模块共享工具（对齐 App：lib/pages/quote_page.dart、lib/models.dart、lib/theme.dart）
 * - 设计 Token（AppTheme / AppRadius / AppFont）集中定义，保证视觉与 App 一致
 * - 状态映射、文本生成、落款、模板判定等纯逻辑集中此处，供 list / detail 复用
 */
import type { Quote, QuoteLine, DataRow } from '@/utils/types'
import { formatAmount } from '@/utils/format'

/* ================= 设计 Token（与 App AppTheme 完全一致） ================= */
export const PRIMARY = '#4A5AF0' // 品牌蓝
export const PRIMARY_DARK = '#3A46C4'
export const ACCENT = '#16A085' // 收入绿
export const WARN = '#E67E22' // 待收/提醒橙
export const DANGER = '#E74C3C'
export const SUCCESS = '#27AE60'
export const INFO = '#2196F3' // Flutter Colors.blue（报价状态「客户确认」）
export const PAGE_BG = '#F6F7FB'
export const BG_CARD = '#EFF2F8'
export const DIVIDER_COLOR = '#E3E7F0'
export const TEXT_MAIN = '#1B2233'
export const TEXT_SUB = '#8A93A6'
export const BORDER_COLOR = '#E4E7EF'

/** AppConfig.defaultHourRate（分/小时） */
export const DEFAULT_HOUR_RATE = 15000
/** AppConfig.defaultTaxRate（0-1） */
export const DEFAULT_TAX_RATE = 0

/** 十六进制色 + 透明度 → rgba 字符串（状态徽章 / 浅底标签用） */
export function alphaColor(hex: string, a: number): string {
  const h = String(hex || '').replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const r = parseInt(full.slice(0, 2) || '00', 16)
  const g = parseInt(full.slice(2, 4) || '00', 16)
  const b = parseInt(full.slice(4, 6) || '00', 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

/* ================= 报价状态（对齐 App QuoteStatus + _quoteStatusColor/_quoteStatusIcon） ================= */
export interface QuoteStatusMeta {
  value: number
  label: string
  color: string
  icon: string
}

export const QUOTE_STATUS_META: QuoteStatusMeta[] = [
  { value: 0, label: '草稿', color: TEXT_SUB, icon: '✎' },
  { value: 1, label: '已发送', color: ACCENT, icon: '➤' },
  { value: 2, label: '客户确认', color: INFO, icon: '✓' },
  { value: 3, label: '已成交', color: '#4CAF50', icon: '✔' },
  { value: 4, label: '已作废', color: DANGER, icon: '⊘' }
]

export function quoteStatusMeta(v: unknown): QuoteStatusMeta {
  const n = num(v)
  return QUOTE_STATUS_META[n] || QUOTE_STATUS_META[0]
}

/* ================= 行数据访问器 ================= */
export function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

export function rowOf(q: Quote | null | undefined): DataRow {
  return (q || {}) as DataRow
}

/** 是否简单报价（对齐 App Quote.isSimple：非 full 一律按简单报价处理，兼容旧行空 type） */
export function quoteIsSimple(q: Quote | null | undefined): boolean {
  return String(rowOf(q)['quote_type'] ?? '') !== 'full'
}

/** 是否报价模板（is_template = 1，仅用于模板套用，不进业务列表） */
export function quoteIsTemplate(q: Quote | null | undefined): boolean {
  return num(rowOf(q)['is_template']) === 1
}

export function quoteTypeLabel(q: Quote | null | undefined): string {
  return quoteIsSimple(q) ? '简单报价' : '详细报价'
}

export function quoteTitle(q: Quote | null | undefined): string {
  return String(rowOf(q)['title'] ?? '')
}

export function quoteTotal(q: Quote | null | undefined): number {
  return num(rowOf(q)['total'])
}

export function quoteCreatedAt(q: Quote | null | undefined): number {
  return num(rowOf(q)['created_at'])
}

export function quoteStatus(q: Quote | null | undefined): number {
  return num(rowOf(q)['status'])
}

/** 解析明细行（lines_json） */
export function parseLines(q: Quote | null | undefined): QuoteLine[] {
  const raw = String(rowOf(q)['lines_json'] ?? '[]')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as QuoteLine[]) : []
  } catch {
    return []
  }
}

/** 明细行金额（分）：工时 × 单价 + 物料费（对齐 App QuoteLine.laborCost） */
export function lineSubtotal(l: QuoteLine): number {
  if (!l) return 0
  return Math.round(num(l.hours) * num(l.hourRate)) + num(l.materialFee)
}

export function linesSubtotal(lines: QuoteLine[]): number {
  return (lines || []).reduce((s, l) => s + lineSubtotal(l), 0)
}

/** 报价单小计（分）：优先使用存储值，缺省时按明细计算 */
export function quoteSubtotal(q: Quote | null | undefined): number {
  return linesSubtotal(parseLines(q))
}

/** 税费（分） */
export function quoteTax(q: Quote | null | undefined): number {
  return Math.round(quoteSubtotal(q) * (num(rowOf(q)['tax_rate']) / 100))
}

/* ================= 报价文本（与 App buildSimpleQuoteText / buildQuoteText / _quoteTextFor 一致） ================= */
/** 简单报价文本（对齐 App buildSimpleQuoteText） */
export function buildSimpleQuoteText(objectName: string, amountYuan: number, note: string): string {
  let s = '【报价】\n'
  s += `客户：${objectName}\n`
  s += `报价金额：¥${formatAmount(Math.round((amountYuan || 0) * 100))}\n`
  const n = String(note || '').trim()
  if (n) s += `备注：${n}\n`
  return s
}

/** 详细报价文本（对齐 App buildQuoteText） */
export function buildFullQuoteText(
  client: string,
  lines: QuoteLine[],
  taxRatePercent: number,
  subtotalCents: number,
  taxCents: number,
  totalCents: number
): string {
  const list = lines || []
  let s = '【报价单】\n'
  s += `客户：${String(client || '').trim() || '________'}\n`
  s += '------------------\n'
  list.forEach((l, i) => {
    s += `${i + 1}. ${l.itemName || ''}\n`
    if (num(l.hours) > 0) {
      s += `   工时 ${l.hours}h × ${formatAmount(num(l.hourRate))}元/h = ${formatAmount(
        Math.round(num(l.hours) * num(l.hourRate))
      )}元\n`
    }
    if (num(l.materialFee) > 0) {
      s += `   物料 ${formatAmount(num(l.materialFee))}元\n`
    }
  })
  s += '------------------\n'
  s += `小计：${formatAmount(subtotalCents)} 元\n`
  s += `税费（${Math.round(taxRatePercent)}%）：${formatAmount(taxCents)} 元\n`
  s += `合计：${formatAmount(totalCents)} 元\n`
  s += '请确认无误后回复，感谢合作！\n'
  return s
}

/** 按历史报价单生成文本（对齐 App _quoteTextFor，不依赖编辑态） */
export function quoteTextFor(q: Quote): string {
  if (quoteIsSimple(q)) {
    return buildSimpleQuoteText(
      quoteTitle(q),
      quoteTotal(q) / 100,
      String(rowOf(q)['note'] ?? '')
    )
  }
  return buildFullQuoteText(
    quoteTitle(q),
    parseLines(q),
    num(rowOf(q)['tax_rate']),
    quoteSubtotal(q),
    quoteTax(q),
    quoteTotal(q)
  )
}

/* ================= 落款（对齐 App QuotePdfService.readSignature / saveSignature，本地持久化） ================= */
export interface QuoteSignature {
  name: string
  contact: string
}

const SIGNATURE_KEY = 'quote_signature'

export function readSignature(): QuoteSignature {
  try {
    const raw = uni.getStorageSync(SIGNATURE_KEY)
    if (!raw) return { name: '', contact: '' }
    const obj = typeof raw === 'string' ? JSON.parse(raw) : raw
    return {
      name: String((obj as DataRow)?.name ?? ''),
      contact: String((obj as DataRow)?.contact ?? '')
    }
  } catch {
    return { name: '', contact: '' }
  }
}

export function saveSignature(sig: QuoteSignature): void {
  try {
    uni.setStorageSync(SIGNATURE_KEY, JSON.stringify({ name: sig.name || '', contact: sig.contact || '' }))
  } catch {
    // 忽略存储失败
  }
}

/* ================= 列表筛选 ================= */
export function businessQuotes(list: Quote[]): Quote[] {
  return (list || []).filter((q) => !quoteIsTemplate(q))
}

export function templateQuotes(list: Quote[]): Quote[] {
  return (list || []).filter((q) => quoteIsTemplate(q))
}
