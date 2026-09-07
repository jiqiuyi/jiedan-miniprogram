<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>
    <view v-else-if="customer" class="content">
      <view class="head-card">
        <view class="avatar">{{ avatarText(customer.name) }}</view>
        <view class="head-info">
          <text class="head-name">{{ customer.name || '未命名' }}</text>
          <text class="head-sub">{{ customer.company || '无公司信息' }}</text>
        </view>
      </view>

      <view class="card">
        <view class="info-row">
          <text class="info-label">联系人</text>
          <text class="info-value">{{ customer.contact || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">电话</text>
          <text class="info-value">{{ maskPhone(customer.phone) }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">地址</text>
          <text class="info-value">{{ customer.address || '-' }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">备注</text>
          <text class="info-value">{{ customer.remark || '-' }}</text>
        </view>
      </view>

      <view class="section-title">关联项目</view>
      <view v-if="!relatedProjects.length" class="empty small">无关联项目</view>
      <view v-for="p in relatedProjects" :key="p.id" class="rel-card" @tap="gotoProject(p.id)">
        <text class="rel-title">{{ p.title }}</text>
        <text class="rel-amount">¥{{ formatAmount(p.amount_total) }}</text>
      </view>
    </view>
    <view v-else class="empty">客户不存在或已被删除</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, maskPhone } from '@/utils/format'
import type { Project } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()
const id = ref(0)
const loading = ref(true)

const customer = computed(() => data.findById(data.customers, id.value))
const relatedProjects = computed(() =>
  (data.projects as Project[]).filter((p) => Number(p.customer_id) === id.value)
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

function avatarText(name: string | undefined) {
  return (name || '?').slice(0, 1)
}

function gotoProject(pid: number) {
  uni.navigateTo({ url: `/pages/project/detail?id=${pid}` })
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
  display: flex;
  align-items: center;
  color: #fff;
  margin-bottom: 24rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 600;
  margin-right: 24rpx;
}

.head-name {
  font-size: 36rpx;
  font-weight: 700;
}

.head-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  opacity: 0.85;
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
  width: 140rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #1f2430;
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
