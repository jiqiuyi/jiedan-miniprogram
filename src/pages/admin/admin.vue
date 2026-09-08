<template>
  <view class="page">
    <!-- 无权限 -->
    <view v-if="denied" class="card empty-card">
      <text class="empty-icon">🔒</text>
      <text class="empty-title">仅管理员可访问</text>
      <text class="empty-text">当前账号无权限进入管理后台。若你确实需要管理功能，请使用管理员账号登录后再试。</text>
      <view class="primary-btn" @tap="goBack">返回</view>
    </view>

    <!-- 加载失败 -->
    <view v-else-if="loadError" class="card empty-card">
      <text class="empty-icon">⚠️</text>
      <text class="empty-text">{{ loadError }}</text>
      <view class="primary-btn" @tap="loadAll">重新加载</view>
    </view>

    <!-- 加载中 -->
    <view v-else-if="loading" class="card loading-card">
      <text class="loading-text">加载中…</text>
    </view>

    <!-- 数据态 -->
    <template v-else>
      <view class="head-row">
        <text class="page-title">经营概览</text>
        <text class="refresh-link" @tap="loadAll">刷新</text>
      </view>

      <!-- 概览卡片 -->
      <view class="stat-grid">
        <view class="stat-item" v-for="s in statCards" :key="s.label">
          <text class="stat-num">{{ s.value }}</text>
          <text class="stat-label">{{ s.label }}</text>
        </view>
      </view>

      <!-- 近 7 日新增 -->
      <view class="card trend-card">
        <view class="card-title">近 7 日新增用户</view>
        <view class="trend-row">
          <view v-for="d in trend" :key="d.date" class="trend-item">
            <text class="trend-count">{{ d.count }}</text>
            <text class="trend-date">{{ shortDate(d.date) }}</text>
          </view>
        </view>
      </view>

      <!-- Tab -->
      <view class="tab-bar">
        <view
          v-for="(t, i) in tabs"
          :key="t.key"
          class="tab-item"
          :class="{ active: activeTab === i }"
          @tap="activeTab = i"
        >
          {{ t.label }}
        </view>
      </view>

      <!-- 订单 -->
      <view v-if="activeTab === 0" class="list-wrap">
        <view v-if="orders.length === 0" class="card empty-mini">
          <text class="empty-text">暂无订单数据</text>
        </view>
        <view v-else class="list">
          <view v-for="o in shownOrders" :key="o.id" class="card list-card">
            <view class="row-head">
              <text class="order-no">{{ o.orderNo }}</text>
              <text class="status-tag" :class="'st-' + o.status">{{ orderStatus(o.status) }}</text>
            </view>
            <view class="row-line"><text class="kv-label">用户</text><text class="kv-value">#{{ o.userId }}</text></view>
            <view class="row-line"><text class="kv-label">方案</text><text class="kv-value">{{ planLabel(o.plan) }}</text></view>
            <view class="row-line"><text class="kv-label">金额</text><text class="kv-value strong">¥{{ formatAmount(o.amount) }}</text></view>
            <view v-if="o.inviter" class="row-line">
              <text class="kv-label">邀请人</text><text class="kv-value">#{{ o.inviter }}（返现 ¥{{ formatAmount(o.rebate) }}）</text>
            </view>
            <view v-if="o.paidAt" class="row-line"><text class="kv-label">支付时间</text><text class="kv-value">{{ formatDateTime(o.paidAt) }}</text></view>
          </view>
          <view v-if="orders.length > 50" class="more-tip">仅显示前 50 条，共 {{ orders.length }} 条</view>
        </view>
      </view>

      <!-- 抽查 -->
      <view v-else-if="activeTab === 1" class="list-wrap">
        <view v-if="spotchecks.length === 0" class="card empty-mini">
          <text class="empty-text">暂无抽查单</text>
        </view>
        <view v-else class="list">
          <view v-for="(s, idx) in shownSpotchecks" :key="idx" class="card list-card">
            <view class="row-head">
              <text class="order-no">抽查 #{{ String(s.id ?? '') }}</text>
              <text class="status-tag" :class="'st-' + spotStatusKey(s)">{{ spotStatusText(s) }}</text>
            </view>
            <view v-if="scAmount(s) !== ''" class="row-line">
              <text class="kv-label">上报金额</text><text class="kv-value strong">¥{{ scAmount(s) }}</text>
            </view>
            <view v-if="s.reason" class="row-line"><text class="kv-label">原因</text><text class="kv-value">{{ s.reason }}</text></view>
            <view v-if="s.reportedAt" class="row-line"><text class="kv-label">上报时间</text><text class="kv-value">{{ formatDateTime(s.reportedAt) }}</text></view>
          </view>
          <view v-if="spotchecks.length > 30" class="more-tip">仅显示前 30 条，共 {{ spotchecks.length }} 条</view>
        </view>
      </view>

      <!-- 返现 -->
      <view v-else-if="activeTab === 2" class="list-wrap">
        <view v-if="rebates.length === 0" class="card empty-mini">
          <text class="empty-text">暂无返现记录</text>
        </view>
        <view v-else>
          <view class="list">
            <view v-for="r in shownRebates" :key="r.id" class="card list-card">
              <view class="row-head">
                <text class="order-no">{{ r.orderNo }}</text>
                <text class="kv-value strong">返 ¥{{ formatAmount(r.rebate) }}</text>
              </view>
              <view class="row-line"><text class="kv-label">用户</text><text class="kv-value">#{{ r.userId }}</text></view>
              <view class="row-line"><text class="kv-label">邀请人</text><text class="kv-value">#{{ r.inviter }}</text></view>
              <view class="row-line"><text class="kv-label">订单金额</text><text class="kv-value">¥{{ formatAmount(r.amount) }}</text></view>
              <view v-if="r.paidAt" class="row-line"><text class="kv-label">返现时间</text><text class="kv-value">{{ formatDateTime(r.paidAt) }}</text></view>
            </view>
            <view v-if="rebates.length > 30" class="more-tip">仅显示前 30 条明细，共 {{ rebates.length }} 条</view>
          </view>
          <view v-if="rebateTotals.length > 0" class="card totals-card">
            <view class="card-title">邀请用户累计返现</view>
            <view v-for="t in rebateTotals" :key="t.id" class="totals-row">
              <text class="totals-name">{{ t.nickname || t.phone }}</text>
              <text class="totals-val">¥{{ formatAmount(t.rebateTotal) }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 待打款 -->
      <view v-else class="list-wrap">
        <view class="card summary-card">
          <text class="summary-label">当前待返现合计</text>
          <text class="summary-num">¥{{ formatAmount(payoutTotal) }}</text>
        </view>
        <view v-if="payouts.length === 0" class="card empty-mini">
          <text class="empty-text">暂无待打款记录</text>
        </view>
        <view v-else class="list">
          <view v-for="p in shownPayouts" :key="p.id" class="card list-card">
            <view class="row-head">
              <text class="order-no">{{ p.orderNo }}</text>
              <text class="kv-value strong">¥{{ formatAmount(p.rebate) }}</text>
            </view>
            <view class="row-line"><text class="kv-label">用户</text><text class="kv-value">#{{ p.userId }}</text></view>
            <view class="row-line"><text class="kv-label">邀请人</text><text class="kv-value">#{{ p.inviter }}</text></view>
            <view class="row-line"><text class="kv-label">订单金额</text><text class="kv-value">¥{{ formatAmount(p.amount) }}</text></view>
          </view>
          <view v-if="payouts.length > 30" class="more-tip">仅显示前 30 条，共 {{ payouts.length }} 条</view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { formatAmount, formatDateTime } from '@/utils/format'
import {
  fetchAdminStats,
  fetchAdminOrders,
  fetchAdminSpotchecks,
  fetchAdminRebates,
  fetchAdminPayouts,
  type AdminStats,
  type AdminOrder,
  type AdminSpotcheck,
  type AdminRebate,
  type AdminRebateTotal,
  type AdminPayout
} from '@/api/admin'

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const loading = ref(true)
const denied = ref(false)
const loadError = ref('')

const stats = ref<AdminStats | null>(null)
const orders = ref<AdminOrder[]>([])
const spotchecks = ref<AdminSpotcheck[]>([])
const rebates = ref<AdminRebate[]>([])
const rebateTotals = ref<AdminRebateTotal[]>([])
const payouts = ref<AdminPayout[]>([])
const payoutTotal = ref(0)

const activeTab = ref(0)
const tabs = [
  { key: 'orders', label: '订单' },
  { key: 'spotcheck', label: '抽查' },
  { key: 'rebate', label: '返现' },
  { key: 'payout', label: '待打款' }
]

onShow(() => {
  loadAll()
})

async function loadAll() {
  loading.value = true
  denied.value = false
  loadError.value = ''
  try {
    const s = await fetchAdminStats()
    if (!s.ok || !s.data) {
      if (s.statusCode === 401 || s.statusCode === 403) {
        denied.value = true
      } else {
        loadError.value = s.error || '数据加载失败'
      }
      loading.value = false
      return
    }
    stats.value = s.data
    const [o, sc, r, p] = await Promise.all([
      fetchAdminOrders('all').catch(() => null),
      fetchAdminSpotchecks().catch(() => null),
      fetchAdminRebates().catch(() => null),
      fetchAdminPayouts().catch(() => null)
    ])
    orders.value = o?.ok && o.data ? o.data.orders || [] : []
    spotchecks.value = sc?.ok && sc.data ? sc.data.spotchecks || [] : []
    rebates.value = r?.ok && r.data ? r.data.details || [] : []
    rebateTotals.value = r?.ok && r.data ? r.data.totals || [] : []
    payouts.value = p?.ok && p.data ? p.data.payouts || [] : []
    payoutTotal.value = p?.ok && p.data ? num(p.data.totalRebate) : 0
  } catch {
    loadError.value = '网络异常，请稍后重试'
  } finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/mine/mine' })
  })
}

const statCards = computed(() => {
  const s = stats.value
  if (!s) return []
  return [
    { label: '累计用户', value: String(num(s.total_users)) },
    { label: '今日新增', value: String(num(s.users_today)) },
    { label: '付费用户', value: String(num(s.paid_users)) },
    { label: '专业版会员', value: String(num(s.vip_users)) },
    { label: '今日收入', value: `¥${formatAmount(s.income_today)}` },
    { label: '累计收入', value: `¥${formatAmount(s.total_income)}` },
    { label: '邀请注册', value: String(num(s.invitee_count)) },
    { label: '待处理反馈', value: String(num((s.feedback as Row | null)?.pending ?? 0)) }
  ]
})

const trend = computed(() => {
  const s = stats.value
  const list = (s?.new_users_last7d as unknown) || []
  return Array.isArray(list) ? list.slice(-7) : []
})

function shortDate(d: string | unknown): string {
  const s = String(d ?? '')
  if (!s) return '-'
  const parts = s.split('-')
  return parts.length >= 3 ? `${parts[1]}-${parts[2]}` : s
}

function orderStatus(v: unknown): string {
  const m: Record<string, string> = { confirming: '待确认', spotcheck: '抽查中', paid: '已支付', pending: '待支付' }
  return m[String(v ?? '')] || String(v ?? '')
}

function planLabel(v: unknown): string {
  const m: Record<string, string> = {
    firstMonth: '首月特惠',
    month: '月付',
    year: '年付',
    forever: '永久'
  }
  return m[String(v ?? '')] || String(v ?? '')
}

const shownOrders = computed(() => orders.value.slice(0, 50))
const shownSpotchecks = computed(() => spotchecks.value.slice(0, 30))
const shownRebates = computed(() => rebates.value.slice(0, 30))
const shownPayouts = computed(() => payouts.value.slice(0, 30))

function scAmount(s: AdminSpotcheck): string {
  const row = s as Row
  const ra = num(row['reportedAmount'])
  if (ra > 0) return formatAmount(ra)
  const o = row['order']
  if (o && typeof o === 'object') {
    const oa = num((o as Row)['amount'])
    if (oa > 0) return formatAmount(oa)
  }
  return ''
}

function spotStatusKey(s: AdminSpotcheck): string {
  return String((s as Row)['status'] ?? '')
}

function spotStatusText(s: AdminSpotcheck): string {
  const m: Record<string, string> = { pending: '待处理', processing: '处理中', resolved: '已处理', rejected: '已驳回' }
  const k = spotStatusKey(s)
  return m[k] || (k ? k : '待处理')
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.empty-card {
  margin-top: 90rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 44rpx;
  text-align: center;
}

.empty-icon {
  font-size: 88rpx;
}

.empty-title {
  margin-top: 24rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
}

.empty-text {
  margin-top: 18rpx;
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.primary-btn {
  margin-top: 32rpx;
  padding: 20rpx 72rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

.loading-card {
  margin-top: 90rpx;
  padding: 60rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #8a93a6;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4rpx 8rpx 16rpx;
}

.page-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.refresh-link {
  font-size: 24rpx;
  color: #4a5af0;
  padding: 8rpx 12rpx;
}

.stat-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 14rpx;
}

.stat-item {
  width: calc((100% - 14rpx) / 2);
  box-sizing: border-box;
  background: #fff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
  display: flex;
  flex-direction: column;
}

.stat-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
  word-break: break-all;
}

.stat-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.trend-card {
  margin-top: 16rpx;
}

.card-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 16rpx;
}

.trend-row {
  display: flex;
  align-items: flex-end;
  gap: 18rpx;
}

.trend-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.trend-count {
  font-size: 26rpx;
  font-weight: 700;
  color: #4a5af0;
}

.trend-date {
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8a93a6;
}

.tab-bar {
  margin: 20rpx 0 16rpx;
  background: #eceef6;
  border-radius: 18rpx;
  padding: 6rpx;
  display: flex;
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  font-size: 26rpx;
  color: #5a6273;
  border-radius: 14rpx;
}

.tab-item.active {
  background: #fff;
  color: #1f2430;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(31, 36, 48, 0.06);
}

.empty-mini {
  padding: 50rpx 30rpx;
  text-align: center;
}

.list-wrap {
  display: flex;
  flex-direction: column;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.list-card {
  display: flex;
  flex-direction: column;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  row-gap: 8rpx;
}

.order-no {
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2430;
  word-break: break-all;
  margin-right: 12rpx;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.status-tag.st-confirming,
.status-tag.st-pending,
.status-tag.st-processing {
  color: #b25a00;
  background: #fff1e0;
}

.status-tag.st-spotcheck {
  color: #8a6d1a;
  background: #fdf6e3;
}

.status-tag.st-paid,
.status-tag.st-resolved {
  color: #0e8a3e;
  background: #e4f7ec;
}

.status-tag.st-rejected {
  color: #c33b3b;
  background: #fdeaea;
}

.row-line {
  margin-top: 10rpx;
  display: flex;
  font-size: 25rpx;
}

.kv-label {
  width: 140rpx;
  color: #8a93a6;
  flex-shrink: 0;
}

.kv-value {
  color: #3a4150;
  word-break: break-all;
}

.kv-value.strong {
  color: #1f2430;
  font-weight: 600;
}

.more-tip {
  margin-top: 12rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b6bcc9;
}

.totals-card {
  margin-top: 18rpx;
}

.totals-row {
  display: flex;
  justify-content: space-between;
  padding: 10rpx 0;
  border-bottom: 1rpx solid #f0f1f5;
}

.totals-row:last-child {
  border-bottom: none;
}

.totals-name {
  font-size: 26rpx;
  color: #3a4150;
}

.totals-val {
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2430;
}

.summary-card {
  margin-bottom: 16rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-label {
  font-size: 26rpx;
  opacity: 0.95;
}

.summary-num {
  font-size: 40rpx;
  font-weight: 800;
}
</style>
