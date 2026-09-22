/**
 * 报价单网页导出 / 分享（小程序侧对应 App QuotePdfService 的导出分享能力）
 *
 * 小程序无法直接落 PDF 文件，这里生成「自包含 HTML 报价页」（内联样式、手机浏览器自适应），
 * 复制后可直接粘贴到微信 / 邮件 / 网页发送给客户，浏览器打开即为报价单页面。
 * 与 quote-image.ts（Canvas 长图）互补：一个产出网页，一个产出图片。
 */
import { formatAmount, formatDate } from '@/utils/format'
import type { Customer, DataRow, Project, Quote, QuoteLine } from '@/utils/types'
import {
  PRIMARY,
  TEXT_SUB,
  num,
  parseLines,
  quoteIsSimple,
  quoteSubtotal,
  quoteTax,
  quoteTitle,
  readSignature,
  rowOf
} from '@/utils/quote-helper'

/** 报价单网页渲染所需的纯数据（与页面/Store 解耦，便于列表页与详情页共用） */
export interface QuoteShareData {
  title: string
  isSimple: boolean
  customerName: string
  projectName: string
  note: string
  /** 税率百分比（如 6 表示 6%） */
  taxRatePercent: number
  subtotalCents: number
  taxCents: number
  totalCents: number
  lines: QuoteLine[]
  createdAt: number
  signName: string
  signContact: string
}

function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** 由报价单记录构造网页渲染数据（客户 / 项目名称按 id 反查，落款取本地持久化签名） */
export function quoteShareDataOf(
  q: Quote,
  customers: Customer[] = [],
  projects: Project[] = []
): QuoteShareData {
  const row = rowOf(q)
  const cid = num(row['customer_id'])
  const pid = num(row['project_id'])
  const customer = cid
    ? (customers || []).find((c) => num(c.id) === cid)
    : undefined
  const project = pid
    ? (projects || []).find((p) => num(p.id) === pid)
    : undefined
  const sig = readSignature()
  return {
    title: quoteTitle(q),
    isSimple: quoteIsSimple(q),
    customerName: String((customer as DataRow | undefined)?.name ?? '') || '未关联客户',
    projectName: String((project as DataRow | undefined)?.title ?? ''),
    note: String(row['note'] ?? '').trim(),
    taxRatePercent: num(row['tax_rate']),
    subtotalCents: quoteSubtotal(q),
    taxCents: quoteTax(q),
    totalCents: num(row['total']),
    lines: parseLines(q),
    createdAt: num(row['created_at']),
    signName: sig.name,
    signContact: sig.contact
  }
}

/** 生成自包含 HTML 报价页（内联样式、手机浏览器自适应，业务数据仅本地生成） */
export function buildQuoteHtml(d: QuoteShareData): string {
  const simple = d.isSimple
  const lines = d.lines || []
  const date = formatDate(d.createdAt)

  let body = ''
  if (simple) {
    body += `<div style="margin:18px 0;padding:18px;border-radius:12px;background:#F6F7FB;">
      <div style="font-size:12px;color:${TEXT_SUB};">报价金额</div>
      <div style="margin-top:6px;font-size:26px;font-weight:700;color:${PRIMARY};">¥${formatAmount(
        d.totalCents
      )}</div>
    </div>`
  } else {
    const rows = lines
      .map((l, i) => {
        const labor = Math.round(num(l.hours) * num(l.hourRate))
        return `<tr>
          <td style="padding:10px 8px;border-bottom:1px solid #E3E7F0;">${i + 1}. ${esc(l.itemName)}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #E3E7F0;color:${TEXT_SUB};font-size:12px;">${
            num(l.hours) > 0 ? `工时 ${num(l.hours)}h × ${formatAmount(num(l.hourRate))} 元/h` : ''
          }${num(l.materialFee) > 0 ? `<br/>物料 ${formatAmount(num(l.materialFee))} 元` : ''}</td>
          <td style="padding:10px 8px;border-bottom:1px solid #E3E7F0;text-align:right;white-space:nowrap;">¥${formatAmount(
            labor + num(l.materialFee)
          )}</td>
        </tr>`
      })
      .join('')
    body += `<table style="width:100%;margin-top:16px;border-collapse:collapse;font-size:13px;">
      <thead><tr>
        <th style="text-align:left;padding:10px 8px;border-bottom:1px solid #E3E7F0;color:${TEXT_SUB};font-weight:600;">项目</th>
        <th style="text-align:left;padding:10px 8px;border-bottom:1px solid #E3E7F0;color:${TEXT_SUB};font-weight:600;">说明</th>
        <th style="text-align:right;padding:10px 8px;border-bottom:1px solid #E3E7F0;color:${TEXT_SUB};font-weight:600;">金额</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div style="margin-top:14px;font-size:13px;color:#1B2233;">
      <div style="display:flex;justify-content:space-between;"><span>小计</span><span>¥${formatAmount(
        d.subtotalCents
      )}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:6px;"><span>税费（${Math.round(
        d.taxRatePercent
      )}%）</span><span>¥${formatAmount(d.taxCents)}</span></div>
      <div style="display:flex;justify-content:space-between;margin-top:10px;padding-top:10px;border-top:1px solid #E3E7F0;">
        <span style="font-weight:600;">合计</span>
        <span style="font-weight:700;font-size:18px;color:${PRIMARY};">¥${formatAmount(d.totalCents)}</span>
      </div>
    </div>`
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(d.title || '报价单')}</title>
</head>
<body style="margin:0;padding:16px;background:#F6F7FB;font-family:-apple-system,'PingFang SC','Microsoft YaHei',sans-serif;color:#1B2233;-webkit-text-size-adjust:100%;">
  <div style="max-width:640px;margin:0 auto;background:#FFFFFF;border-radius:14px;padding:20px;box-sizing:border-box;">
    <div style="font-size:20px;font-weight:700;">${simple ? '报价' : '报价单'}</div>
    <div style="margin-top:4px;font-size:12px;color:${TEXT_SUB};">${esc(date)}</div>
    <div style="margin-top:14px;font-size:13px;line-height:1.9;">
      <div>客户：${esc(d.customerName)}</div>
      ${d.projectName ? `<div>项目：${esc(d.projectName)}</div>` : ''}
    </div>
    ${body}
    ${
      d.note
        ? `<div style="margin-top:14px;font-size:12px;color:${TEXT_SUB};line-height:1.8;">备注：${esc(
            d.note
          )}</div>`
        : ''
    }
    <div style="margin-top:18px;padding-top:14px;border-top:1px solid #E3E7F0;font-size:12px;color:${TEXT_SUB};line-height:1.8;">
      ${d.signName ? `<div>落款：${esc(d.signName)}</div>` : ''}
      ${d.signContact ? `<div>联系方式：${esc(d.signContact)}</div>` : ''}
      <div style="margin-top:6px;">本报价单由接单管家生成</div>
    </div>
  </div>
</body>
</html>`
}

/**
 * 网页分享：生成自包含 HTML 报价页并复制到剪贴板
 * （小程序无系统分享面板，改为可粘贴的网页源码 / 链接载体）
 */
export function shareQuoteWeb(
  d: QuoteShareData,
  okText = '网页报价单已生成并复制，可粘贴到邮件 / 网页发送给客户',
  failText = '分享网页报价单失败，请重试'
): void {
  uni.setClipboardData({
    data: buildQuoteHtml(d),
    success: () => uni.showToast({ title: okText, icon: 'none' }),
    fail: () => uni.showToast({ title: failText, icon: 'none' })
  })
}
