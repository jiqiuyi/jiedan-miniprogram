<template>
  <view class="page">
    <template v-if="customer">
      <view class="hero card">
        <view class="hero-row">
          <view class="avatar">{{ avatarText }}</view>
          <view class="hero-main">
            <text class="hero-name">{{ customer.name || '未命名客户' }}</text>
            <text class="hero-sub">{{ subtitle }}</text>
          </view>
        </view>
        <view class="hero-actions">
          <view class="btn ghost" @tap="goEdit">编辑</view>
          <view class="btn danger-ghost" @tap="confirmDelete">删除</view>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">关联项目（{{ projectsOf.length }}）</text>
      </view>
      <view v-if="!projectsOf.length" class="empty card">暂无关联项目</view>
      <view v-else class="list">
        <view v-for="p in projectsOf" :key="String(p.id)" class="card project" @tap="goProject(p.id)">
          <view class="card-main">
            <text class="card-title">{{ p.title || '未命名项目' }}</text>
            <text class="card-sub">{{ projectStatusText(p.status) }} · 约定 ¥{{ formatAmount(p.amount_total) }}</text>
          </view>
          <text class="chevron">›</text>
        </view>
      </view>
    </template>
    <view v-else-if="!loading" class="empty card">客户不存在或已删除</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, projectStatusText } from '@/utils/format'
import type { Customer, Project } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const customerId = ref(0)
const loading = ref(true)
const customer = ref<Customer | null>(null)

const subtitle = computed(() => {
  const c = customer.value
  if (!c) return ''
  const parts: string[] = []
  if (c.contact) parts.push(`联系人 ${c.contact}`)
  if (c.industry) parts.push(c.industry)
  if (c.location) parts.push(c.location)
  return parts.join(' · ')
})

const projectsOf = computed(
  () => (data.projects as Project[]).filter((p) => Number(p.customer_id) === customerId.value) || []
)

const avatarText = computed(() => (customer.value?.name || '客').charAt(0))

async function load() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  customer.value =
    ((data.customers as Customer[]).find((r) => Number(r.id) === customerId.value) as Customer) ||
    null
  loading.value = false
}

onLoad((q) => {
  customerId.value = Number(q?.id ?? 0)
})

onShow(() => {
  load()
})

function goEdit() {
  uni.navigateTo({ url: `/pages/customer/form?id=${customerId.value}` })
}

function goProject(id: unknown) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(id)}` })
}

function confirmDelete() {
  const c = customer.value
  if (!c) return
  uni.showModal({
    title: '删除客户',
    content: `确定删除客户"${c.name || ''}"吗？\n其名下全部项目与收款记录将一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeCustomer(customerId.value)
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

.hero-row {
  display: flex;
  align-items: center;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 20rpx;
  background: #edefff;
  color: #4a5af0;
  font-size: 40rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.hero-main {
  flex: 1;
  min-width: 0;
}

.hero-name {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
}

.hero-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
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
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.empty {
  color: #9ca3af;
  text-align: center;
  font-size: 28rpx;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

.project {
  display: flex;
  align-items: center;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.card-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.chevron {
  font-size: 40rpx;
  color: #c4c9d4;
}
</style>
