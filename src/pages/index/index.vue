<template>
  <view class="page">
    <!-- 未登录：登录引导（数据经云端同步，登录后展示看板） -->
    <view v-if="!user.isLoggedIn" class="login-wrap">
      <view class="login-card" @tap="goLogin">
        <view class="login-avatar ic-user"></view>
        <view class="login-info">
          <text class="login-title">登录后查看工作看板</text>
          <text class="login-sub">客户、项目、报价数据自动同步</text>
        </view>
        <view class="login-arrow ic-chevron"></view>
      </view>
    </view>

    <template v-else>
      <!-- 本月收入渐变卡（对齐 App _IncomeCard） -->
      <view class="income-card" @tap="onIncomeTap">
        <text class="income-label">本月收入</text>
        <text class="income-amount">¥{{ formatAmount(monthIncome) }}</text>
        <text class="income-sub">本月新增款项合计 · {{ monthLabel }}月 · 点击查看历史记录</text>
      </view>

      <!-- 统计卡（对齐 App _StatCard：色点独占一行 → 标签 → 数值） -->
      <view class="stat-grid">
        <view class="stat-card">
          <view class="stat-dot" style="background-color: #4a5af0"></view>
          <text class="stat-label">进行中项目</text>
          <text class="stat-value" style="color: #4a5af0">{{ ongoingCount }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-dot" style="background-color: #e67e22"></view>
          <text class="stat-label">待收尾款</text>
          <text class="stat-value" style="color: #e67e22">¥{{ formatAmount(awaitingAmount) }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-dot" style="background-color: #16a085"></view>
          <text class="stat-label">客户数</text>
          <text class="stat-value" style="color: #16a085">{{ customerCount }}</text>
        </view>
        <view class="stat-card">
          <view class="stat-dot" style="background-color: #8a93a6"></view>
          <text class="stat-label">项目总数</text>
          <text class="stat-value" style="color: #8a93a6">{{ projectCount }}</text>
        </view>
      </view>

      <!-- 待收尾款区块（对齐 App _pendings 区块，仅当存在待收记录时显示） -->
      <template v-if="pendingList.length">
        <view class="section-head">
          <text class="section-title">待收尾款</text>
        </view>
        <view class="pending-list">
          <view v-for="pc in pendingList" :key="String(pendingIdOf(pc))" class="pending-card">
            <view class="pending-icon ic-clock"></view>
            <view class="pending-main">
              <text class="pending-title">{{ pendingTitleOf(pc) }}</text>
              <text class="pending-sub">{{ dueTextOf(pc) }}</text>
            </view>
            <view class="pending-right">
              <text class="pending-amount">¥{{ formatAmount(pendingAmountOf(pc)) }}</text>
              <view class="icon-btn ic-check" @tap.stop="settlePending(pc)"></view>
              <view class="icon-btn ic-trash" @tap.stop="removePendingRow(pc)"></view>
            </view>
          </view>
        </view>
      </template>

      <!-- 最近项目 -->
      <view class="section-head">
        <text class="section-title">最近项目</text>
        <text class="section-more" @tap="goProjectTab">查看全部</text>
      </view>
      <view v-if="data.loading && !recentProjects.length" class="empty">加载中...</view>
      <view v-else-if="!recentProjects.length" class="empty-wrap">
        <view class="empty-icon ic-folder"></view>
        <text class="empty-text">还没有项目，去「项目」页建一个吧</text>
      </view>
      <view v-else class="recent-list">
        <view
          v-for="p in recentProjects"
          :key="String(p.id)"
          class="recent-card"
          @tap="goDetail(p.id)"
        >
          <view class="recent-main">
            <text class="recent-title">{{ p.title || '未命名项目' }}</text>
            <text class="recent-sub">{{ statusLabel(p) }} · ¥{{ formatAmount(amountOf(p)) }}</text>
          </view>
          <view class="status-badge" :style="badgeStyle(p)">
            <view
              class="badge-icon"
              :class="statusOf(p) === 0 ? 'ic-mail' : statusOf(p) === 1 ? 'ic-gear' : statusOf(p) === 2 ? 'ic-clock' : 'ic-check-sub'"
            ></view>
            <text class="badge-text">{{ statusLabel(p) }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 收款悬浮入口（对齐 App FloatingActionButton.extended） -->
    <view v-if="user.isLoggedIn" class="fab" @tap="openCollect">
      <view class="fab-icon"></view>
      <text class="fab-text">收款</text>
    </view>

    <!-- 选择要收款的项目 弹层（对齐 App _collectPayment 的项目选择面板） -->
    <view v-if="collectVisible" class="mask" @tap="collectVisible = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">选择要收款的项目</text>
        <scroll-view class="sheet-list" scroll-y>
          <view
            v-for="p in collectProjects"
            :key="String(p.id)"
            class="sheet-row"
            @tap="pickProject(p)"
          >
            <view class="sheet-row-main">
              <text class="sheet-row-title">{{ p.title || '未命名项目' }}</text>
              <text class="sheet-row-sub">{{ statusLabel(p) }}</text>
            </view>
            <text class="chevron">›</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount } from '@/utils/format'
import type { Project, PendingCollection } from '@/utils/types'

const user = useUserStore()
const data = useDataStore()

// 与 App ProjectStatus 语义保持一致：0 接单 / 1 制作中 / 2 待收尾款 / 3 完结
const STATUS_AWAITING = 2
const STATUS_DONE = 3
// 与 App PendingStatus 语义保持一致：0 待收 / 1 已结清
const PENDING_PENDING = 0

const STATUS_META: Record<number, { label: string; color: string }> = {
  0: { label: '接单', color: '#4A5AF0' },
  1: { label: '制作中', color: '#16A085' },
  2: { label: '待收尾款', color: '#E67E22' },
  3: { label: '完结', color: '#8A93A6' }
}

/** 行数据以 Record 方式读取未在 types.ts 声明但后端/App 同步实际存在的字段 */
type Row = Record<string, unknown>

const collectVisible = ref(false)

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

/** 状态徽章：文案 + 同色 12% 透明底（对齐 App _StatusBadge） */
function badgeStyle(p: Project): Record<string, string> {
  const color = STATUS_META[statusOf(p)]?.color ?? '#8A93A6'
  return { color, backgroundColor: `${color}1F` }
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

/** 收款弹层项目列表：排序口径同「最近项目」（App getProjects → updated_at DESC） */
const collectProjects = computed(() => {
  const arr = data.projects.slice()
  arr.sort((a, b) => tsOf(b) - tsOf(a))
  return arr
})

function pendingIdOf(pc: PendingCollection): number {
  return num((pc as Row)['id'])
}

function pendingTitleOf(pc: PendingCollection): string {
  return String((pc as Row)['title'] ?? '') || '未命名待收'
}

function pendingAmountOf(pc: PendingCollection): number {
  return num((pc as Row)['amount'])
}

/** 副标题：到期 MM-dd / 未设到期日（对齐 App _PendingCard） */
function dueTextOf(pc: PendingCollection): string {
  const due = num((pc as Row)['due_date'])
  if (due <= 0) return '未设到期日'
  const d = new Date(due)
  const p2 = (n: number) => String(n).padStart(2, '0')
  return `到期 ${p2(d.getMonth() + 1)}-${p2(d.getDate())}`
}

/** 待收记录：仅 status==0，按 created_at 倒序（对齐 App getPendingCollections(onlyPending: true)） */
const pendingList = computed(() => {
  const arr = data.pendingCollections.filter(
    (pc) => num((pc as Row)['status']) === PENDING_PENDING
  )
  arr.sort((a, b) => num((b as Row)['created_at']) - num((a as Row)['created_at']))
  return arr
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

/** 结清待收尾款（对齐 App _settlePending：确认后 status→1 + settled_at） */
function settlePending(pc: PendingCollection) {
  const id = pendingIdOf(pc)
  uni.showModal({
    title: '结清待收尾款',
    content: `确认已收到「${pendingTitleOf(pc)}」的 ¥${formatAmount(pendingAmountOf(pc))} 吗？`,
    cancelText: '取消',
    confirmText: '确认结清',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.settlePendingCollection(id)
      if (!ok) uni.showToast({ title: '结清失败，请检查网络后重试', icon: 'none' })
    }
  })
}

/** 删除待收记录（对齐 App _deletePending） */
function removePendingRow(pc: PendingCollection) {
  const id = pendingIdOf(pc)
  uni.showModal({
    title: '删除待收记录',
    content: `确定删除「${pendingTitleOf(pc)}」的待收记录吗？`,
    cancelText: '取消',
    confirmText: '删除',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removePendingCollection(id)
      if (!ok) uni.showToast({ title: '删除失败，请检查网络后重试', icon: 'none' })
    }
  })
}

/** 收款入口：无项目时提示；有项目时弹出项目选择面板（对齐 App _collectPayment） */
function openCollect() {
  if (!data.projects.length) {
    uni.showToast({ title: '还没有项目，请先到「项目」页新建', icon: 'none' })
    return
  }
  collectVisible.value = true
}

/** 选中项目 → 进入该项目详情页的收款入口（本阶段不新做收款码流程） */
function pickProject(p: Project) {
  collectVisible.value = false
  const id = num((p as Row)['id'])
  if (!id) {
    uni.showToast({ title: '项目信息异常，请刷新后重试', icon: 'none' })
    return
  }
  uni.navigateTo({ url: `/pages/project/detail?id=${id}` })
}
</script>

<style lang="scss" scoped>
/* ============ 设计 Token（对齐 App theme.dart，1pt = 2rpx） ============ */
/* 卡片：白底 + 1rpx 描边 #ECEEF4 + 28rpx 圆角 + 无投影（App cardTheme） */
/* 文字：#1B2233 主 / #8A93A6 次；页面底色 #F6F7FB */

.page {
  padding: 16rpx 32rpx 220rpx;
  background-color: #f6f7fb;
  min-height: 100vh;
}

/* ---- 未登录引导卡 ---- */
.login-wrap {
  padding-top: 24rpx;
}

.login-card {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
  padding: 32rpx;
}

.login-avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #edefff;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.login-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.login-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1b2233;
}

.login-sub {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.login-arrow {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

/* ---- 本月收入渐变卡（App _IncomeCard：padding 20 / 圆角 14 / 无投影） ---- */
.income-card {
  padding: 40rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  color: #ffffff;
}

.income-label {
  display: block;
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.income-amount {
  display: block;
  margin-top: 16rpx;
  font-size: 68rpx;
  font-weight: 700;
  line-height: 1.15;
}

.income-sub {
  display: block;
  margin-top: 28rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

/* ---- 统计卡（App _StatCard：色点 8pt → 间距 10 → 标签 13pt → 间距 6 → 数值 18pt） ---- */
/* 真机兼容：不用 calc(50% - Xrpx) 配合 flex gap（安卓微信下会退化成单列），
   改为固定 rpx 宽度 + space-between。内容宽 750-32*2 = 686rpx，(686-32)/2 = 327rpx */
.stat-grid {
  margin-top: 28rpx;
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}

.stat-card {
  width: 327rpx;
  box-sizing: border-box;
  margin-bottom: 24rpx;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
  padding: 32rpx;
}

.stat-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.stat-label {
  display: block;
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.stat-value {
  display: block;
  margin-top: 12rpx;
  font-size: 36rpx;
  font-weight: 700;
}

/* ---- 区块标题（App：Padding(h18,v8) + 16pt w600） ---- */
.section-head {
  margin-top: 20rpx;
  padding: 16rpx 4rpx 28rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1b2233;
}

.section-more {
  font-size: 26rpx;
  color: #8a93a6;
}

.empty {
  padding: 96rpx 0;
  text-align: center;
  color: #8a93a6;
  font-size: 28rpx;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
}

.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0 96rpx;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
}

.empty-icon {
  width: 96rpx;
  height: 96rpx;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  opacity: 0.9;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #8a93a6;
}

/* ---- 待收尾款（App _PendingCard：ListTile + 橙色时钟 + 图标按钮） ---- */
.pending-list {
  display: flex;
  flex-direction: column;
}

.pending-card {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 12rpx;
}

.pending-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 24rpx;
  background-size: 100% 100%;
  background-repeat: no-repeat;
  flex-shrink: 0;
}

.pending-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.pending-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1b2233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pending-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.pending-right {
  display: flex;
  align-items: center;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.pending-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #e67e22;
  margin-right: 12rpx;
}

.icon-btn {
  width: 60rpx;
  height: 60rpx;
  margin-left: 8rpx;
  background-size: 44rpx 44rpx;
  background-position: center;
  background-repeat: no-repeat;
}

/* ---- 最近项目（App _RecentCard：ListTile 标题+副标题+状态徽章） ---- */
.recent-list {
  display: flex;
  flex-direction: column;
}

.recent-card {
  display: flex;
  align-items: center;
  background: #fff;
  border: 1rpx solid #eceef4;
  border-radius: 28rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 12rpx;
}

.recent-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.recent-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1b2233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-sub {
  margin-top: 8rpx;
  font-size: 28rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: flex;
  align-items: center;
  padding: 10rpx 20rpx;
  border-radius: 40rpx;
  margin-left: 16rpx;
  flex-shrink: 0;
}

.badge-icon {
  width: 28rpx;
  height: 28rpx;
  margin-right: 8rpx;
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.badge-text {
  font-size: 24rpx;
  font-weight: 600;
}

/* ---- 收款悬浮入口（对齐 App FloatingActionButton.extended，M3 规格真机实测反推：
   胶囊 112rpx 高 / 32rpx 圆角 / 左内边距 32rpx 右内边距 40rpx /
   图标 48rpx 见方与文字间距 16rpx / 距右边 32rpx、距底部导航栏顶边 32rpx） ---- */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: 32rpx;
  height: 112rpx;
  padding-left: 32rpx;
  padding-right: 40rpx;
  border-radius: 32rpx;
  background: #4a5af0;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.22);
  display: flex;
  align-items: center;
  z-index: 90;
}

/* 内联 SVG：App Icons.payments_outlined（24 网格：钞票矩形 + 中心实心圆，白色） */
.fab-icon {
  width: 48rpx;
  height: 48rpx;
  margin-right: 16rpx;
  flex-shrink: 0;
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0Ij48cmVjdCB4PSIyIiB5PSI1IiB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0iI0ZGRkZGRiIgc3Ryb2tlLXdpZHRoPSIyIi8+PGNpcmNsZSBjeD0iMTAiIGN5PSIxMCIgcj0iMyIgZmlsbD0iI0ZGRkZGRiIvPjwvc3ZnPg==');
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.fab-text {
  font-size: 28rpx;
  font-weight: 500;
  color: #ffffff;
}

/* ---- 项目选择弹层（App showAppSheet：顶部 20pt 圆角，标题 16pt w700） ---- */
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}

.sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 40rpx 32rpx 48rpx;
}

.sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
  text-align: center;
}

.sheet-list {
  margin-top: 24rpx;
  max-height: 720rpx;
}

.sheet-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #e3e7f0;
}

.sheet-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sheet-row-title {
  font-size: 32rpx;
  color: #1b2233;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-row-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.chevron {
  margin-left: 16rpx;
  font-size: 44rpx;
  color: #c4c9d4;
}

/* ============ 线性图标（内联 SVG，对齐 App Material 单色线性图标） ============ */
.ic-clock {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNFNjdFMjIiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTEyIDcuNXY1bDMuMiAyIi8+PC9zdmc+');
}
.ic-check {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxNkEwODUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTguMyAxMi40bDIuNiAyLjYgNC44LTUuNCIvPjwvc3ZnPg==');
}
.ic-check-sub {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QTkzQTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSI5Ii8+PHBhdGggZD0iTTguMyAxMi40bDIuNiAyLjYgNC44LTUuNCIvPjwvc3ZnPg==');
}
.ic-trash {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QTkzQTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNNSA3LjVoMTQiLz48cGF0aCBkPSJNOS41IDcuNVY1LjVoNXYyIi8+PHBhdGggZD0iTTcgNy41bDEgMTEuNWg4bDEtMTEuNSIvPjwvc3ZnPg==');
}
.ic-mail {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTVBRjAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cmVjdCB4PSIzIiB5PSI2IiB3aWR0aD0iMTgiIGhlaWdodD0iMTIiIHJ4PSIyLjUiLz48cGF0aCBkPSJNMy41IDhsOC41IDUuNkwyMC41IDgiLz48L3N2Zz4=');
}
.ic-gear {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiMxNkEwODUiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjEyIiByPSIzLjIiLz48cGF0aCBkPSJNMTIgM3YyLjhNMTIgMTguMlYyMU0zIDEyaDIuOE0xOC4yIDEySDIxTTUuNyA1LjdsMiAyTTE2LjMgMTYuM2wyIDJNMTguMyA1LjdsLTIgMk03LjcgMTYuM2wtMiAyIi8+PC9zdmc+');
}
.ic-folder {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM4QTkzQTYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNMy41IDYuNWg2bDIgMmg5djEwaC0xN3oiLz48L3N2Zz4=');
}
.ic-user {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiM0QTVBRjAiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48Y2lyY2xlIGN4PSIxMiIgY3k9IjguNiIgcj0iMy43Ii8+PHBhdGggZD0iTTQuNiAyMGMwLTMuOSAzLjMtNi4xIDcuNC02LjFzNy40IDIuMiA3LjQgNi4xIi8+PC9zdmc+');
}
.ic-chevron {
  background-image: url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9IiNDNEM5RDQiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIj48cGF0aCBkPSJNOS41IDUuNWw3IDYuNS03IDYuNSIvPjwvc3ZnPg==');
}
</style>
