<template>
  <view class="page">
    <template v-if="quote">
      <view class="hero card">
        <view class="hero-row">
          <text class="hero-title">{{ quote.title || '未命名报价' }}</text>
          <text class="status-badge" :style="statusStyle">{{ statusText }}</text>
        </view>
        <view class="tag-row">
          <text class="tag" @tap="goCustomer">{{ customerName || '未关联客户' }}</text>
          <text v-if="projectName" class="tag link" @tap="goProject">{{ projectName }}</text>
        </view>
        <text class="hero-amount">¥{{ formatAmount(total) }}</text>
        <view class="hero-actions">
          <view class="btn ghost" @tap="goEdit">编辑</view>
          <view class="btn danger-ghost" @tap="confirmDelete">删除</view>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">报价流转</text>
        <text class="section-count">报价转待收款 / 成交转项目</text>
      </view>
      <view class="card flow-card">
        <view v-if="!isFullQuote" class="flow-item" @tap="convertToFull">
          <view class="flow-main">
            <text class="flow-name">转为详细报价</text>
            <text class="flow-desc">按明细重新出单，金额自动生成一行</text>
          </view>
          <text class="flow-arrow">›</text>
        </view>
        <view class="flow-item" @tap="toPendingCollection">
          <view class="flow-main">
            <text class="flow-name">转为待收款</text>
            <text class="flow-desc">可在看板查看待收尾款</text>
          </view>
          <text class="flow-arrow">›</text>
        </view>
        <view class="flow-item" @tap="toProject">
          <view class="flow-main">
            <text class="flow-name">确认成交转正式项目</text>
            <text class="flow-desc">指定客户后创建正式项目并回填关联</text>
          </view>
          <text class="flow-arrow">›</text>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">导出与分享</text>
        <text class="section-count">小程序落图 + 网页</text>
      </view>
      <view class="card flow-card">
        <view class="flow-item" @tap="exportQuote">
          <view class="flow-main">
            <text class="flow-name">导出报价单</text>
            <text class="flow-desc">生成报价单图片，可保存相册 / 预览转发给客户</text>
          </view>
          <text class="flow-arrow">›</text>
        </view>
        <view class="flow-item" @tap="shareWebQuote">
          <view class="flow-main">
            <text class="flow-name">网页分享</text>
            <text class="flow-desc">生成可在微信 / 浏览器打开的报价单网页并复制</text>
          </view>
          <text class="flow-arrow">›</text>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">报价明细</text>
        <text class="section-count">{{ lines.length ? `共 ${lines.length} 项` : '无明细' }}</text>
      </view>
      <view v-if="!lines.length" class="empty card">该报价单无逐项明细</view>
      <view v-else class="list">
        <view v-for="(l, i) in lines" :key="i" class="line-card card">
          <view class="line-main">
            <text class="line-name">{{ l.itemName || '未命名项' }}</text>
            <text class="line-desc">{{ descOf(l) }}</text>
          </view>
          <text class="line-amount">¥{{ formatAmount(subtotalOf(l)) }}</text>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">标头信息</text>
      </view>
      <view class="card info-card">
        <view class="info-row">
          <text class="info-label">报价类型</text>
          <text class="info-value">{{ typeLabel }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">税率</text>
          <text class="info-value">{{ taxRate }}%</text>
        </view>
        <view class="info-row">
          <text class="info-label">金额口径</text>
          <text class="info-value">{{ taxIncludeText(taxInclude) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">创建时间</text>
          <text class="info-value">{{ formatDateTime(createdAt) }}</text>
        </view>
        <view class="info-row" v-if="note">
          <text class="info-label">备注</text>
          <text class="info-value note-text">{{ note }}</text>
        </view>
      </view>
    </template>
    <view v-else-if="!loading" class="empty card">报价单不存在或已删除</view>

    <!-- 报价单导出画布（离屏渲染，版式对齐 App 导出 PDF） -->
    <canvas type="2d" id="quote-canvas" class="export-canvas" />

    <!-- 确认成交 · 选择客户（对齐 App _pickCustomerForProject 弹窗） -->
    <view v-if="pickerVisible" class="pick-mask" @tap="closePicker">
      <view class="pick-pop" @tap.stop>
        <text class="pick-title">确认成交 · 选择客户</text>
        <text class="pick-desc">将「{{ quoteTitle }}」转为正式项目，需指定所属客户：</text>
        <template v-if="pickerCustomers.length">
          <text class="pick-label">已有客户</text>
          <scroll-view class="pick-list" scroll-y>
            <view
              v-for="c in pickerCustomers"
              :key="c.id"
              class="pick-row"
              @tap="onPickCustomer(c.id)"
            >
              <text class="pick-name">{{ c.name || '未命名' }}</text>
              <text class="pick-check" :class="{ on: selectedCustomerId === c.id }">
                {{ selectedCustomerId === c.id ? '✓' : '' }}
              </text>
            </view>
          </scroll-view>
          <view class="pick-divider"></view>
          <text class="pick-label">或新建客户：</text>
        </template>
        <input
          v-model="newCustomerName"
          class="pick-input"
          placeholder="新客户名称"
          @input="onNewNameInput"
        />
        <view class="pick-actions">
          <view class="pick-btn" @tap="closePicker">取消</view>
          <view class="pick-btn primary" @tap="confirmPickCustomer">确认成交</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDateTime, quoteStatusText, taxIncludeText } from '@/utils/format'
import { exportQuoteSheet, saveImageToAlbum } from '@/utils/quote-image'
import type { QuoteSheetData } from '@/utils/quote-image'
import { quoteShareDataOf, shareQuoteWeb } from '@/utils/quote-share'
import { quoteSubtotal, quoteTax, readSignature } from '@/utils/quote-helper'
import type { Quote, Customer, Project, DataRow, QuoteLine } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const quoteId = ref(0)
const loading = ref(true)
const quote = ref<Quote | null>(null)
/** 流转操作进行中（防重复触发） */
const flowBusy = ref(false)
/** 确认成交 · 选择客户弹层 */
const pickerVisible = ref(false)
const selectedCustomerId = ref(0)
const newCustomerName = ref('')

const STATUS_COLOR: Record<number, string> = {
  0: '#8A93A6',
  1: '#4A5AF0',
  2: '#16A085',
  3: '#E67E22',
  4: '#C0392B'
}

interface QLine {
  itemName?: string
  hours?: number
  hourRate?: number
  materialFee?: number
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function rowOf(q: Quote): DataRow {
  return q as DataRow
}

const total = computed(() => num(rowOf(quote.value as Quote)['total']))
const taxRate = computed(() => num(rowOf(quote.value as Quote)['tax_rate']))
const taxInclude = computed(() => num(rowOf(quote.value as Quote)['tax_include']))
const createdAt = computed(() => num(rowOf(quote.value as Quote)['created_at']))
const note = computed(() => String(rowOf(quote.value as Quote)['note'] ?? ''))

const statusText = computed(() => quoteStatusText(num(rowOf(quote.value as Quote)['status'])))
const statusStyle = computed(() => {
  const s = num(rowOf(quote.value as Quote)['status'])
  const color = STATUS_COLOR[s] || '#8A93A6'
  return { color, backgroundColor: `${color}1A` }
})

const typeLabel = computed(() =>
  String(rowOf(quote.value as Quote)['quote_type'] ?? '') === 'full' ? '详细报价' : '报价单'
)

const customerName = computed(() => {
  const c = data.findById(
    data.customers as unknown as Customer[],
    num(rowOf(quote.value as Quote)['customer_id'])
  )
  return (c as Customer | undefined)?.name || ''
})

const projectName = computed(() => {
  const p = data.findById(
    data.projects as unknown as Project[],
    num(rowOf(quote.value as Quote)['project_id'])
  )
  return (p as Project | undefined)?.title || ''
})

const lines = computed<QLine[]>(() => {
  const raw = String(rowOf(quote.value as Quote)['lines_json'] ?? '[]')
  try {
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as QLine[]) : []
  } catch {
    return []
  }
})

function descOf(l: QLine): string {
  const parts: string[] = []
  if (num(l.hours) > 0) parts.push(`工时 ${l.hours}h`)
  if (num(l.hourRate) > 0) parts.push(`单价 ¥${formatAmount(num(l.hourRate))}/h`)
  if (num(l.materialFee) > 0) parts.push(`材料 ¥${formatAmount(num(l.materialFee))}`)
  return parts.join(' · ') || '—'
}

function subtotalOf(l: QLine): number {
  return Math.round(num(l.hours) * num(l.hourRate)) + num(l.materialFee)
}

async function load() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  quote.value =
    ((data.quotes as Quote[]).find((r) => Number(r.id) === quoteId.value) as Quote) || null
  loading.value = false
}

onLoad((q) => {
  quoteId.value = Number(q?.id ?? 0)
})

onShow(() => {
  load()
})

function goEdit() {
  uni.navigateTo({ url: `/pages/quote/form?id=${quoteId.value}` })
}

function goCustomer() {
  const id = num(rowOf(quote.value as Quote)['customer_id'])
  if (id > 0) uni.navigateTo({ url: `/pages/customer/detail?id=${id}` })
}

function goProject() {
  const id = num(rowOf(quote.value as Quote)['project_id'])
  if (id > 0) uni.navigateTo({ url: `/pages/project/detail?id=${id}` })
}

function confirmDelete() {
  const q = quote.value
  if (!q) return
  uni.showModal({
    title: '删除报价单',
    content: `确定删除报价单"${q.title || ''}"吗？删除后不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeQuote(quoteId.value)
      if (ok) {
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      }
    }
  })
}

/* ---------------- 报价流转（对齐 App _quoteFlows 三个动作 + 提示文案） ---------------- */

const isFullQuote = computed(
  () => String(rowOf(quote.value as Quote)['quote_type'] ?? '') === 'full'
)
const quoteTitle = computed(() => String(quote.value?.title ?? ''))
const pickerCustomers = computed(() => data.customers as Customer[])

function toastFlow(title: string) {
  uni.showToast({ title, icon: 'none', duration: 2500 })
}

/**
 * 转为详细报价（对齐 App _convertToFull）：
 * 作为新报价重新出单，标题沿用，金额自动生成一行明细
 * （项目名 = 报价对象名、工时 1、单价 = 原报价金额），税率归零，备注沿用。
 */
function convertToFull() {
  const q = quote.value
  if (!q || flowBusy.value) return
  const row = rowOf(q)
  const name = q.title || ''
  const payload: DataRow = {
    title: name,
    note: String(row['note'] ?? ''),
    quote_type: 'full',
    tax_rate: 0,
    total: total.value,
    image_path: String(row['image_path'] ?? ''),
    customer_id: num(row['customer_id']),
    project_id: num(row['project_id']),
    lines_json: JSON.stringify([
      { itemName: name, hours: 1, hourRate: total.value, materialFee: 0 }
    ])
  }
  try {
    uni.setStorageSync('quote_convert_apply', JSON.stringify(payload))
  } catch {
    toastFlow('转为详细报价失败，请重试')
    return
  }
  toastFlow('已转为详细报价，可继续调整明细')
  setTimeout(() => uni.navigateTo({ url: '/pages/quote/form?convert=1' }), 400)
}

/** 转为待收款（对齐 App _quoteToPendingCollection）：写入待收款记录，可在看板查看待收尾款 */
async function toPendingCollection() {
  const q = quote.value
  if (!q || flowBusy.value) return
  const row = rowOf(q)
  flowBusy.value = true
  const ok = await data.createPendingCollection(
    {
      quote_id: quoteId.value,
      project_id: num(row['project_id']) || null,
      customer_id: num(row['customer_id']) || null,
      title: q.title || '',
      amount: total.value,
      created_at: Date.now()
    },
    { silent: true }
  )
  flowBusy.value = false
  if (!ok) {
    toastFlow('转为待收款失败，请检查网络后重试')
    return
  }
  toastFlow('已转为待收款，可在看板查看待收尾款')
}

/** 确认成交转正式项目（对齐 App _quoteToProject 入口）：无客户时先选择/新建客户 */
function toProject() {
  const q = quote.value
  if (!q || flowBusy.value) return
  const cid = num(rowOf(q)['customer_id'])
  if (cid > 0) {
    createProjectFor(cid)
    return
  }
  const list = data.customers as Customer[]
  selectedCustomerId.value = list.length === 1 ? num(list[0].id) : 0
  newCustomerName.value = ''
  pickerVisible.value = true
}

function onPickCustomer(id: number) {
  selectedCustomerId.value = num(id)
  newCustomerName.value = ''
}

/** 输入新客户名称时取消已有客户选中（对齐 App 弹窗 onChanged 行为） */
function onNewNameInput() {
  if (newCustomerName.value.trim()) selectedCustomerId.value = 0
}

function closePicker() {
  if (flowBusy.value) return
  pickerVisible.value = false
}

/** 确认选择：新建客户优先，其次使用已选已有客户 */
async function confirmPickCustomer() {
  if (flowBusy.value) return
  const name = newCustomerName.value.trim()
  let cid = 0
  if (name) {
    const ok = await data.createCustomer({ name, created_at: Date.now() })
    if (!ok) {
      toastFlow('新建客户失败，请检查网络后重试')
      return
    }
    const created = (data.customers as Customer[])
      .filter((c) => String(c.name ?? '') === name)
      .sort((a, b) => num(b.id) - num(a.id))[0]
    cid = num(created?.id)
  } else {
    cid = selectedCustomerId.value
  }
  if (!cid) {
    toastFlow('请选择已有客户或填写新客户名称')
    return
  }
  pickerVisible.value = false
  await createProjectFor(cid)
}

/** 创建正式项目并回填报价单关联（对齐 App _quoteToProject） */
async function createProjectFor(customerId: number) {
  const q = quote.value
  if (!q || flowBusy.value) return
  flowBusy.value = true
  const title = q.title || ''
  const ok = await data.createProject({
    customer_id: customerId,
    title,
    status: 0, // ProjectStatus.accepted（接单），正式项目
    amount_total: total.value,
    progress: 0
  })
  if (!ok) {
    flowBusy.value = false
    toastFlow('创建项目失败，请检查网络后重试')
    return
  }
  const created = (data.projects as Project[])
    .filter((p) => String(p.title ?? '') === title && num((p as unknown as DataRow)['customer_id']) === customerId)
    .sort((a, b) => num(b.id) - num(a.id))[0]
  const projectId = num(created?.id)
  if (projectId > 0) {
    await data.updateQuote(
      quoteId.value,
      {
        project_id: projectId,
        customer_id: num(rowOf(q)['customer_id']) || customerId
      },
      { silent: true }
    )
  }
  flowBusy.value = false
  await load()
  toastFlow('已确认成交并创建正式项目')
}

/* ---------------- 导出与分享（对齐 App「导出PDF」：小程序落图 + 生成网页） ---------------- */

/** 导出进行中（防重复触发） */
const exportBusy = ref(false)

/** 组装报价单渲染数据（版式对齐 App QuotePdfData） */
function sheetDataOf(q: Quote): QuoteSheetData {
  const row = rowOf(q)
  const sig = readSignature()
  return {
    code: num(q.id),
    title: String(q.title ?? ''),
    isSimple: !isFullQuote.value,
    customerName: customerName.value || '未关联客户',
    projectName: projectName.value,
    note: note.value,
    taxRatePercent: taxRate.value,
    subtotalCents: quoteSubtotal(q),
    taxCents: quoteTax(q),
    totalCents: total.value,
    lines: lines.value as unknown as QuoteLine[],
    createdAt: createdAt.value,
    status: num(row['status']),
    signName: sig.name,
    signContact: sig.contact,
    imagePath: String(row['image_path'] ?? '')
  }
}

/** 导出报价单：小程序无法落 PDF，改为生成报价单图片（保存相册 / 预览转发） */
async function exportQuote() {
  const q = quote.value
  if (!q || exportBusy.value) return
  exportBusy.value = true
  uni.showLoading({ title: '正在生成报价单…', mask: true })
  try {
    const path = await exportQuoteSheet(sheetDataOf(q))
    exportBusy.value = false
    uni.hideLoading()
    uni.showActionSheet({
      itemList: ['保存到相册', '预览大图'],
      success: (res) => {
        if (res.tapIndex === 0) saveToAlbum(path)
        else if (res.tapIndex === 1) uni.previewImage({ urls: [path], current: path })
      }
    })
  } catch (e) {
    exportBusy.value = false
    uni.hideLoading()
    uni.showToast({ title: `导出报价单失败：${(e as Error).message}`, icon: 'none' })
  }
}

/** 保存导出的报价单图片到相册（无权限时由 skill 侧引导打开设置） */
async function saveToAlbum(path: string) {
  try {
    await saveImageToAlbum(path)
    uni.showToast({ title: '已保存到相册', icon: 'success' })
  } catch (e) {
    const msg = (e as Error).message || ''
    if (msg !== '未授权相册权限') uni.showToast({ title: '保存失败，请重试', icon: 'none' })
  }
}

/** 网页分享：生成自包含 HTML 报价页并复制（可在微信 / 浏览器打开，对齐 App 分享能力） */
function shareWebQuote() {
  const q = quote.value
  if (!q) return
  shareQuoteWeb(quoteShareDataOf(q, data.customers as Customer[], data.projects as Project[]))
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.hero-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
  flex: 1;
  margin-right: 16rpx;
}

.hero-row {
  display: flex;
  align-items: center;
}

.status-badge {
  font-size: 22rpx;
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.tag-row {
  margin-top: 14rpx;
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
}

.tag {
  font-size: 24rpx;
  color: #8a93a6;
  background: #f2f4fa;
  padding: 6rpx 18rpx;
  border-radius: 24rpx;
}

.tag.link {
  color: #4a5af0;
}

.hero-amount {
  display: block;
  margin-top: 16rpx;
  font-size: 48rpx;
  font-weight: 700;
  color: #4a5af0;
}

.hero-actions {
  margin-top: 28rpx;
  display: flex;
  gap: 20rpx;
}

.btn {
  padding: 14rpx 48rpx;
  border-radius: 36rpx;
  font-size: 26rpx;
  text-align: center;
}

.ghost {
  border: 1rpx solid #4a5af0;
  color: #4a5af0;
}

.danger-ghost {
  border: 1rpx solid rgba(231, 76, 60, 0.5);
  color: #e74c3c;
}

.section-head {
  margin: 28rpx 4rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.section-count {
  font-size: 24rpx;
  color: #9ca3af;
}

.empty {
  color: #9ca3af;
  text-align: center;
  font-size: 28rpx;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

/* 报价流转 */
.flow-card {
  padding: 8rpx 28rpx;
}

.flow-item {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f0f2f6;

  &:last-child {
    border-bottom: none;
  }
}

.flow-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.flow-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #1f2430;
}

.flow-desc {
  font-size: 23rpx;
  color: #9ca3af;
  margin-top: 6rpx;
}

.flow-arrow {
  font-size: 36rpx;
  color: #c8ccd6;
  margin-left: 16rpx;
}

/* 确认成交 · 选择客户弹层 */
.pick-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48rpx;
}

.pick-pop {
  width: 100%;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx 28rpx 24rpx;
  display: flex;
  flex-direction: column;
}

.pick-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
  text-align: center;
}

.pick-desc {
  font-size: 25rpx;
  color: #6b7280;
  margin-top: 14rpx;
  line-height: 1.6;
}

.pick-label {
  font-size: 25rpx;
  color: #6b7280;
  margin-top: 20rpx;
}

.pick-list {
  max-height: 420rpx;
  margin-top: 10rpx;
}

.pick-row {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  border-bottom: 1rpx solid #f4f6fa;
}

.pick-name {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.pick-check {
  width: 40rpx;
  text-align: center;
  font-size: 30rpx;
  color: transparent;
}

.pick-check.on {
  color: #4a5af0;
}

.pick-divider {
  height: 1rpx;
  background: #eef0f5;
  margin: 20rpx 0 0;
}

.pick-input {
  margin-top: 14rpx;
  height: 84rpx;
  background: #f6f7fb;
  border-radius: 14rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1f2430;
}

.pick-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.pick-btn {
  flex: 1;
  height: 84rpx;
  line-height: 84rpx;
  text-align: center;
  border-radius: 42rpx;
  font-size: 29rpx;
  color: #4a5af0;
  background: #eef0fe;
}

.pick-btn.primary {
  background: #4a5af0;
  color: #fff;
}

.line-card {
  display: flex;
  align-items: center;
}

.line-main {
  flex: 1;
  min-width: 0;
}

.line-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.line-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.line-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
}

.info-row {
  display: flex;
  padding: 14rpx 0;
  border-bottom: 1rpx solid #f4f5f8;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  width: 180rpx;
  font-size: 26rpx;
  color: #8a93a6;
  flex-shrink: 0;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #1f2430;
  text-align: right;
}

.note-text {
  color: #4b5563;
}

/* 离屏导出画布（不参与页面布局，仅供 Canvas 2D 渲染报价单图片） */
.export-canvas {
  position: fixed;
  left: -2000rpx;
  top: 0;
  width: 750rpx;
  height: 1200rpx;
  pointer-events: none;
  z-index: -1;
}
</style>
