/**
 * 纯函数格式化工具（不依赖任何状态）
 * 用于时间戳、金额、状态的展示格式化。
 */

/** 毫秒时间戳 → 'YYYY-MM-DD' */
export function formatDate(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** 毫秒时间戳 → 'YYYY-MM-DD HH:mm' */
export function formatDateTime(ts: number | string | null | undefined): string {
  if (!ts) return '-'
  const d = new Date(Number(ts))
  if (isNaN(d.getTime())) return '-'
  const p = (n: number) => String(n).padStart(2, '0')
  return `${formatDate(ts)} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 金额：分 → 元字符串（保留两位小数，带千分位） */
export function formatAmount(cents: number | string | null | undefined): string {
  const val = Number(cents ?? 0)
  if (isNaN(val)) return '0.00'
  const yuan = val / 100
  // 千分位
  const parts = yuan.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/** 金额：元 → 元字符串（保留两位小数，带千分位）。用于服务端以「元」为单位的金额（如返现 rebate/rebatePaid） */
export function formatYuan(v: number | string | null | undefined): string {
  const val = Number(v ?? 0)
  if (isNaN(val)) return '0.00'
  const parts = val.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}

/** 项目状态 → 中文（与 App ProjectStatus 对齐：0=接单 1=制作中 2=待收尾款 3=完结） */
export function projectStatusText(status: number | string | null | undefined): string {
  const map: Record<number, string> = { 0: '接单', 1: '制作中', 2: '待收尾款', 3: '完结' }
  return map[Number(status ?? 0)] || '未知'
}

/** 报价单状态 → 中文（与 App QuoteStatus 对齐：0=草稿 1=已发送 2=客户确认 3=已成交 4=已作废） */
export function quoteStatusText(status: number | string | null | undefined): string {
  const map: Record<number, string> = { 0: '草稿', 1: '已发送', 2: '客户确认', 3: '已成交', 4: '已作废' }
  return map[Number(status ?? 0)] || '未知'
}

/** 收款类型（type 字段）→ 中文标签
 * 兼容两种同步取值：App 同步行存数字索引 0=定金/1=尾款/2=全额/3=自定义；部分历史行可能为字符串枚举名。
 */
export function payTypeText(type: unknown, label?: unknown): string {
  const m: Record<string, string> = { deposit: '定金', balance: '尾款', full: '全额', custom: '自定义' }
  if (type === null || type === undefined || type === '') {
    const l0 = String(label ?? '').trim()
    return l0 || '自定义'
  }
  if (typeof type === 'number' || (typeof type === 'string' && /^\d+$/.test(String(type).trim()))) {
    const idx = Number(type)
    if (idx >= 0 && idx <= 3) {
      if (idx === 3) {
        const l1 = String(label ?? '').trim()
        return l1 || '自定义'
      }
      return ['定金', '尾款', '全额'][idx]
    }
    return String(label ?? '').trim() || '自定义'
  }
  const s = String(type ?? '')
  if (s === 'custom') {
    const l2 = String(label ?? '').trim()
    return l2 || '自定义'
  }
  return m[s] || String(label || '') || '自定义'
}

/** 是否含税 → 文案 */
export function taxIncludeText(v: number | string | null | undefined): string {
  return Number(v ?? 0) === 1 ? '含税' : '不含税'
}

/** 报价单页面只读展示，脱敏电话号码（仅保留前3后4） */
export function maskPhone(phone: string | null | undefined): string {
  const p = (phone || '').trim()
  if (p.length < 7) return p || '-'
  return `${p.slice(0, 3)}****${p.slice(-4)}`
}
