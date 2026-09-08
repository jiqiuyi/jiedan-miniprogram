<template>
  <view class="page">
    <template v-if="project">
      <view class="hero card">
        <view class="hero-row">
          <text class="hero-title">{{ project.title || '未命名项目' }}</text>
          <text class="status-badge" :style="statusStyle">{{ statusText }}</text>
        </view>
        <text class="hero-sub">{{ customerName }} · 约定金额</text>
        <text class="hero-amount">¥{{ formatAmount(project.amount_total) }}</text>
        <view class="hero-actions">
          <view class="btn ghost" @tap="goEdit">编辑</view>
          <view class="btn danger-ghost" @tap="confirmDelete">删除</view>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">收款记录</text>
        <text class="section-total">已收 ¥{{ formatAmount(paidTotal) }}</text>
      </view>
      <view v-if="!payments.length" class="empty card">暂无收款记录</view>
      <view v-else class="pay-list">
        <view v-for="pay in payments" :key="String(pay.id)" class="pay-card card">
          <view class="pay-main">
            <text class="pay-type">{{ payTypeLabel(pay) }}</text>
            <text class="pay-note">{{ pay.note || formatDate(pay.paid_at) }}</text>
          </view>
          <view class="pay-right">
            <text class="pay-amount">+¥{{ formatAmount(pay.amount) }}</text>
            <text class="pay-date">{{ formatDate(pay.paid_at) }}</text>
          </view>
        </view>
      </view>
    </template>
    <view v-else-if="!loading" class="empty card">项目不存在或已删除</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate, payTypeText, projectStatusText } from '@/utils/format'
import type { Project, Customer, Payment, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const projectId = ref(0)
const loading = ref(true)
const project = ref<Project | null>(null)

const statusMeta: Record<number, { text: string; color: string }> = {
  0: { text: '接单', color: '#4A5AF0' },
  1: { text: '制作中', color: '#16A085' },
  2: { text: '待收尾款', color: '#E67E22' },
  3: { text: '完结', color: '#8A93A6' }
}

const statusText = computed(() => projectStatusText(project.value?.status))
const statusStyle = computed(() => {
  const s = Number(project.value?.status ?? 0)
  const color = statusMeta[s]?.color || '#8A93A6'
  return { color, backgroundColor: `${color}1A` }
})

const customerName = computed(() => {
  const p = project.value as DataRow | null
  const c = p ? data.findById(data.customers as unknown as Customer[], Number(p.customer_id ?? 0)) : undefined
  return (c as Customer | undefined)?.name || '未关联客户'
})

const payments = computed(
  () => (data.payments as Payment[]).filter((p) => Number(p.project_id) === projectId.value) || []
)

const paidTotal = computed(() =>
  payments.value.reduce((s, p) => s + Number(p.amount ?? 0), 0)
)

function payTypeLabel(p: Payment): string {
  return payTypeText((p as DataRow).type, (p as DataRow).type_label)
}

async function load() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  project.value =
    ((data.projects as Project[]).find((r) => Number(r.id) === projectId.value) as Project) || null
  loading.value = false
}

onLoad((q) => {
  projectId.value = Number(q?.id ?? 0)
})

onShow(() => {
  load()
})

function goEdit() {
  uni.navigateTo({ url: `/pages/project/form?id=${projectId.value}` })
}

function confirmDelete() {
  const p = project.value
  if (!p) return
  uni.showModal({
    title: '删除项目',
    content: `确定删除项目"${p.title || ''}"吗？\n其名下全部收款记录将一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeProject(projectId.value)
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

.hero-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.hero-amount {
  display: block;
  margin-top: 10rpx;
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

.section-total {
  font-size: 26rpx;
  color: #16a085;
}

.empty {
  color: #9ca3af;
  text-align: center;
  font-size: 28rpx;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

.pay-main {
  flex: 1;
  min-width: 0;
}

.pay-card {
  display: flex;
  align-items: center;
}

.pay-type {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.pay-note {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pay-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.pay-amount {
  font-size: 28rpx;
  font-weight: 700;
  color: #16a085;
}

.pay-date {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}
</style>
