<template>
  <view class="page">
    <view class="search-box">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索客户名称 / 联系人"
        confirm-type="search"
      />
    </view>

    <view v-if="data.loading && !filtered.length" class="empty">加载中...</view>
    <view v-else-if="!filtered.length" class="empty">暂无客户，点右下角新建</view>
    <view v-else class="list">
      <view v-for="c in filtered" :key="String(c.id)" class="card" @tap="goDetail(c.id)">
        <view class="avatar">{{ avatarText(c) }}</view>
        <view class="card-main">
          <text class="card-title">{{ c.name || '未命名客户' }}</text>
          <text class="card-sub">{{ subtitleOf(c) }}</text>
          <text class="card-count">{{ projectCountOf(c) }} 个关联项目</text>
        </view>
        <view class="card-side">
          <view class="more" @tap.stop="showActions(c)">···</view>
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
import type { Customer, Project, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()
const keyword = ref('')

function subtitleOf(c: Customer): string {
  const parts: string[] = []
  if (c.contact) parts.push(c.contact)
  if (c.industry) parts.push(c.industry)
  if (c.location) parts.push(c.location)
  return parts.join(' · ') || '暂无补充信息'
}

function projectCountOf(c: Customer): number {
  return (data.projects as Project[]).filter((p) => Number(p.customer_id) === Number(c.id)).length
}

function avatarText(c: Customer): string {
  const ch = (c.name || '客').charAt(0)
  return ch
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return (data.customers as Customer[]).filter((c) => {
    if (!kw) return true
    return `${c.name || ''} ${c.contact || ''} ${c.industry || ''}`.toLowerCase().includes(kw)
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
  uni.navigateTo({ url: `/pages/customer/detail?id=${String(id)}` })
}

function goAdd() {
  uni.navigateTo({ url: '/pages/customer/form' })
}

function showActions(c: Customer) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/customer/form?id=${c.id}` })
      } else if (res.tapIndex === 1) {
        confirmDelete(c)
      }
    }
  })
}

function confirmDelete(c: Customer) {
  uni.showModal({
    title: '删除客户',
    content: `确定删除客户"${c.name || ''}"吗？\n其名下全部项目与收款记录将一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      await data.removeCustomer(Number(c.id))
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
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 20rpx;
  background: #edefff;
  color: #4a5af0;
  font-size: 36rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-count {
  margin-top: 6rpx;
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
