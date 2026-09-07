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

/** 项目状态 → 中文（与后端 status 语义对齐：0=未开始 1=进行中 2=已完成） */
export function projectStatusText(status: number | string | null | undefined): string {
  const map: Record<number, string> = { 0: '未开始', 1: '进行中', 2: '已完成', 3: '已暂停' }
  return map[Number(status ?? 0)] || '未知'
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
