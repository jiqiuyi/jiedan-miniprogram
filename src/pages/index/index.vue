<template>
  <view class="page">
    <!-- 未登录：登录引导（数据经云端同步，登录后展示看板） -->
    <view v-if="!user.isLoggedIn" class="login-wrap">
      <view class="login-card" @tap="goLogin">
        <view class="login-avatar">👤</view>
        <view class="login-info">
          <text class="login-title">登录后查看工作看板</text>
          <text class="login-sub">客户、项目、报价数据自动同步</text>
        </view>
        <text class="login-arrow">›</text>
      </view>
    </view>

    <template v-else>
      <!-- 本月收入渐变卡：点击跳收入历史页（本批占位） -->
      <view class="income-card" @tap="onIncomeTap">
        <view class="income-top">
          <text class="income-label">本月收入</text>
          <text class="income-hint">点击查看历史 ›</text>
        </view>
        <text class="income-amount">¥{{ formatAmount(monthIncome) }}</text>
        <text class="income-sub">本月新增款项合计 · {{ monthLabel }}月</text>
      </view>

      <!-- 统计卡 -->
      <view class="stat-grid">
        <view class="stat-card">
          <view class="stat-head">
            <view class="stat-dot" style="background-color: #4a5af0"></view>
            <text class="stat-label">进行中项目</text>
          </view>
          <text class="stat-value">{{ ongoingCount }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-head">
            <view class="stat-dot" style="background-color: #e67e22"></view>
            <text class="stat-label">待收尾款</text>
          </view>
          <text class="stat-value">¥{{ formatAmount(awaitingAmount) }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-head">
            <view class="stat-dot" style="background-color: #16a085"></view>
            <text class="stat-label">客户数</text>
          </view>
          <text class="stat-value">{{ customerCount }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-head">
            <view class="stat-dot" style="background-color: #8a93a6"></view>
            <text class="stat-label">项目总数</text>
          </view>
          <text class="stat-value">{{ projectCount }}</text>
        </view>
      </view>

      <!-- 最近项目 -->
      <view class="section-head">
        <text class="section-title">最近项目</text>
        <text class="section-more" @tap="goProjectTab">查看全部</text>
      </view>
      <view v-if="data.loading && !recentProjects.length" class="empty">加载中...</view>
      <view v-else-if="!recentProjects.length" class="empty">还没有项目，去「项目」页看看吧</view>
      <view v-else class="recent-list">
        <view
          v-for="p in recentProjects"
          :key="String(p.id)"
          class="recent-card"
          @tap="goDetail(p.id)"
        >
          <view class="recent-main">
            <text class="recent-title">{{ p.title || '未命名项目' }}</text>
            <view class="recent-meta">
              <text class="status-badge" :style="badgeStyle(p)">{{ statusLabel(p) }}</text>
              <text class="recent-amount">¥{{ formatAmount(amountOf(p)) }}</text>
            </view>
          </view>
          <text class="chevron">›</text>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount } from '@/utils/format'
import type { Project } from '@/utils/types'

const user = useUserStore()
const data = useDataStore()

// 与 App ProjectStatus 语义保持一致：0 接单 / 1 制作中 / 2 待收尾款 / 3 完结
const STATUS_AWAITING = 2
const STATUS_DONE = 3

const STATUS_META: Record<number, { label: string; color: string }> = {
  0: { label: '接单', color: '#4A5AF0' },
  1: { label: '制作中', color: '#16A085' },
  2: { label: '待收尾款', color: '#E67E22' },
  3: { label: '完结', color: '#8A93A6' }
}

/** 行数据以 Record 方式读取未在 types.ts 声明但后端/App 同步实际存在的字段 */
type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function statusOf(p: Project): number {
  return num((p as Row)['status'])
}

function amountOf(p: Project): number {
  return num((p as Row)['amount_total'])
}

function statusLabel(p: Project): string {
  const meta = STATUS_META[statusOf(p)]
  return meta ? meta.label : '未知'
}

function badgeStyle(p: Project): Record<string, string> {
  const color = STATUS_META[statusOf(p)]?.color ?? '#8A93A6'
  return { color, backgroundColor: `${color}1A` }
}

function sameMonth(ts: number): boolean {
  if (!ts) return false
  const d = new Date(ts)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

function tsOf(p: Project): number {
  const row = p as Row
  return num(row['updated_at'] ?? row['created_at'])
}

const monthLabel = computed(() => `${new Date().getMonth() + 1}`)

const monthIncome = computed(() => {
  let sum = 0
  for (const pay of data.payments) {
    const row = pay as Row
    if (sameMonth(num(row['paid_at']))) sum += num(row['amount'])
  }
  return Math.max(0, sum)
})

const projectCount = computed(() => data.projects.length)
const customerCount = computed(() => data.customers.length)

/** 进行中项目 = 项目总数 - 已完结（对齐 App dashboard_page 口径） */
const ongoingCount = computed(() => {
  const done = data.projects.filter((p) => statusOf(p) === STATUS_DONE).length
  return Math.max(0, data.projects.length - done)
})

/** 待收尾款 = 待收尾款状态项目（amount_total - 已收）> 0 之和，单位：分 */
const awaitingAmount = computed(() => {
  let total = 0
  for (const p of data.projects) {
    if (statusOf(p) !== STATUS_AWAITING) continue
    const pid = num((p as Row)['id'])
    let paid = 0
    for (const pay of data.payments) {
      const row = pay as Row
      if (num(row['project_id']) === pid) paid += num(row['amount'])
    }
    const remain = amountOf(p) - paid
    if (remain > 0) total += remain
  }
  return total
})

/** 最近项目：按 updated_at（无则 created_at）倒序取前 5（对齐 App getProjects 排序） */
const recentProjects = computed(() => {
  const arr = data.projects.slice()
  arr.sort((a, b) => tsOf(b) - tsOf(a))
  return arr.slice(0, 5)
})

onShow(() => {
  if (user.isLoggedIn) data.refresh()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(id)}` })
}

function goProjectTab() {
  uni.switchTab({ url: '/pages/project/list' })
}

function onIncomeTap() {
  uni.navigateTo({ url: '/pages/income/history' })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.login-wrap {
  padding-top: 40rpx;
}

.login-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.login-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #edefff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 44rpx;
  margin-right: 20rpx;
}

.login-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.login-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.login-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.login-arrow {
  font-size: 40rpx;
  color: #c4c9d4;
}

.income-card {
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  border-radius: 28rpx;
  padding: 32rpx;
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(74, 90, 240, 0.25);
}

.income-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.income-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.92);
}

.income-hint {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
}

.income-amount {
  display: block;
  margin-top: 16rpx;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.2;
}

.income-sub {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.82);
}

.stat-grid {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.stat-card {
  width: calc(50% - 8rpx);
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.stat-head {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.stat-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 4rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #6b7280;
}

.stat-value {
  display: block;
  margin-top: 16rpx;
  font-size: 44rpx;
  font-weight: 700;
  color: #1f2430;
}

.section-head {
  margin: 32rpx 4rpx 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.section-more {
  font-size: 24rpx;
  color: #8a93a6;
}

.empty {
  padding-top: 80rpx;
  padding-bottom: 80rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
  background: #fff;
  border-radius: 20rpx;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.recent-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.recent-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.recent-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-meta {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
}

.status-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-weight: 500;
}

.recent-amount {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.chevron {
  margin-left: 16rpx;
  font-size: 40rpx;
  color: #c4c9d4;
}
</style>
