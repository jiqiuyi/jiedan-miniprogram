/**
 * 报价单图片导出（小程序侧对应 App 的「导出 PDF」）
 *
 * 小程序无法直接生成 PDF，这里用 Canvas 2D 按 App QuotePdfService 的版式绘制
 * 一张 A4 比例的报价单长图，可保存到相册 / 预览 / 转发展示给客户。
 * 版式包含：标题 + 状态徽章、客户/项目、费用明细、金额块、备注、参考图、落款。
 */
import type { QuoteLine } from '@/utils/types'
import { formatAmount, formatDate } from '@/utils/format'
import {
  BG_CARD,
  DIVIDER_COLOR,
  PRIMARY,
  TEXT_MAIN,
  TEXT_SUB,
  alphaColor,
  lineSubtotal,
  num,
  quoteStatusMeta
} from '@/utils/quote-helper'

export interface QuoteSheetData {
  /** 报价单编号（历史报价单 id，可为 0 表示未保存） */
  code: number
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
  status: number
  signName: string
  signContact: string
  imagePath: string
}

const FONT_FAMILY = '"PingFang SC", "Helvetica Neue", Helvetica, Arial, sans-serif'
const M = 22

/* ================= 绘制器（测量与绘制共用同一套布局代码） ================= */
class Painter {
  ctx: any
  W: number
  draw: boolean

  constructor(ctx: any, W: number, draw: boolean) {
    this.ctx = ctx
    this.W = W
    this.draw = draw
  }

  get innerW(): number {
    return this.W - M * 2
  }

  setFont(size: number, bold = false): void {
    this.ctx.font = `${bold ? 'bold ' : ''}${size}px ${FONT_FAMILY}`
  }

  /** 文本宽度 */
  measure(text: string, size: number, bold = false): number {
    this.setFont(size, bold)
    return this.ctx.measureText(String(text ?? '')).width
  }

  /** 绘制单行文本（textBaseline = top） */
  text(
    text: string,
    x: number,
    y: number,
    size: number,
    color: string,
    bold = false,
    align: 'left' | 'right' | 'center' = 'left'
  ): void {
    this.setFont(size, bold)
    this.ctx.fillStyle = color
    this.ctx.textAlign = align
    this.ctx.textBaseline = 'top'
    if (this.draw) this.ctx.fillText(String(text ?? ''), x, y)
  }

  /** 圆角矩形填充 */
  rect(x: number, y: number, w: number, h: number, color: string, r = 0): void {
    if (!this.draw) return
    const ctx = this.ctx
    ctx.fillStyle = color
    ctx.beginPath()
    const rr = Math.min(r, w / 2, h / 2)
    ctx.moveTo(x + rr, y)
    ctx.lineTo(x + w - rr, y)
    ctx.arcTo(x + w, y, x + w, y + rr, rr)
    ctx.lineTo(x + w, y + h - rr)
    ctx.arcTo(x + w, y + h, x + w - rr, y + h, rr)
    ctx.lineTo(x + rr, y + h)
    ctx.arcTo(x, y + h, x, y + h - rr, rr)
    ctx.lineTo(x, y + rr)
    ctx.arcTo(x, y, x + rr, y, rr)
    ctx.closePath()
    ctx.fill()
  }

  /** 文本换行 */
  wrap(text: string, size: number, bold: boolean, maxW: number): string[] {
    this.setFont(size, bold)
    const src = String(text ?? '')
    if (!src) return ['']
    const tokens = src.match(/[A-Za-z0-9@._%+\-]+|\s+|[^\s]/g) || []
    const lines: string[] = []
    let cur = ''
    tokens.forEach((t) => {
      const test = cur + t
      if (cur && this.ctx.measureText(test).width > maxW) {
        lines.push(cur)
        cur = t.replace(/^\s+/, '')
      } else {
        cur = test
      }
    })
    lines.push(cur)
    return lines
  }
}

/* ================= 版式 ================= */
function layoutSheet(p: Painter, d: QuoteSheetData, img: any): number {
  const W = p.W
  const right = W - M
  const meta = quoteStatusMeta(d.status)
  let y = 24

  /* 标题 + 状态徽章 */
  p.text('报价单', M, y, 22, TEXT_MAIN, true)
  const chipW = p.measure(meta.label, 12, true) + 20
  p.rect(right - chipW, y + 4, chipW, 22, alphaColor(meta.color, 0.12), 6)
  p.text(meta.label, right - chipW / 2, y + 9, 12, meta.color, true, 'center')
  y += 36

  /* 副标题：类型 · 编号 ｜ 日期 */
  const sub = `${d.isSimple ? '简单报价' : '详细报价'}${d.code > 0 ? ` · 编号 #${d.code}` : ''}`
  p.text(sub, M, y, 12, TEXT_SUB)
  p.text(formatDate(d.createdAt), right, y, 12, TEXT_SUB, false, 'right')
  y += 22
  p.rect(M, y, p.innerW, 1, DIVIDER_COLOR)
  y += 18

  /* 客户 / 关联项目 */
  const infoRow = (label: string, value: string) => {
    p.text(label, M, y, 12, TEXT_SUB)
    const lines = p.wrap(value || '-', 13.5, true, p.innerW - 78)
    lines.forEach((ln, i) => p.text(ln, M + 78, y + i * 19, 13.5, TEXT_MAIN, true))
    y += Math.max(22, lines.length * 19 + 4)
  }
  infoRow('客户', d.customerName || d.title || '-')
  if (d.projectName) infoRow('关联项目', d.projectName)
  y += 6

  /* 费用明细 / 报价总额 */
  if (d.isSimple) {
    p.rect(M, y, p.innerW, 104, alphaColor(PRIMARY, 0.08), 14)
    p.text('报价总额（一口价）', W / 2, y + 20, 12, TEXT_SUB, false, 'center')
    p.text(`¥${formatAmount(d.totalCents)}`, W / 2, y + 42, 30, PRIMARY, true, 'center')
    const taxTip =
      num(d.taxRatePercent) > 0 ? `适用税率 ${Math.round(num(d.taxRatePercent))}%` : '本报价已含税'
    p.text(taxTip, W / 2, y + 82, 11.5, TEXT_SUB, false, 'center')
    y += 122
  } else {
    p.text('费用明细', M, y, 13.5, TEXT_MAIN, true)
    y += 24
    p.rect(M, y, p.innerW, 28, BG_CARD, 8)
    p.text('项目 / 计费说明', M + 10, y + 8, 11.5, TEXT_SUB, true)
    p.text('金额(元)', right - 10, y + 8, 11.5, TEXT_SUB, true, 'right')
    y += 28
    const list = d.lines || []
    list.forEach((l, i) => {
      const nameLines = p.wrap(String(l.itemName || '未命名项目'), 13.5, true, p.innerW - 120)
      const parts: string[] = []
      if (num(l.hours) > 0) {
        parts.push(`工时 ${num(l.hours)}h × ${formatAmount(num(l.hourRate))}元/h`)
      }
      if (num(l.materialFee) > 0) parts.push(`物料 ${formatAmount(num(l.materialFee))}元`)
      const subLines = parts.length
        ? p.wrap(parts.join(' · '), 11.5, false, p.innerW - 120)
        : []
      const top = y + 12
      nameLines.forEach((ln, k) => p.text(ln, M + 10, top + k * 19, 13.5, TEXT_MAIN, true))
      subLines.forEach((ln, k) =>
        p.text(ln, M + 10, top + nameLines.length * 19 + k * 16, 11.5, TEXT_SUB)
      )
      p.text(formatAmount(lineSubtotal(l)), right - 10, top, 13.5, TEXT_MAIN, true, 'right')
      y = top + nameLines.length * 19 + subLines.length * 16 + 12
      if (i < list.length - 1) {
        p.rect(M + 10, y - 1, p.innerW - 20, 1, DIVIDER_COLOR)
      }
    })
    y += 14

    /* 金额块 */
    p.rect(M, y, p.innerW, 116, PRIMARY, 14)
    let by = y + 16
    const moneyRow = (label: string, amount: string, bold = false, size = 13.5) => {
      p.text(label, M + 16, by, size, 'rgba(255,255,255,0.82)', bold)
      p.text(amount, right - 16, by, size, '#FFFFFF', bold, 'right')
      by += 26
    }
    moneyRow('费用小计', `${formatAmount(d.subtotalCents)} 元`)
    moneyRow(`税费（${Math.round(num(d.taxRatePercent))}%）`, `${formatAmount(d.taxCents)} 元`)
    p.rect(M + 16, by - 4, p.innerW - 32, 1, 'rgba(255,255,255,0.28)')
    by += 8
    p.text('本次报价合计', M + 16, by, 14, '#FFFFFF', true)
    p.text(`¥${formatAmount(d.totalCents)}`, right - 16, by - 3, 18, '#FFFFFF', true, 'right')
    y += 132
  }

  /* 备注 */
  const note = String(d.note || '').trim()
  if (note) {
    const noteLines = p.wrap(note, 12.5, false, p.innerW - 28)
    const boxH = 34 + noteLines.length * 18
    p.rect(M, y, p.innerW, boxH, BG_CARD, 12)
    p.text('备注', M + 14, y + 12, 12, TEXT_SUB, true)
    noteLines.forEach((ln, i) => p.text(ln, M + 14, y + 32 + i * 18, 12.5, TEXT_MAIN))
    y += boxH + 16
  }

  /* 参考图 */
  if (img && img.width) {
    p.text('参考图', M, y, 12, TEXT_SUB, true)
    y += 20
    const maxH = 260
    const ratio = img.height / img.width
    const w = p.innerW
    const h = Math.min(maxH, Math.round(w * ratio))
    if (p.draw) {
      p.ctx.save()
      p.ctx.beginPath()
      const rr = 12
      p.ctx.moveTo(M + rr, y)
      p.ctx.lineTo(M + w - rr, y)
      p.ctx.arcTo(M + w, y, M + w, y + rr, rr)
      p.ctx.lineTo(M + w, y + h - rr)
      p.ctx.arcTo(M + w, y + h, M + w - rr, y + h, rr)
      p.ctx.lineTo(M + rr, y + h)
      p.ctx.arcTo(M, y + h, M, y + h - rr, rr)
      p.ctx.lineTo(M, y + rr)
      p.ctx.arcTo(M, y, M + rr, y, rr)
      p.ctx.closePath()
      p.ctx.clip()
      p.ctx.drawImage(img, M, y, w, h)
      p.ctx.restore()
    }
    y += h + 18
  }

  /* 落款 */
  if (d.signName || d.signContact) {
    if (d.signName) {
      p.text(d.signName, right, y, 13, TEXT_MAIN, true, 'right')
      y += 20
    }
    if (d.signContact) {
      p.text(d.signContact, right, y, 11.5, TEXT_SUB, false, 'right')
      y += 18
    }
    y += 6
  }

  /* 页脚 */
  p.rect(M, y, p.innerW, 1, DIVIDER_COLOR)
  y += 14
  p.text('本报价单由「接单管家」生成，仅供报价参考', W / 2, y, 11, TEXT_SUB, false, 'center')
  return y + 30
}

/* ================= Canvas 节点与导出 ================= */
function getCanvasNode(selector: string): Promise<any> {
  return new Promise((resolve, reject) => {
    uni
      .createSelectorQuery()
      .select(selector)
      .fields({ node: true, size: true } as any, () => {})
      .exec((res: any) => {
        const node = res && res[0] && res[0].node
        if (node) resolve(node)
        else reject(new Error('未找到导出画布，请稍后重试'))
      })
  })
}

function resetCtx(ctx: any, dpr: number): void {
  if (typeof ctx.setTransform === 'function') ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  else if (typeof ctx.scale === 'function') ctx.scale(dpr, dpr)
}

function loadImage(canvas: any, path: string): Promise<any> {
  return new Promise((resolve) => {
    if (!path || typeof canvas.createImage !== 'function') return resolve(null)
    try {
      const img = canvas.createImage()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = path
    } catch {
      resolve(null)
    }
  })
}

function canvasToFile(canvas: any, w: number, h: number): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.canvasToTempFilePath({
      canvas,
      x: 0,
      y: 0,
      width: w,
      height: h,
      destWidth: w,
      destHeight: h,
      fileType: 'png',
      success: (res: any) => resolve(res.tempFilePath),
      fail: (err: any) => reject(new Error((err && err.errMsg) || '导出图片失败'))
    } as any)
  })
}

/**
 * 渲染报价单图片并返回临时文件路径。
 * 页面内需放置：<canvas type="2d" id="quote-canvas" class="export-canvas" />
 */
export async function exportQuoteSheet(data: QuoteSheetData, selector = '#quote-canvas'): Promise<string> {
  const canvas = await getCanvasNode(selector)
  const info = uni.getSystemInfoSync()
  const W = Math.max(300, Math.min(430, Math.round(Number(info.windowWidth) || 375)))
  const dpr = Math.min(2, Number(info.pixelRatio) || 2)
  const ctx = canvas.getContext('2d')
  const img = await loadImage(canvas, data.imagePath)

  // 第一遍：仅测量（不绘制），得到内容高度
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(120 * dpr)
  resetCtx(ctx, dpr)
  const dry = new Painter(ctx, W, false)
  const H = Math.ceil(layoutSheet(dry, data, img))

  // 第二遍：按内容高度绘制
  canvas.width = Math.round(W * dpr)
  canvas.height = Math.round(H * dpr)
  resetCtx(ctx, dpr)
  const painter = new Painter(ctx, W, true)
  layoutSheet(painter, data, img)

  return canvasToFile(canvas, Math.round(W * dpr), Math.round(H * dpr))
}

/** 保存图片到相册（无权限时引导打开设置） */
export function saveImageToAlbum(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    uni.saveImageToPhotosAlbum({
      filePath: path,
      success: () => resolve(),
      fail: (err: any) => {
        const msg = String((err && err.errMsg) || '')
        if (msg.indexOf('auth') >= 0 || msg.indexOf('authorize') >= 0) {
          uni.showModal({
            title: '需要相册权限',
            content: '请在「设置」中允许保存图片到相册后重试',
            confirmText: '去设置',
            success: (r) => {
              if (r.confirm) uni.openSetting({} as any)
            }
          })
          reject(new Error('未授权相册权限'))
          return
        }
        reject(new Error(msg || '保存失败'))
      }
    } as any)
  })
}
