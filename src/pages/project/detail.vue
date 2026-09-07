<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="project" class="content">
      <view class="head-card">
        <view class="head-title">{{ project.title || '未命名项目' }}</view>
        <view class="head-amount">
          <text class="amount-symbol">¥</text>
          <text class="amount-num">{{ formatAmount(project.amount_total) }}</text>
        </view>
        <view class="head-flags">
          <text class="flag" :class="'flag-' + statusKey">{{ statusText(project.status) }}</text>
          <text class="flag flag-default">{{ project.status === 2 ? '已收款' : '未收款' }}</text>
        </view>
      </view>

      <view class="card">
        <view class="info-row">
          <text class="info-label">客户</text>
          <text class="info-value link" @tap="gotoCustomer(project.customer_id)">{{ customerName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">开始时间</text>
          <text class="info-value">{{ formatDate(project.start_time) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">截止时间</text>
          <text class="info-value">{{ formatDate(project.deadline) }}</text>
        </view>
        <view class="info-row" v-if="project.remark">
          <text class="info-label">备注</text>
          <text class="info-value">{{ project.remark }}</text>
        </view>
      </view>

      <view class="section-title">关联报价</view>
      <view v-if="!relatedQuotes.length" class="empty small">无关联报价</view>
      <view v-for="q in relatedQuotes" :key="q.id" class="rel-card" @tap="gotoQuote(q.id)">
        <text class="rel-title">{{ q.title || '未命名报价' }}</text>
        <text class="rel-amount">¥{{ formatAmount(q.total) }}</text>
      </view>
    </view>
    <view v-else class="empty">项目不存在或已被删除</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate, projectStatusText } from '@/utils/format'
import type { Quote } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()
const id = ref(0)
const loading = ref(true)

const project = computed(() => data.findById(data.projects, id.value))
const statusKey = computed(() => Number(project.value?.status ?? 0))

const customerName = computed(() => {
  const c = project.value?.customer_id != null
    ? data.findById(data.customers, project.value.customer_id)
    : undefined
  return c?.name || '未关联客户'
})

const relatedQuotes = computed(() =>
  (data.quotes as Quote[]).filter((q) => Number(q.project_id) === id.value)
)

onLoad((opt) => {
  id.value = Number(opt?.id || 0)
})

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  loading.value = false
})

function statusText(s: unknown) {
  return projectStatusText(s == null ? undefined : Number(s))
}

function gotoCustomer(cid: number | undefined) {
  if (cid) {
    uni.navigateTo({ url: `/pages/customer/detail?id=${cid}` })
  }
}

function gotoQuote(qid: number) {
  uni.navigateTo({ url: `/pages/quote/detail?id=${qid}` })
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

  &.small {
    padding: 40rpx 0;
  }
}

.head-card {
  background: linear-gradient(135deg, #2b6bff, #5b8dff);
  border-radius: 24rpx;
  padding: 40rpx;
  color: #fff;
  margin-bottom: 24rpx;
}

.head-title {
  font-size: 36rpx;
  font-weight: 700;
}

.head-amount {
  margin-top: 16rpx;
  display: flex;
  align-items: baseline;
}

.amount-symbol {
  font-size: 28rpx;
}

.amount-num {
  font-size: 56rpx;
  font-weight: 700;
}

.head-flags {
  margin-top: 20rpx;
  display: flex;
  gap: 16rpx;
}

.flag {
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 24rpx;
}

.flag-1 {
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
}

.flag-0 {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.flag-default {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 12rpx 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.info-row {
  display: flex;
  padding: 22rpx 0;
  border-bottom: 2rpx solid #f5f6fa;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #1f2430;
}

.link {
  color: #2b6bff;
}

.section-title {
  margin: 32rpx 8rpx 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.rel-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.rel-title {
  font-size: 28rpx;
  color: #1f2430;
}

.rel-amount {
  font-size: 28rpx;
  font-weight: 600;
  color: #2b6bff;
}
</style>
