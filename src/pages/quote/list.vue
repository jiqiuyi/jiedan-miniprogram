<template>
  <view class="page">
    <view class="search-box">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索报价标题 / 客户"
        confirm-type="search"
      />
    </view>

    <view v-if="data.loading && !filtered.length" class="empty">加载中...</view>
    <view v-else-if="!filtered.length" class="empty">暂无报价，点右下角新建</view>
    <view v-else class="list">
      <view v-for="q in filtered" :key="String(q.id)" class="card" @tap="goDetail(q.id)">
        <view class="card-main">
          <view class="title-row">
            <text class="card-title">{{ q.title || '未命名报价' }}</text>
            <text class="status-badge" :style="statusStyle(q)">{{ statusTextOf(q) }}</text>
          </view>
          <text class="card-sub">{{ customerNameOf(q) }} · {{ typeLabelOf(q) }}</text>
          <view class="amount-row">
            <text class="card-amount">¥{{ formatAmount(totalOf(q)) }}</text>
            <text class="card-date">{{ formatDate(createdOf(q)) }}</text>
          </view>
        </view>
        <view class="card-side">
          <view class="more" @tap.stop="showActions(q)">···</view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <view class="fab" @tap="goAdd">＋</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate, quoteStatusText } from '@/utils/format'
import type { Quote, Customer, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const keyword = ref('')

const STATUS_COLOR: Record<number, string> = {
  0: '#8A93A6', // 草稿
  1: '#4A5AF0', // 已发送
  2: '#16A085', // 客户确认
  3: '#E67E22', // 已成交
  4: '#C0392B' // 已作废
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function rowOf(q: Quote): DataRow {
  return q as DataRow
}

function totalOf(q: Quote): number {
  return num(rowOf(q)['total'])
}

function createdOf(q: Quote): number {
  return num(rowOf(q)['created_at'])
}

function statusOf(q: Quote): number {
  return num(rowOf(q)['status'])
}

function statusTextOf(q: Quote): string {
  return quoteStatusText(statusOf(q))
}

function statusStyle(q: Quote): Record<string, string> {
  const color = STATUS_COLOR[statusOf(q)] || '#8A93A6'
  return { color, backgroundColor: `${color}1A` }
}

function typeLabelOf(q: Quote): string {
  return String(rowOf(q)['quote_type'] ?? '') === 'full' ? '详细报价' : '报价单'
}

function customerNameOf(q: Quote): string {
  const c = data.findById(
    data.customers as unknown as Customer[],
    num(rowOf(q)['customer_id'])
  )
  return (c as Customer | undefined)?.name || '未关联客户'
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return (data.quotes as Quote[]).filter((q) => {
    if (!kw) return true
    return `${q.title || ''} ${customerNameOf(q)}`.toLowerCase().includes(kw)
  })
})

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
})

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/quote/detail?id=${String(id)}` })
}

function goAdd() {
  uni.navigateTo({ url: '/pages/quote/form' })
}

function showActions(q: Quote) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/quote/form?id=${q.id}` })
      } else if (res.tapIndex === 1) {
        confirmDelete(q)
      }
    }
  })
}

function confirmDelete(q: Quote) {
  uni.showModal({
    title: '删除报价单',
    content: `确定删除报价单"${q.title || ''}"吗？删除后不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      await data.removeQuote(Number(q.id))
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.search-box {
  background: #f1f2f7;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
}

.search-input {
  height: 76rpx;
  font-size: 28rpx;
  color: #1f2430;
}

.empty {
  padding-top: 160rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.card-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.amount-row {
  margin-top: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #4a5af0;
}

.card-date {
  font-size: 22rpx;
  color: #b6bcc9;
}

.card-side {
  display: flex;
  align-items: center;
}

.more {
  padding: 8rpx 16rpx;
  color: #8a93a6;
  font-size: 32rpx;
  letter-spacing: 2rpx;
}

.chevron {
  font-size: 40rpx;
  color: #c4c9d4;
  margin-left: 4rpx;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 60rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #4a5af0;
  color: #fff;
  font-size: 56rpx;
  line-height: 100rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 90, 240, 0.4);
}
</style>
