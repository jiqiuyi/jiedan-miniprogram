<template>
  <view class="page">
    <view v-if="data.loading && !data.quotes.length" class="empty">加载中...</view>

    <view v-else-if="!data.quotes.length" class="empty">
      <text>暂无报价单</text>
    </view>

    <view v-else class="quote-list">
      <view
        v-for="q in data.quotes"
        :key="q.id"
        class="quote-card"
        @tap="goDetail(q.id)"
      >
        <view class="card-head">
          <text class="q-title">{{ q.title || '未命名报价' }}</text>
          <text class="q-amount">¥{{ formatAmount(q.total) }}</text>
        </view>
        <view class="card-sub">
          <text>{{ q.customer_name || '未关联客户' }}</text>
          <text class="dot">·</text>
          <text>{{ formatDate(q.create_time) }}</text>
        </view>
        <view class="card-foot">
          <text class="tag" :class="statusClass(q.status)">{{ statusText(q.status) }}</text>
          <text class="view-more">查看详情 ›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate } from '@/utils/format'

const data = useDataStore()
const user = useUserStore()

onShow(() => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  data.refresh()
})

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/quote/detail?id=${id}` })
}

function statusText(status: unknown) {
  const m: Record<number, string> = { 0: '草稿', 1: '已发送', 2: '已确认', 3: '已成交' }
  return m[Number(status ?? 0)] || '未知'
}

function statusClass(status: unknown) {
  const n = Number(status ?? 0)
  if (n === 3) return 'tag-ok'
  if (n === 2) return 'tag-ok'
  if (n === 1) return 'tag-info'
  return 'tag-default'
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
}

.quote-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.quote-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx 28rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.q-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  flex: 1;
  margin-right: 16rpx;
}

.q-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #2b6bff;
}

.card-sub {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.dot {
  color: #d1d5db;
}

.card-foot {
  margin-top: 20rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 18rpx;
  border-top: 2rpx solid #f2f3f7;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
}

.tag-default {
  background: #f3f4f6;
  color: #6b7280;
}

.tag-info {
  background: #e8f0ff;
  color: #2b6bff;
}

.tag-ok {
  background: #e6f7ee;
  color: #21b263;
}

.view-more {
  font-size: 24rpx;
  color: #9ca3af;
}
</style>
