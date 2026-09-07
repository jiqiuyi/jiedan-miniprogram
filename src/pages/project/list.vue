<template>
  <view class="page">
    <view v-if="data.loading && !data.projects.length" class="empty">加载中...</view>
    <view v-else-if="!data.projects.length" class="empty">暂无项目</view>

    <view v-else class="proj-list">
      <view
        v-for="p in data.projects"
        :key="p.id"
        class="proj-card"
        @tap="goDetail(p.id)"
      >
        <view class="proj-head">
          <text class="proj-title">{{ p.title || '未命名项目' }}</text>
          <text class="proj-amount">¥{{ formatAmount(p.amount_total) }}</text>
        </view>
        <view class="proj-sub">
          <text>{{ customerName(p.customer_id) }}</text>
          <text class="dot">·</text>
          <text>{{ statusText(p.status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, projectStatusText } from '@/utils/format'

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
  uni.navigateTo({ url: `/pages/project/detail?id=${id}` })
}

function customerName(cid?: number) {
  const c = cid != null ? data.findById(data.customers, cid) : undefined
  return c?.name || '未关联客户'
}

function statusText(s: unknown) {
  return projectStatusText(s == null ? undefined : Number(s))
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

.proj-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.proj-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.proj-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.proj-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  flex: 1;
  margin-right: 16rpx;
}

.proj-amount {
  font-size: 30rpx;
  font-weight: 700;
  color: #2b6bff;
}

.proj-sub {
  margin-top: 12rpx;
  display: flex;
  gap: 12rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.dot {
  color: #d1d5db;
}
</style>
