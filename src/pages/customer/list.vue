<template>
  <view class="page">
    <view v-if="data.loading && !data.customers.length" class="empty">加载中...</view>
    <view v-else-if="!data.customers.length" class="empty">暂无客户</view>

    <view v-else class="cus-list">
      <view
        v-for="c in data.customers"
        :key="c.id"
        class="cus-card"
        @tap="goDetail(c.id)"
      >
        <view class="cus-avatar">{{ avatarText(c.name) }}</view>
        <view class="cus-info">
          <text class="cus-name">{{ c.name || '未命名' }}</text>
          <text class="cus-sub">{{ c.contact || c.phone ? (c.contact || c.phone) : '暂无联系方式' }}</text>
        </view>
        <text class="cus-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'

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
  uni.navigateTo({ url: `/pages/customer/detail?id=${id}` })
}

function avatarText(name: string | undefined) {
  return (name || '?').slice(0, 1)
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

.cus-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.cus-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.cus-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: #e8f0ff;
  color: #2b6bff;
  font-size: 32rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  margin-right: 20rpx;
}

.cus-info {
  flex: 1;
}

.cus-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.cus-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.cus-arrow {
  color: #d1d5db;
  font-size: 32rpx;
}
</style>
