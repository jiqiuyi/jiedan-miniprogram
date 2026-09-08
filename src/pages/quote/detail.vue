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
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import {
  formatAmount,
  formatDateTime,
  quoteStatusText,
  taxIncludeText
} from '@/utils/format'
import type { Quote, Customer, Project, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const quoteId = ref(0)
const loading = ref(true)
const quote = ref<Quote | null>(null)

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
</style>
