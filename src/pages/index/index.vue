<template>
  <view class="page">
    <!-- 未登录引导 -->
    <view v-if="!user.isLoggedIn" class="login-banner">
      <view class="banner-text">登录后查看报价与客户项目</view>
      <button class="login-btn" @tap="goLogin">立即登录</button>
    </view>

    <!-- 已登录 -->
    <template v-else>
      <view class="greet-card">
        <view class="greet-name">{{ nickname }}</view>
        <view class="greet-sub">欢迎回来，最近同步于 {{ lastSyncText }}</view>
      </view>

      <view class="stat-row">
        <view class="stat-card" @tap="goto('/pages/quote/list')">
          <text class="stat-num">{{ data.quotes.length }}</text>
          <text class="stat-label">报价单</text>
        </view>
        <view class="stat-card" @tap="goto('/pages/customer/list')">
          <text class="stat-num">{{ data.customers.length }}</text>
          <text class="stat-label">客户</text>
        </view>
        <view class="stat-card" @tap="goto('/pages/project/list')">
          <text class="stat-num">{{ data.projects.length }}</text>
          <text class="stat-label">项目</text>
        </view>
      </view>

      <view class="quick-title">快捷入口</view>
      <view class="quick-list">
        <view class="quick-item" @tap="goto('/pages/quote/list')">
          <text class="qi-icon">📄</text>
          <text>我的报价</text>
        </view>
        <view class="quick-item" @tap="goto('/pages/customer/list')">
          <text class="qi-icon">👥</text>
          <text>客户管理</text>
        </view>
        <view class="quick-item" @tap="goto('/pages/project/list')">
          <text class="qi-icon">🗂</text>
          <text>项目管理</text>
        </view>
      </view>

      <view class="logout-btn" @tap="onLogout">退出登录</view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatDateTime } from '@/utils/format'

const user = useUserStore()
const data = useDataStore()

const nickname = computed(() => user.userInfo?.nickname || '用户')
const lastSyncText = computed(() =>
  data.lastSyncAt ? formatDateTime(data.lastSyncAt) : '尚未同步'
)

onShow(() => {
  if (user.isLoggedIn) {
    data.refresh()
  }
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function goto(url: string) {
  uni.switchTab({ url })
}

function onLogout() {
  uni.showModal({
    title: '提示',
    content: '确定退出登录吗？',
    success: (res) => {
      if (res.confirm) user.logout()
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 32rpx;
}

.login-banner {
  background: linear-gradient(135deg, #2b6bff, #5b8dff);
  border-radius: 24rpx;
  padding: 64rpx 40rpx;
  text-align: center;
  color: #fff;
}

.banner-text {
  font-size: 32rpx;
  font-weight: 600;
}

.login-btn {
  margin-top: 32rpx;
  width: 240rpx;
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  color: #2b6bff;
  font-weight: 600;
  border-radius: 40rpx;
  font-size: 28rpx;
}

.greet-card {
  background: linear-gradient(135deg, #2b6bff, #5b8dff);
  border-radius: 24rpx;
  padding: 40rpx;
  color: #fff;
}

.greet-name {
  font-size: 40rpx;
  font-weight: 700;
}

.greet-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.stat-row {
  display: flex;
  gap: 20rpx;
  margin-top: 24rpx;
}

.stat-card {
  flex: 1;
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.stat-num {
  font-size: 44rpx;
  font-weight: 700;
  color: #1f2430;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #6b7280;
}

.quick-title {
  margin-top: 40rpx;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.quick-list {
  margin-top: 20rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx 24rpx;
}

.quick-item {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
  border-bottom: 2rpx solid #f2f3f7;
  font-size: 28rpx;

  &:last-child {
    border-bottom: none;
  }
}

.qi-icon {
  margin-right: 20rpx;
  font-size: 34rpx;
}

.logout-btn {
  margin-top: 48rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 26rpx;
  padding: 16rpx;
}
</style>
