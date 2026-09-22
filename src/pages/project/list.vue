<template>
  <view class="page">
    <!-- 搜索（对齐 App TextField：textSub 5% 填充 + AppRadius.sm 圆角 + 无边框 + 前缀搜索图标） -->
    <view class="search-wrap">
      <view class="search-box">
        <view class="ic ic-20 ic-search-main search-icon"></view>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索项目名称 / 客户"
          placeholder-style="color: #8A93A6"
          confirm-type="search"
        />
      </view>
    </view>

    <!-- 状态 Tab（对齐 App ChoiceChip：选中 12% 主色底 + 主色字 w600，未选中透明底 + 描边） -->
    <view class="tab-bar">
      <scroll-view class="tab-scroll" scroll-x :show-scrollbar="false">
        <view class="tab-bar-inner">
          <view
            v-for="t in tabs"
            :key="t.value"
            class="tab-chip"
            :class="{ active: statusTab === t.value }"
            @tap="statusTab = t.value"
          >{{ t.label }}</view>
        </view>
      </scroll-view>
    </view>

    <view v-if="data.loading && !projects.length" class="empty-center">
      <text class="empty-text">加载中...</text>
    </view>
    <view v-else-if="!filtered.length" class="empty-center">
      <text class="empty-text">{{ emptyText }}</text>
    </view>
    <view v-else class="list">
      <!-- 每项 4px 外距 + Card margin 0（对齐 App Padding(all:4) + Card(margin: zero)） -->
      <view v-for="p in filtered" :key="String(p.id)" class="item">
        <view class="card" @tap="goDetail(p.id)">
          <view class="card-main">
            <text class="card-title">{{ p.title || '未命名项目' }}</text>
            <text class="card-sub">
              {{ customerNameOf(p) }} · 约定 ¥{{ formatAmount(amountTotalOf(p)) }}
            </text>

            <!-- 金额行：已收 / 待收（对齐 App Text.rich 单行不换行） -->
            <view class="amount-line">
              <text class="amt-label">已收 </text>
              <text class="amt-paid">¥{{ formatAmount(paidOf(p)) }}</text>
              <text class="amt-label">　待收 </text>
              <text class="amt-remain" :class="{ settled: remainingOf(p) <= 0 }">
                {{ remainingOf(p) <= 0 ? '已结清' : '¥' + formatAmount(remainingOf(p)) }}
              </text>
            </view>

            <!-- 进度条（对齐 App LinearProgressIndicator：minHeight 4、100% 转收入绿） -->
            <view class="progress-track">
              <view
                class="progress-bar"
                :class="{ done: progressOf(p) >= 100 }"
                :style="{ width: progressOf(p) + '%' }"
              ></view>
            </view>

            <view class="bottom-row">
              <text class="progress-text">进度 {{ progressOf(p) }}%</text>
              <view
                v-if="deliverMark(p).show"
                class="deliver-mark"
                :style="{ color: deliverMark(p).color }"
              >
                <view class="dot" :style="{ backgroundColor: deliverMark(p).color }"></view>
                <text class="deliver-text">{{ deliverMark(p).text }}</text>
              </view>
            </view>
          </view>

          <!-- trailing（对齐 App ListTile.trailing：登记收款 IconButton + _StatusBadge） -->
          <view class="trailing">
            <view class="pay-btn" @tap.stop="goPay(p)">
              <view class="ic ic-22 ic-payments-primary"></view>
            </view>
            <view class="badge" :style="badgeStyle(p)">
              <view class="ic ic-14 badge-icon" :class="badgeMeta(p).icon"></view>
              <text class="badge-text" :style="{ color: badgeMeta(p).color }">
                {{ badgeMeta(p).label }}
              </text>
            </view>
            <!-- Flutter Slidable 等价：··· 唤起 编辑 / 删除 ActionSheet -->
            <view class="more" @tap.stop="showActions(p)">···</view>
          </view>
        </view>
      </view>
    </view>

    <view class="fab" @tap="goAdd">
      <view class="ic ic-24 ic-add-white"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, projectStatusText } from '@/utils/format'
import { ACCENT, DANGER, PRIMARY, TEXT_SUB, WARN, alphaColor, num } from '@/utils/quote-helper'
import { FREE_PROJECT_LIMIT } from '@/utils/config'
import type { Customer, DataRow, Payment, Project } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const keyword = ref('')
/** 当前状态 Tab（-1 = 全部，0..3 对齐 App ProjectStatus） */
const statusTab = ref(-1)
const tabs = [
  { value: -1, label: '全部' },
  { value: 0, label: '接单' },
  { value: 1, label: '制作中' },
  { value: 2, label: '待收尾款' },
  { value: 3, label: '完结' }
]

/** 对齐 App getProjects：projects 按 updated_at 倒序 */
const projects = computed(() =>
  [...(data.projects as Project[])].sort(
    (a, b) => num((b as DataRow).updated_at) - num((a as DataRow).updated_at)
  )
)

const customers = computed(() => data.customers as Customer[])

/** 全部项目已收总额（分），对齐 App projectPaidTotals（按 project_id 一次汇总，禁止逐条查询） */
const paidTotals = computed<Record<string, number>>(() => {
  const map: Record<string, number> = {}
  ;(data.payments as Payment[]).forEach((pm) => {
    const pid = num((pm as DataRow).project_id)
    if (pid <= 0) return
    const key = String(pid)
    map[key] = (map[key] || 0) + num((pm as DataRow).amount)
  })
  return map
})

/** 客户名（对齐 App _customerName：查不到显示「未知客户」） */
function customerNameOf(p: Project): string {
  const cid = num(p.customer_id)
  const c = customers.value.find((item) => num((item as DataRow).id) === cid)
  return String(c?.name || '未知客户')
}

const amountTotalOf = (p: Project): number => num(p.amount_total)
const paidOf = (p: Project): number => paidTotals.value[String(num(p.id))] || 0

/** 待收（对齐 App：约定总额 - 已收，负数归零） */
function remainingOf(p: Project): number {
  const r = amountTotalOf(p) - paidOf(p)
  return r < 0 ? 0 : r
}

/** 进度 0-100（越界就近裁剪） */
function progressOf(p: Project): number {
  return Math.min(100, Math.max(0, num(p.progress)))
}

interface DeliverMark {
  show: boolean
  text: string
  color: string
}

/** 交付截止标记（对齐 App _deliverMark：未设不标记；超期红 / 3 天内橙 / 其余次要色） */
function deliverMark(p: Project): DeliverMark {
  const ts = num(p.deliver_date)
  if (ts <= 0) return { show: false, text: '', color: TEXT_SUB }
  const now = Date.now()
  const overdue = ts < now
  const near = !overdue && ts - now < 3 * 24 * 3600 * 1000
  const color = overdue ? DANGER : near ? WARN : TEXT_SUB
  const d = new Date(ts)
  const p2 = (n: number) => String(n).padStart(2, '0')
  const text = `交付 ${p2(d.getMonth() + 1)}-${p2(d.getDate())}${
    overdue ? ' 已超期' : near ? ' 临近' : ''
  }`
  return { show: true, text, color }
}

interface StatusMeta {
  label: string
  color: string
  /** 对齐 App _StatusBadge 的状态图标（mark_email_read / build / schedule / check_circle） */
  icon: string
}

/** 状态徽章配色 + 图标（对齐 App _StatusBadge：12% 同色底 + 圆角 sheet） */
const STATUS_META: Record<number, StatusMeta> = {
  0: { label: '接单', color: PRIMARY, icon: 'ic-mailcheck-primary' },
  1: { label: '制作中', color: ACCENT, icon: 'ic-build-accent' },
  2: { label: '待收尾款', color: WARN, icon: 'ic-schedule-warn' },
  3: { label: '完结', color: TEXT_SUB, icon: 'ic-checkcircle-sub' }
}

function badgeMeta(p: Project): StatusMeta {
  const s = num(p.status)
  const meta = STATUS_META[s]
  return meta || { label: projectStatusText(s), color: TEXT_SUB, icon: 'ic-checkcircle-sub' }
}

function badgeStyle(p: Project): Record<string, string> {
  return { backgroundColor: alphaColor(badgeMeta(p).color, 0.12) }
}

/** 搜索 + 状态筛选（对齐 App _filtered：项目名称 / 客户名 命中，tab 二级过滤） */
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  let list = projects.value
  if (kw) {
    list = list.filter(
      (p) =>
        String(p.title || '')
          .toLowerCase()
          .includes(kw) || customerNameOf(p).toLowerCase().includes(kw)
    )
  }
  if (statusTab.value >= 0) {
    list = list.filter((p) => num(p.status) === statusTab.value)
  }
  return list
})

/** 空态文案（严格对齐 App：无项目或搜索中显示「没有匹配的项目」） */
const emptyText = computed(() =>
  !projects.value.length || keyword.value.trim() !== ''
    ? '没有匹配的项目'
    : '这里空空如也，点右下角 + 新建项目'
)

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
})

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(id)}` })
}

/** 登记收款（对齐 App ListTile.trailing 收款按钮 → showPaymentDialog） */
function goPay(p: Project) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(p.id)}&pay=1` })
}

/** 免费版额度引导（对齐 App _openPaywall → PaywallPage） */
function openPaywall(title: string, desc: string) {
  uni.showModal({
    title,
    content: desc,
    confirmText: '去开通',
    cancelText: '暂不',
    success: (res) => {
      if (res.confirm) uni.navigateTo({ url: '/pages/wallet/pro' })
    }
  })
}

/** 进行中项目数（对齐 App：status != done 计数） */
function activeCount(): number {
  return projects.value.filter((p) => num(p.status) !== 3).length
}

function goAdd() {
  // 额度校验在前，客户校验在后（顺序对齐 App _addProject）
  if (!user.isPro && activeCount() >= FREE_PROJECT_LIMIT) {
    openPaywall(
      `免费版最多管理 ${FREE_PROJECT_LIMIT} 个进行中的项目`,
      '解锁后项目数量不再受限，适合同时接多个单的你'
    )
    return
  }
  if (!customers.value.length) {
    uni.showToast({ title: '请先在「客户」页新建一个客户', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/project/form' })
}

function showActions(p: Project) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/project/form?id=${p.id}` })
      } else if (res.tapIndex === 1) {
        confirmDelete(p)
      }
    }
  })
}

/** 删除确认（文案对齐 App _removeProject，级联删除收款记录） */
function confirmDelete(p: Project) {
  uni.showModal({
    title: '删除项目',
    content: `确定删除项目「${p.title || ''}」吗？\n其名下全部收款记录将一并删除，不可恢复。`,
    confirmColor: DANGER,
    success: async (res) => {
      if (!res.confirm) return
      await data.removeProject(Number(p.id))
    }
  })
}
</script>

<style lang="scss" scoped>
@import '../../styles/icons.scss';

.page {
  min-height: 100vh;
  background: #f6f7fb;
}

/* ---- 搜索框（对齐 App Padding.fromLTRB(16, 8, 16, 0)） ---- */
.search-wrap {
  padding: 16rpx 32rpx 0;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(138, 147, 166, 0.05);
}

.search-icon {
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40rpx;
  font-size: 28rpx;
  color: #1b2233;
}

/* ---- 状态 Tab（对齐 App SizedBox(height:46) + padding(16,6)、chip 右距 6） ---- */
.tab-bar {
  height: 92rpx;
  margin-top: 8rpx;
}

.tab-scroll {
  width: 100%;
  white-space: nowrap;
}

.tab-bar-inner {
  display: flex;
  align-items: flex-start;
  width: max-content;
  padding: 12rpx 32rpx 0;
}

.tab-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 30rpx;
  margin-right: 12rpx;
  border-radius: 40rpx;
  border: 2rpx solid #c7c5d0;
  background: transparent;
  color: #8a93a6;
  font-size: 26rpx;
  line-height: 1;
  text-align: center;
}

.tab-chip.active {
  background: rgba(74, 90, 240, 0.12);
  border-color: rgba(74, 90, 240, 0.12);
  color: #4a5af0;
  font-weight: 600;
}

/* ---- 空态 ---- */
.empty-center {
  min-height: 60vh;
  padding: 0 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-text {
  font-size: 28rpx;
  color: #8a93a6;
}

/* ---- 列表卡片 ---- */
.list {
  padding: 8rpx 0 180rpx;
}

.item {
  padding: 8rpx;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 28rpx;
  border: 2rpx solid #eceef4;
  padding: 28rpx 32rpx;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 32rpx;
  line-height: 48rpx;
  font-weight: 600;
  color: #1b1b21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-sub {
  min-height: 40rpx;
  line-height: 40rpx;
  font-size: 28rpx;
  color: #46464f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.amount-line {
  margin-top: 8rpx;
  display: flex;
  align-items: baseline;
  flex-wrap: nowrap;
  overflow: hidden;
  font-size: 26rpx;
  white-space: nowrap;
}

.amt-label {
  color: #8a93a6;
  font-size: 26rpx;
}

.amt-paid {
  color: #16a085;
  font-weight: 700;
}

.amt-remain {
  color: #e67e22;
  font-weight: 700;
}

.amt-remain.settled {
  color: #16a085;
}

.progress-track {
  margin-top: 12rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: rgba(74, 90, 240, 0.1);
  overflow: hidden;
}

.progress-bar {
  height: 8rpx;
  border-radius: 8rpx;
  background: #4a5af0;
}

.progress-bar.done {
  background: #16a085;
}

.bottom-row {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.progress-text {
  font-size: 24rpx;
  color: #8a93a6;
}

.deliver-mark {
  display: flex;
  align-items: center;
}

.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 7rpx;
  margin-right: 6rpx;
}

.deliver-text {
  font-size: 24rpx;
  color: inherit;
}

/* ---- trailing（对齐 App ListTile.trailing：登记收款按钮 + 状态徽章 + Slidable 等价 ···） ---- */
.trailing {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.pay-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.badge {
  padding: 10rpx 20rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.badge-icon {
  margin-right: 8rpx;
  flex-shrink: 0;
}

.badge-text {
  font-size: 24rpx;
  font-weight: 600;
}

.more {
  flex-shrink: 0;
  padding: 8rpx 8rpx 8rpx 20rpx;
  color: #8a93a6;
  font-size: 32rpx;
  letter-spacing: 2rpx;
}

/* ---- FAB（对齐 App FloatingActionButton：品牌蓝底白图标） ---- */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: 32rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.22);
  z-index: 90;
}
</style>
