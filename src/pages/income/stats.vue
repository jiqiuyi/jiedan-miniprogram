<template>
  <view class="page">
    <!-- 范围切换 -->
    <view class="mode-bar">
      <view
        v-for="m in modeList"
        :key="m.key"
        class="mode-chip"
        :class="{ active: mode === m.key }"
        @tap="switchMode(m.key)"
      >
        {{ m.label }}
      </view>
    </view>

    <!-- 自定义起止日期 -->
    <view v-if="mode === 'custom'" class="date-panel">
      <picker mode="date" :value="customStart" :end="todayStr" @change="onStartChange">
        <view class="date-cell">
          <text class="date-label">开始</text>
          <text class="date-value">{{ customStart }}</text>
        </view>
      </picker>
      <text class="date-sep">至</text>
      <picker mode="date" :value="customEnd" :start="customStart" :end="todayStr" @change="onEndChange">
        <view class="date-cell">
          <text class="date-label">结束</text>
          <text class="date-value">{{ customEnd }}</text>
        </view>
      </picker>
    </view>

    <!-- 应收欠款卡 -->
    <view class="receivable-card" :class="receivableCleared ? 'ok' : 'warn'">
      <view class="receivable-top">
        <text class="receivable-badge">{{ receivableCleared ? '✓' : '!' }}</text>
        <text class="receivable-title">{{ receivableCleared ? '应收款项 · 已全部结清' : '应收欠款 · 待追回' }}</text>
      </view>
      <text class="receivable-amount">¥{{ receivableCleared ? '0.00' : formatAmount(receivable) }}</text>
      <text class="receivable-sub">
        {{ receivableCleared ? '无未回款，所有收款均已结清' : `共 ¥${formatAmount(receivable)} 尚未收回，请及时跟进催收` }}
      </text>
    </view>

    <!-- 范围摘要 -->
    <view class="card summary-card">
      <text class="summary-title">{{ rangeTitle }} 统计</text>
      <view class="metric-row">
        <view class="metric-block">
          <text class="metric-label">{{ rangeTitle }} 已收入</text>
          <text class="metric-value" style="color: #16a085">¥{{ formatAmount(paidTotal) }}</text>
        </view>
        <view class="metric-block">
          <text class="metric-label">{{ rangeTitle }} 有效报价</text>
          <text class="metric-value" style="color: #4a5af0">¥{{ formatAmount(quoteTotal) }}</text>
        </view>
      </view>
      <view v-if="mode === 'month' || mode === 'lastMonth'" class="delta-row">
        <text class="delta-icon">{{ delta >= 0 ? '↗' : '↘' }}</text>
        <text class="delta-text" :class="delta >= 0 ? 'up' : 'down'">
          {{ deltaLabel }}
        </text>
      </view>
    </view>

    <!-- 近 12 个月收入柱状图 -->
    <template v-if="mode === 'last12'">
      <view class="section-head">
        <text class="section-title">近 12 个月收入</text>
      </view>
      <view class="chart-card card">
        <view class="chart-body">
          <view v-for="(b, i) in monthlyBars" :key="i" class="bar-col">
            <text v-if="b.value > 0" class="bar-value">{{ b.text }}</text>
            <view
              class="bar"
              :class="{ zero: b.value <= 0 }"
              :style="{ height: b.height + 'rpx' }"
            ></view>
          </view>
        </view>
        <view class="chart-labels">
          <text v-for="(b, i) in monthlyBars" :key="i" class="chart-label">{{ b.month }}月</text>
        </view>
      </view>
    </template>

    <!-- 分类汇总 -->
    <view class="section-head">
      <text class="section-title">分类汇总</text>
    </view>
    <view class="chip-bar">
      <view
        v-for="g in groupList"
        :key="g.key"
        class="chip"
        :class="{ active: groupMode === g.key }"
        @tap="groupMode = g.key"
      >
        {{ g.label }}
      </view>
    </view>
    <view v-if="!rankRows.length" class="empty card">
      <text class="empty-text">{{ emptyText }}</text>
    </view>
    <view v-else class="card rank-card">
      <view v-for="(r, i) in rankRows" :key="r.name" class="rank-row">
        <view class="rank-badge" :class="i < 3 ? 'top' : ''">{{ i + 1 }}</view>
        <text class="rank-name">{{ r.name }}</text>
        <text class="rank-amount">¥{{ formatAmount(r.total) }}</text>
      </view>
    </view>

    <text class="note">口径说明：统计默认排除「草稿」「作废」状态的报价及报价模板；应收欠款为当前未回款存量，不随时间范围过滤。</text>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount } from '@/utils/format'

const user = useUserStore()
const data = useDataStore()

type StatMode = 'month' | 'lastMonth' | 'last12' | 'custom'
type GroupMode = 'customer' | 'quoteType' | 'projectStatus'
type Row = Record<string, unknown>

const MODE_LIST: { key: StatMode; label: string }[] = [
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'last12', label: '近12个月' },
  { key: 'custom', label: '自定义' }
]

const GROUP_LIST: { key: GroupMode; label: string }[] = [
  { key: 'customer', label: '按客户' },
  { key: 'quoteType', label: '按报价类型' },
  { key: 'projectStatus', label: '按项目阶段' }
]

const STATUS_LABELS = ['接单', '制作中', '待收尾款', '完结']

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function ds(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parseDate(s: string): number {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return new Date(y, m - 1, d).getTime()
}

const mode = ref<StatMode>('last12')
const groupMode = ref<GroupMode>('customer')
const modeList = MODE_LIST
const groupList = GROUP_LIST

const now = new Date()
const todayStr = ds(Date.now())
const customStart = ref(ds(new Date(now.getFullYear(), now.getMonth(), 1).getTime()))
const customEnd = ref(todayStr)

function onStartChange(e: { detail: { value: string } }) {
  customStart.value = e.detail.value
  if (customEnd.value < customStart.value) customEnd.value = customStart.value
}

function onEndChange(e: { detail: { value: string } }) {
  customEnd.value = e.detail.value
  if (customStart.value > customEnd.value) customStart.value = customEnd.value
}

function switchMode(m: StatMode) {
  mode.value = m
}

// ---------- 时间范围 ----------

function rangeOf(): { s: number; e: number } {
  const t = new Date()
  if (mode.value === 'month') {
    return {
      s: new Date(t.getFullYear(), t.getMonth(), 1).getTime(),
      e: Date.now() + 1
    }
  }
  if (mode.value === 'lastMonth') {
    const s = new Date(t.getFullYear(), t.getMonth() - 1, 1)
    const e = new Date(t.getFullYear(), t.getMonth(), 1)
    return { s: s.getTime(), e: e.getTime() }
  }
  if (mode.value === 'last12') {
    return {
      s: new Date(t.getFullYear(), t.getMonth() - 11, 1).getTime(),
      e: Date.now() + 1
    }
  }
  return {
    s: parseDate(customStart.value),
    e: parseDate(customEnd.value) + 24 * 60 * 60 * 1000
  }
}

const rangeTitle = computed(() => {
  const t = new Date()
  if (mode.value === 'month') return `${t.getFullYear()}年${t.getMonth() + 1}月`
  if (mode.value === 'lastMonth') {
    const m = t.getMonth() === 0 ? 12 : t.getMonth()
    const y = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
    return `${y}年${m}月`
  }
  if (mode.value === 'last12') return '近12个月'
  return `${customStart.value} 至 ${customEnd.value}`
})

function paidInRange(s: number, e: number): number {
  let sum = 0
  for (const pay of data.payments) {
    const row = pay as Row
    const t = num(row['paid_at'])
    if (t > 0 && t >= s && t < e) sum += num(row['amount'])
  }
  return Math.max(0, sum)
}

function monthPaid(y: number, m: number): number {
  const s = new Date(y, m - 1, 1).getTime()
  const e = new Date(y, m, 1).getTime()
  return paidInRange(s, e)
}

const bounds = computed(() => rangeOf())

const paidTotal = computed(() => {
  const { s, e } = bounds.value
  return paidInRange(s, e)
})

const quoteTotal = computed(() => {
  const { s, e } = bounds.value
  let sum = 0
  for (const q of data.quotes) {
    const row = q as Row
    const st = num(row['status'])
    // 有效报价：已发送/客户确认/已成交；排除草稿、作废、模板
    if (!(st === 1 || st === 2 || st === 3)) continue
    if (num(row['is_template']) === 1) continue
    const t = num(row['created_at'])
    if (t > 0 && t >= s && t < e) sum += num(row['amount_total'])
  }
  return Math.max(0, sum)
})

const receivable = computed(() => {
  let total = 0
  for (const p of data.projects) {
    const row = p as Row
    if (num(row['status']) !== 2) continue
    const pid = num(row['id'])
    let paid = 0
    for (const pay of data.payments) {
      const pr = pay as Row
      if (num(pr['project_id']) === pid) paid += num(pr['amount'])
    }
    const remain = num(row['amount_total']) - paid
    if (remain > 0) total += remain
  }
  return total
})

const receivableCleared = computed(() => receivable.value <= 0)

// 月度对比：本月 -> 较上月；上月 -> 较前月
const prevIncome = computed(() => {
  const t = new Date()
  if (mode.value === 'month') {
    const m = t.getMonth() === 0 ? 12 : t.getMonth()
    const y = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
    return monthPaid(y, m)
  }
  if (mode.value === 'lastMonth') {
    const curM = t.getMonth() === 0 ? 12 : t.getMonth()
    const curY = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
    const prevM = curM === 1 ? 12 : curM - 1
    const prevY = curM === 1 ? curY - 1 : curY
    return monthPaid(prevY, prevM)
  }
  return 0
})

const delta = computed(() => paidTotal.value - prevIncome.value)

const deltaLabel = computed(() => {
  const d = delta.value
  const prev = prevIncome.value
  const abs = Math.abs(d)
  const pct = prev > 0 ? Math.round((abs / prev) * 1000) / 10 : d > 0 ? 100 : 0
  const base = mode.value === 'month' ? '较上月' : '较前月'
  const sign = d >= 0 ? '+' : '-'
  if (d === 0) return `${base} 持平`
  return `${base} ${sign}¥${formatAmount(abs)}（${pct}%）`
})

// ---------- 近 12 个月柱状图 ----------

interface BarItem {
  month: number
  text: string
  value: number
  height: number
}

const monthlyBars = computed<BarItem[]>(() => {
  const t = new Date()
  const arr: BarItem[] = []
  const nowMonthIdx = t.getMonth()
  for (let i = 11; i >= 0; i -= 1) {
    const d = new Date(t.getFullYear(), nowMonthIdx - i, 1)
    const s = d.getTime()
    const e = new Date(t.getFullYear(), nowMonthIdx - i + 1, 1).getTime()
    const value = paidInRange(s, e)
    const yuan = Math.round(value / 100)
    arr.push({
      month: d.getMonth() + 1,
      text: yuan > 0 ? String(yuan).replace(/\B(?=(\d{3})+(?!\d))/g, ',') : '',
      value,
      height: 0
    })
  }
  const maxV = arr.reduce((m, x) => (x.value > m ? x.value : m), 0)
  for (const x of arr) {
    x.height = maxV <= 0 ? 10 : x.value <= 0 ? 10 : Math.max(14, Math.round((x.value / maxV) * 260))
  }
  return arr
})

// ---------- 分类汇总 ----------

interface RankRow {
  name: string
  total: number
}

const rankRows = computed<RankRow[]>(() => {
  const { s, e } = bounds.value
  if (groupMode.value === 'quoteType') {
    const buckets: Record<string, number> = {}
    for (const q of data.quotes) {
      const row = q as Row
      const st = num(row['status'])
      if (!(st === 1 || st === 2 || st === 3)) continue
      if (num(row['is_template']) === 1) continue
      const t = num(row['created_at'])
      if (t <= 0 || t < s || t >= e) continue
      const key = String(row['quote_type'] || '') === 'simple' ? 'simple' : 'full'
      buckets[key] = (buckets[key] || 0) + num(row['amount_total'])
    }
    return toRankRows(buckets, (k) => (k === 'simple' ? '简单报价' : '详细报价'))
  }

  // 收款维度（按客户 / 按项目阶段）
  const projectById = new Map<number, Row>()
  for (const p of data.projects) {
    projectById.set(num((p as Row)['id']), p as Row)
  }
  const customerById = new Map<number, Row>()
  for (const c of data.customers) {
    customerById.set(num((c as Row)['id']), c as Row)
  }

  const buckets: Record<string, number> = {}
  const nameOf: Record<string, string> = {}
  const getBucket = (key: string): string => {
    if (!(key in buckets)) buckets[key] = 0
    return key
  }

  for (const pay of data.payments) {
    const row = pay as Row
    const t = num(row['paid_at'])
    if (t <= 0 || t < s || t >= e) continue
    const amount = num(row['amount'])
    const pid = num(row['project_id'])
    const pr = projectById.get(pid)

    if (groupMode.value === 'projectStatus') {
      const key = pr ? `st_${num(pr['status'])}` : 'del'
      const bk = getBucket(key)
      buckets[bk] += amount
      nameOf[bk] = pr ? STATUS_LABELS[num(pr['status'])] || '其他' : '其他 / 已删除项目'
    } else {
      let key: string
      if (!pr) {
        key = 'del'
        nameOf[key] = '已删除项目'
      } else {
        const cid = num(pr['customer_id'])
        const cu = cid > 0 ? customerById.get(cid) : undefined
        if (cid > 0 && cu) {
          key = `c_${cid}`
          nameOf[key] = String((cu as Row)['name'] || '未命名客户')
        } else {
          key = 'none'
          nameOf[key] = '未关联客户'
        }
      }
      const bk = getBucket(key)
      buckets[bk] += amount
    }
  }

  const keys = Object.keys(buckets)
  const rows = keys.map((k) => ({ name: nameOf[k] || k, total: buckets[k] }))
  rows.sort((a, b) => b.total - a.total)
  return rows
})

function toRankRows(buckets: Record<string, number>, nameOf: (k: string) => string): RankRow[] {
  const keys = Object.keys(buckets)
  const rows = keys.map((k) => ({ name: nameOf(k), total: buckets[k] }))
  rows.sort((a, b) => b.total - a.total)
  return rows
}

const emptyText = computed(() => {
  if (groupMode.value === 'quoteType') return '所选时间范围内还没有有效报价'
  return '所选时间范围内还没有收款记录'
})

onShow(() => {
  if (user.isLoggedIn) data.refresh()
})
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
}

.mode-bar {
  display: flex;
  gap: 16rpx;
}

.mode-chip {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #6b7280;
  background: #fff;
  border-radius: 16rpx;
  padding: 16rpx 0;
  box-shadow: 0 2rpx 10rpx rgba(31, 36, 48, 0.04);
}

.mode-chip.active {
  color: #ffffff;
  background: linear-gradient(135deg, #4a5af0, #7c5cf0);
  font-weight: 600;
}

.date-panel {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 14rpx;
  background: #fff;
  border-radius: 18rpx;
  padding: 16rpx 20rpx;
  box-shadow: 0 2rpx 10rpx rgba(31, 36, 48, 0.04);
}

.date-cell {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f2f4fa;
  border-radius: 14rpx;
  padding: 18rpx 20rpx;
}

.date-label {
  font-size: 24rpx;
  color: #8a93a6;
}

.date-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.date-sep {
  font-size: 24rpx;
  color: #8a93a6;
}

.receivable-card {
  margin-top: 20rpx;
  border-radius: 28rpx;
  padding: 28rpx 32rpx;
  color: #ffffff;
  box-shadow: 0 8rpx 24rpx rgba(31, 36, 48, 0.16);
}

.receivable-card.ok {
  background: linear-gradient(135deg, #27ae60 0%, #2ebd85 100%);
}

.receivable-card.warn {
  background: linear-gradient(135deg, #e67e22 0%, #f39c12 100%);
}

.receivable-top {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.receivable-badge {
  width: 34rpx;
  height: 34rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  color: #fff;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.receivable-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.92);
}

.receivable-amount {
  display: block;
  margin-top: 18rpx;
  font-size: 56rpx;
  font-weight: 700;
  line-height: 1.15;
}

.receivable-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.85);
}

.card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.summary-card {
  margin-top: 20rpx;
  padding: 26rpx;
}

.summary-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.metric-row {
  margin-top: 18rpx;
  display: flex;
  gap: 16rpx;
}

.metric-block {
  flex: 1;
  background: #f4f6fb;
  border-radius: 16rpx;
  padding: 20rpx;
  min-width: 0;
}

.metric-label {
  display: block;
  font-size: 20rpx;
  color: #8a93a6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-value {
  display: block;
  margin-top: 8rpx;
  font-size: 32rpx;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.delta-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.delta-icon {
  font-size: 28rpx;
  font-weight: 700;
}

.delta-text {
  font-size: 22rpx;
  font-weight: 600;
}

.delta-text.up {
  color: #27ae60;
}

.delta-text.down {
  color: #e74c3c;
}

.section-head {
  margin: 32rpx 4rpx 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.chart-card {
  padding: 24rpx 12rpx 16rpx;
}

.chart-body {
  display: flex;
  align-items: flex-end;
  height: 300rpx;
  padding: 0 8rpx;
}

.bar-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  padding: 0 2rpx;
}

.bar-value {
  font-size: 16rpx;
  color: #8a93a6;
  margin-bottom: 4rpx;
  white-space: nowrap;
  transform: scale(0.9);
}

.bar {
  width: 34rpx;
  background: linear-gradient(180deg, #4a5af0 0%, #7c5cf0 100%);
  border-radius: 8rpx 8rpx 4rpx 4rpx;
  min-height: 8rpx;
}

.bar.zero {
  background: #e7eaf2;
}

.chart-labels {
  margin-top: 12rpx;
  display: flex;
  padding: 0 8rpx;
}

.chart-label {
  flex: 1;
  text-align: center;
  font-size: 18rpx;
  color: #8a93a6;
}

.chip-bar {
  display: flex;
  gap: 14rpx;
  margin-bottom: 16rpx;
}

.chip {
  padding: 12rpx 26rpx;
  font-size: 24rpx;
  color: #6b7280;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 2rpx 10rpx rgba(31, 36, 48, 0.04);
}

.chip.active {
  color: #fff;
  background: #4a5af0;
  font-weight: 600;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 30rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.rank-card {
  overflow: hidden;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 22rpx 24rpx;
}

.rank-row + .rank-row {
  border-top: 1rpx solid #f0f1f5;
}

.rank-badge {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: rgba(138, 147, 166, 0.14);
  color: #8a93a6;
  font-size: 22rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  flex-shrink: 0;
}

.rank-badge.top {
  background: rgba(74, 90, 240, 0.12);
  color: #4a5af0;
}

.rank-name {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-amount {
  margin-left: 20rpx;
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2430;
  white-space: nowrap;
}

.note {
  display: block;
  margin-top: 24rpx;
  padding: 0 8rpx;
  font-size: 20rpx;
  color: #9ca3af;
  line-height: 1.6;
}
</style>
