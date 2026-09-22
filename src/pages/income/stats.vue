<template>
  <!-- VIP 门禁（对齐 App _vipGate：入口不隐藏，免费用户进入即见升级引导） -->
  <view v-if="!user.isPro" class="gate">
    <view class="gate-icon">
      <view class="lock-shackle"></view>
      <view class="lock-body"></view>
    </view>
    <text class="gate-title">统计·高级分析为专业版专属</text>
    <text class="gate-desc">自定义日期区间、月度对比与分类汇总为专业版专属权益。</text>
    <view class="gate-btn" hover-class="gate-btn-hover" @tap="goPro">升级 VIP 解锁</view>
  </view>

  <view v-else class="page">
    <!-- 区间选择器（对齐 App RangeFilterBar + AppFilterChip：左对齐、纯文字、间距一致、不做等宽拉伸） -->
    <view class="filter-bar">
      <view
        v-for="m in modeList"
        :key="m.key"
        class="filter-chip"
        :class="{ active: mode === m.key }"
        @tap="switchMode(m.key)"
      >
        {{ m.label }}
      </view>
    </view>

    <!-- 自定义区间入口（对齐 App _buildRangeSelector：单独一行展示当前区间，点击唤起起止日期弹层） -->
    <view
      v-if="mode === 'custom'"
      class="range-entry"
      hover-class="range-entry-hover"
      @tap="openRangeSheet"
    >
      <text class="range-entry-text">统计区间：{{ rangeTitle }}</text>
      <text class="range-entry-arrow">›</text>
    </view>

    <!-- 应收欠款卡（对齐 App _buildReceivableCard：结清绿 / 待追回橙 渐变 + 三行结构） -->
    <view class="receivable-card" :class="receivableCleared ? 'ok' : 'warn'">
      <view class="receivable-top">
        <text class="receivable-badge">{{ receivableCleared ? '✓' : '!' }}</text>
        <text class="receivable-title">{{
          receivableCleared ? '应收款项 · 已全部结清' : '应收欠款 · 待追回'
        }}</text>
      </view>
      <text class="receivable-amount">¥{{ receivableCleared ? '0.00' : formatAmount(receivable) }}</text>
      <text class="receivable-sub">{{
        receivableCleared
          ? '无未回款，所有收款均已结清'
          : `共 ¥${formatAmount(receivable)} 尚未收回，请及时跟进催收`
      }}</text>
    </view>

    <!-- 区间汇总卡（对齐 App _buildRangeSummaryCard：标题 → 已收入/有效报价双指标 → 月度对比） -->
    <view class="card summary-card">
      <text class="summary-title">{{ rangeTitle }} 统计</text>
      <view class="metric-row">
        <view class="metric-block accent">
          <text class="metric-label">{{ rangeTitle }} 已收入</text>
          <text class="metric-value accent">¥{{ formatAmount(paidTotal) }}</text>
        </view>
        <view class="metric-block primary">
          <text class="metric-label">{{ rangeTitle }} 有效报价</text>
          <text class="metric-value primary">¥{{ formatAmount(quoteTotal) }}</text>
        </view>
      </view>
      <view v-if="showDelta" class="delta-row">
        <text class="delta-icon" :class="delta >= 0 ? 'up' : 'down'">{{ delta >= 0 ? '↗' : '↘' }}</text>
        <text class="delta-text" :class="delta >= 0 ? 'up' : 'down'">{{ deltaLabel }}</text>
      </view>
    </view>

    <!-- 近 12 个月收入柱状图（对齐 App _MonthlyBarChart：仅「近12个月」模式展示） -->
    <template v-if="mode === 'last12'">
      <view class="section-head">
        <text class="section-title">近 12 个月收入</text>
      </view>
      <view class="card chart-card">
        <view class="chart-body">
          <view v-for="(b, i) in monthlyBars" :key="'bar' + i" class="bar-col">
            <text class="bar-value">{{ b.label }}</text>
            <view class="bar" :style="{ height: b.height + 'rpx' }"></view>
          </view>
        </view>
        <view class="chart-labels">
          <text v-for="(b, i) in monthlyBars" :key="'label' + i" class="chart-label">{{ b.month }}月</text>
        </view>
      </view>
    </template>

    <!-- 分类汇总（对齐 App _buildGroupSummary：AppFilterChip 维度切换 + 排行列表） -->
    <view class="section-head">
      <text class="section-title">分类汇总</text>
    </view>
    <view class="filter-bar group-bar">
      <view
        v-for="g in groupList"
        :key="g.key"
        class="filter-chip"
        :class="{ active: groupMode === g.key }"
        @tap="groupMode = g.key"
      >
        {{ g.label }}
      </view>
    </view>
    <view v-if="!rankRows.length" class="card empty-card">
      <text class="empty-text">暂无数据</text>
    </view>
    <view v-else class="card rank-card">
      <view v-for="(r, i) in rankRows" :key="r.key" class="rank-row">
        <view class="rank-badge" :class="{ top: i < 3 }">{{ i + 1 }}</view>
        <text class="rank-name">{{ r.name }}</text>
        <text class="rank-amount">¥{{ formatAmount(r.total) }}</text>
      </view>
    </view>

    <text class="note">
      口径说明：统计默认排除「草稿」「作废」状态的报价及报价模板；应收欠款为当前未回款存量，不随时间范围过滤。
    </text>

    <!-- 起止日期弹层（对齐 App showDateRangeSheet：标题「选择统计起止日期」） -->
    <view v-if="showSheet" class="sheet-mask" @tap="closeSheet">
      <view class="sheet" @tap.stop>
        <view class="sheet-title">选择统计起止日期</view>
        <view class="range-row">
          <view class="picker-row half">
            <picker
              mode="date"
              :value="pickStart"
              start="2000-01-01"
              :end="todayStr"
              @change="onPickStart"
            >
              <view class="picker-cell">
                <text class="picker-label">开始日期</text>
                <text class="picker-value">{{ pickStart }}</text>
              </view>
            </picker>
          </view>
          <text class="range-sep">至</text>
          <view class="picker-row half">
            <picker
              mode="date"
              :value="pickEnd"
              :start="pickStart"
              :end="todayStr"
              @change="onPickEnd"
            >
              <view class="picker-cell">
                <text class="picker-label">结束日期</text>
                <text class="picker-value">{{ pickEnd }}</text>
              </view>
            </picker>
          </view>
        </view>
        <view class="sheet-btn" @tap="confirmSheet">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount, projectStatusText } from '@/utils/format'

const data = useDataStore()

const user = useUserStore()

/** 升级引导跳转（对齐 App PaywallPage(title:'升级专业版', desc:'解锁全部高级经营功能')） */
function goPro() {
  uni.navigateTo({ url: '/pages/wallet/pro' })
}

type StatMode = 'month' | 'lastMonth' | 'last12' | 'custom'
type GroupMode = 'customer' | 'quoteType' | 'projectStatus'
type Row = Record<string, unknown>

interface RankRow {
  key: string
  name: string
  total: number
}

interface BarItem {
  month: number
  label: string
  height: number
}

/** 区间顺序与文案对齐 App income_stats_page：本月 / 上月 / 近12个月 / 自定义 */
const MODE_LIST: { key: StatMode; label: string }[] = [
  { key: 'month', label: '本月' },
  { key: 'lastMonth', label: '上月' },
  { key: 'last12', label: '近12个月' },
  { key: 'custom', label: '自定义' }
]

/** 分类汇总维度（对齐 App _GroupMode） */
const GROUP_LIST: { key: GroupMode; label: string }[] = [
  { key: 'customer', label: '按客户' },
  { key: 'quoteType', label: '按报价类型' },
  { key: 'projectStatus', label: '按项目阶段' }
]

/** 有效报价状态（对齐 App database.dart：仅 已发送/客户确认/已成交 计入统计） */
const VALID_QUOTE_STATUS = [1, 2, 3]

const mode = ref<StatMode>('last12')
const groupMode = ref<GroupMode>('customer')
const modeList = MODE_LIST
const groupList = GROUP_LIST

// 自定义起止日期（默认本月 1 日 ~ 今天，对齐 App _rStart / _rEnd）
const nowD = new Date()
const todayStr = dateStr(nowD.getTime())
const rStart = ref(dateStr(new Date(nowD.getFullYear(), nowD.getMonth(), 1).getTime()))
const rEnd = ref(todayStr)

// 弹层状态
const showSheet = ref(false)
const pickStart = ref(rStart.value)
const pickEnd = ref(rEnd.value)

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function rowOf(v: unknown): Row {
  return (v ?? {}) as Row
}

/** 时间戳 → YYYY-MM-DD（与 history.vue 同规则） */
function dateStr(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** YYYY-MM-DD → 当天 00:00 时间戳 */
function parseDate(s: string): number {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return new Date(y, m - 1, d).getTime()
}

/** YYYY-MM-DD → 次日 00:00（区间右开，对齐 App 的 end + 1 天） */
function dayExclusive(s: string): number {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return new Date(y, m - 1, d + 1).getTime()
}

/** YYYY-MM-DD → x年x月x日（起止两端都带年份，对齐 App _titleOf） */
function cnDate(s: string): string {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return `${y}年${m}月${d}日`
}

/** 整数千分位（对齐 App NumberFormat('#,##0')） */
function thousands(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** 项目状态 → 中文（App 侧越界状态归入「其他」，空值归入「其他 / 已删除项目」） */
function statusLabel(status: unknown): string {
  const text = projectStatusText(num(status))
  return text === '未知' ? '其他' : text
}

/** 当前模式的时间范围 [start, end)（对齐 App _rangeOf） */
function rangeOf(): { start: number; end: number } {
  const t = new Date()
  if (mode.value === 'month') {
    return { start: new Date(t.getFullYear(), t.getMonth(), 1).getTime(), end: t.getTime() + 1 }
  }
  if (mode.value === 'lastMonth') {
    return {
      start: new Date(t.getFullYear(), t.getMonth() - 1, 1).getTime(),
      end: new Date(t.getFullYear(), t.getMonth(), 1).getTime()
    }
  }
  if (mode.value === 'last12') {
    return { start: new Date(t.getFullYear(), t.getMonth() - 11, 1).getTime(), end: t.getTime() + 1 }
  }
  return { start: parseDate(rStart.value), end: dayExclusive(rEnd.value) }
}

const bounds = computed(() => rangeOf())

/** 区间标题（对齐 App _titleOf） */
const rangeTitle = computed<string>(() => {
  const t = new Date()
  if (mode.value === 'month') return `${t.getFullYear()}年${t.getMonth() + 1}月`
  if (mode.value === 'lastMonth') {
    const y = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
    const m = t.getMonth() === 0 ? 12 : t.getMonth()
    return `${y}年${m}月`
  }
  if (mode.value === 'last12') return '近12个月'
  return `${cnDate(rStart.value)} - ${cnDate(rEnd.value)}`
})

/** 区间内已收款合计（分，负数兜底为 0），口径同 App paidTotalInRange */
const paidTotal = computed<number>(() => {
  const { start, end } = bounds.value
  let total = 0
  for (const pay of data.payments) {
    const r = rowOf(pay)
    const ts = num(r['paid_at'])
    if (!(ts > 0) || ts < start || ts >= end) continue
    total += num(r['amount'])
  }
  return total < 0 ? 0 : total
})

/** 区间内有效报价总额（分，负数兜底为 0），口径同 App quotesTotalInRange */
const quoteTotal = computed<number>(() => {
  let total = 0
  for (const r of validQuotesInRange()) {
    total += num(r['total'])
  }
  return total < 0 ? 0 : total
})

/** 应收欠款（分，当前存量、不受时间范围过滤），口径同 App calcReceivableAmount */
const receivable = computed<number>(() => {
  let total = 0
  for (const item of data.pendingCollections) {
    const r = rowOf(item)
    if (num(r['status']) !== 0) continue
    total += num(r['amount'])
  }
  return total <= 0 ? 0 : total
})

const receivableCleared = computed(() => receivable.value <= 0)

/** 上月收入（分），口径同 App monthPaidTotal */
const lastMonthIncome = computed<number>(() => {
  const t = new Date()
  const y = t.getMonth() === 0 ? t.getFullYear() - 1 : t.getFullYear()
  const m = t.getMonth() === 0 ? 12 : t.getMonth()
  const start = new Date(y, m - 1, 1).getTime()
  const end = new Date(y, m, 1).getTime()
  let total = 0
  for (const pay of data.payments) {
    const r = rowOf(pay)
    const ts = num(r['paid_at'])
    if (!(ts > 0) || ts < start || ts >= end) continue
    total += num(r['amount'])
  }
  return total
})

const delta = computed<number>(() => paidTotal.value - lastMonthIncome.value)

const deltaRatio = computed<number>(() => {
  if (lastMonthIncome.value <= 0) return 0
  return Math.min(1, Math.max(-1, delta.value / lastMonthIncome.value))
})

/** 仅本月 / 上月模式展示月度对比（对齐 App） */
const showDelta = computed(() => mode.value === 'month' || mode.value === 'lastMonth')

const deltaLabel = computed<string>(() => {
  const sign = delta.value >= 0 ? '+' : ''
  const amountText = `${sign}${formatAmount(delta.value)}`
  if (mode.value === 'month') {
    return `较上月 ${amountText}（${(deltaRatio.value * 100).toFixed(1)}%）`
  }
  return `上月收入较本月 ${amountText}`
})

/** 近 12 个月收入柱（对齐 App monthlyIncomeLast12 + _MonthlyBarChart 高度公式） */
const monthlyBars = computed<BarItem[]>(() => {
  const t = new Date()
  const months: { month: number; value: number }[] = []
  for (let i = 11; i >= 0; i--) {
    const d = new Date(t.getFullYear(), t.getMonth() - i, 1)
    const start = d.getTime()
    const end = new Date(t.getFullYear(), t.getMonth() - i + 1, 1).getTime()
    let value = 0
    for (const pay of data.payments) {
      const r = rowOf(pay)
      const ts = num(r['paid_at'])
      if (!(ts > 0) || ts < start || ts >= end) continue
      value += num(r['amount'])
    }
    months.push({ month: d.getMonth() + 1, value })
  }
  const maxV = months.reduce((m, x) => (x.value > m ? x.value : m), 0)
  return months.map((x) => {
    const ratio = maxV <= 0 ? 0 : Math.min(1, Math.max(0, x.value / maxV))
    return {
      month: x.month,
      label: x.value > 0 ? thousands(x.value / 100) : '',
      height: maxV <= 0 ? 4 : Math.round(8 + 280 * ratio)
    }
  })
})

/** 区间内有效报价明细（排除草稿/作废/模板，与 App 统计口径一致） */
function validQuotesInRange(): Row[] {
  const { start, end } = bounds.value
  const out: Row[] = []
  for (const quote of data.quotes) {
    const r = rowOf(quote)
    if (!VALID_QUOTE_STATUS.includes(num(r['status']))) continue
    if (num(r['is_template']) === 1) continue
    const ts = num(r['created_at'])
    if (!(ts > 0) || ts < start || ts >= end) continue
    out.push(r)
  }
  return out
}

/** 分类汇总排行（对齐 App customerContributionInRange / quotesByTypeInRange / incomeByProjectStatus） */
const rankRows = computed<RankRow[]>(() => {
  const { start, end } = bounds.value

  if (groupMode.value === 'quoteType') {
    const rows: RankRow[] = []
    const index = new Map<string, number>()
    for (const r of validQuotesInRange()) {
      const type = String(r['quote_type'] ?? '') || 'simple'
      let pos = index.get(type)
      if (pos === undefined) {
        pos = rows.length
        index.set(type, pos)
        rows.push({ key: `type_${type}`, name: type === 'simple' ? '简单报价' : '详细报价', total: 0 })
      }
      rows[pos].total += num(r['total'])
    }
    return rows
  }

  const projById = new Map<number, Row>()
  for (const p of data.projects) {
    const r = rowOf(p)
    projById.set(num(r['id']), r)
  }
  const custById = new Map<number, Row>()
  for (const c of data.customers) {
    const r = rowOf(c)
    custById.set(num(r['id']), r)
  }

  const bucket = new Map<string, RankRow>()
  for (const pay of data.payments) {
    const r = rowOf(pay)
    const ts = num(r['paid_at'])
    if (!(ts > 0) || ts < start || ts >= end) continue
    const amount = num(r['amount'])
    const proj = projById.get(num(r['project_id']))

    let key: string
    let name: string
    if (groupMode.value === 'projectStatus') {
      if (!proj) {
        key = 'st_none'
        name = '其他 / 已删除项目'
      } else {
        key = `st_${num(proj['status'])}`
        name = statusLabel(proj['status'])
      }
    } else {
      const cid = proj ? num(proj['customer_id']) : 0
      const cust = cid > 0 ? custById.get(cid) : undefined
      name = cust ? String(cust['name'] ?? '未关联客户') : '未关联客户'
      key = `c_${name}`
    }

    const hit = bucket.get(key)
    if (hit) {
      hit.total += amount
    } else {
      bucket.set(key, { key, name, total: amount })
    }
  }

  return Array.from(bucket.values()).sort((a, b) => b.total - a.total)
})

function switchMode(m: StatMode) {
  if (mode.value === m) return
  mode.value = m
}

function openRangeSheet() {
  pickStart.value = rStart.value
  pickEnd.value = rEnd.value
  showSheet.value = true
}

function closeSheet() {
  showSheet.value = false
}

function onPickStart(e: { detail: { value: string } }) {
  pickStart.value = e.detail.value
  if (pickEnd.value < pickStart.value) pickEnd.value = pickStart.value
}

function onPickEnd(e: { detail: { value: string } }) {
  pickEnd.value = e.detail.value
  if (pickStart.value > pickEnd.value) pickStart.value = pickEnd.value
}

function confirmSheet() {
  rStart.value = pickStart.value
  rEnd.value = pickEnd.value
  showSheet.value = false
}

onShow(() => {
  data.refresh()
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  padding: 24rpx;
  padding-bottom: 60rpx;
  background: #f6f7fb;
  box-sizing: border-box;
}

/* ===== 筛选胶囊（对齐 AppFilterChip：品牌色 8% 底 / 选中纯品牌底白字 w700） ===== */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 8rpx 0;
}

.filter-chip {
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  font-size: 24rpx;
  line-height: 1.2;
  font-weight: 500;
  color: #1f2430;
  background: rgba(74, 90, 240, 0.08);
}

.filter-chip.active {
  color: #ffffff;
  background: #4a5af0;
  font-weight: 700;
}

.group-bar {
  padding-bottom: 8rpx;
}

/* ===== 自定义区间入口 ===== */
.range-entry {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  background: rgba(74, 90, 240, 0.06);
}

.range-entry-hover {
  opacity: 0.75;
}

.range-entry-text {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.range-entry-arrow {
  margin-left: 12rpx;
  font-size: 32rpx;
  line-height: 1;
  color: #8a93a6;
}

/* ===== 应收欠款卡（结清绿 / 待追回橙） ===== */
.receivable-card {
  margin-top: 12rpx;
  padding: 36rpx;
  border-radius: 28rpx;
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
}

.receivable-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36rpx;
  height: 36rpx;
  margin-right: 12rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.25);
  font-size: 22rpx;
  line-height: 1;
  color: #ffffff;
  flex-shrink: 0;
}

.receivable-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.9);
}

.receivable-amount {
  display: block;
  margin-top: 20rpx;
  font-size: 60rpx;
  font-weight: 700;
  line-height: 1.15;
  color: #ffffff;
}

.receivable-sub {
  display: block;
  margin-top: 16rpx;
  font-size: 24rpx;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.85);
}

/* ===== 通用卡 ===== */
.card {
  margin-top: 16rpx;
  padding: 32rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

/* ===== 区间汇总卡 ===== */
.summary-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.metric-row {
  display: flex;
  gap: 24rpx;
  margin-top: 24rpx;
}

.metric-block {
  flex: 1;
  min-width: 0;
  padding: 24rpx;
  border-radius: 20rpx;
}

.metric-block.accent {
  background: rgba(22, 160, 133, 0.08);
}

.metric-block.primary {
  background: rgba(74, 90, 240, 0.08);
}

.metric-label {
  font-size: 22rpx;
  color: #8a93a6;
}

.metric-value {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.metric-value.accent {
  color: #16a085;
}

.metric-value.primary {
  color: #4a5af0;
}

.delta-row {
  display: flex;
  align-items: center;
  margin-top: 24rpx;
}

.delta-icon {
  margin-right: 12rpx;
  font-size: 28rpx;
}

.delta-text {
  font-size: 24rpx;
  font-weight: 600;
}

.delta-icon.up,
.delta-text.up {
  color: #27ae60;
}

.delta-icon.down,
.delta-text.down {
  color: #e74c3c;
}

/* ===== 区块标题 ===== */
.section-head {
  padding: 28rpx 6rpx 12rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

/* ===== 月度柱状图 ===== */
.chart-card {
  height: 420rpx;
  box-sizing: border-box;
  padding: 40rpx 16rpx 16rpx;
}

.chart-body {
  display: flex;
  align-items: flex-end;
  height: 320rpx;
}

.bar-col {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
}

.bar-value {
  width: 100%;
  height: 22rpx;
  font-size: 18rpx;
  line-height: 22rpx;
  text-align: center;
  color: #8a93a6;
  overflow: hidden;
}

.bar {
  width: 36rpx;
  border-radius: 8rpx 8rpx 0 0;
  background: linear-gradient(180deg, #4a5af0 0%, #7c5cf0 100%);
}

.chart-labels {
  display: flex;
  height: 24rpx;
  margin-top: 12rpx;
}

.chart-label {
  flex: 1;
  min-width: 0;
  font-size: 20rpx;
  line-height: 24rpx;
  text-align: center;
  color: #8a93a6;
}

/* ===== 排行列表 ===== */
.rank-card {
  padding: 12rpx 0;
}

.rank-row {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
}

.rank-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48rpx;
  height: 48rpx;
  margin-right: 24rpx;
  border-radius: 50%;
  background: rgba(138, 147, 166, 0.12);
  font-size: 24rpx;
  font-weight: 700;
  color: #8a93a6;
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
  margin-left: 24rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
  white-space: nowrap;
}

/* ===== 空态 / 口径说明 ===== */
.empty-card {
  padding: 60rpx 0;
  text-align: center;
}

.empty-text {
  font-size: 26rpx;
  color: #8a93a6;
}

.note {
  display: block;
  padding: 24rpx 6rpx 0;
  font-size: 22rpx;
  line-height: 1.6;
  color: #8a93a6;
}

/* ===== 底部弹层（与 history.vue 同款） ===== */
.sheet-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 18, 30, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 24rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.sheet-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
  margin-bottom: 24rpx;
}

.picker-row {
  margin-bottom: 20rpx;
}

.picker-row.half {
  flex: 1;
  margin-bottom: 0;
}

.picker-cell {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(74, 90, 240, 0.08);
  border-radius: 16rpx;
  padding: 24rpx;
}

.picker-label {
  font-size: 26rpx;
  color: #8a93a6;
}

.picker-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.range-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.range-sep {
  font-size: 24rpx;
  color: #8a93a6;
  flex-shrink: 0;
}

.sheet-btn {
  margin-top: 10rpx;
  text-align: center;
  background: linear-gradient(135deg, #4a5af0, #7c5cf0);
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
  border-radius: 40rpx;
  padding: 22rpx 0;
}
/* ===== VIP 门禁（对齐 App _vipGate：入口不隐藏，免费用户进入即见升级引导） ===== */
.gate {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 56rpx 56rpx 140rpx;
  box-sizing: border-box;
  background: #f6f7fb;
}

.gate-icon {
  position: relative;
  width: 128rpx;
  height: 128rpx;
}

.lock-shackle {
  position: absolute;
  top: 4rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  height: 52rpx;
  border: 10rpx solid #4a5af0;
  border-bottom: none;
  border-radius: 32rpx 32rpx 0 0;
  box-sizing: border-box;
}

.lock-body {
  position: absolute;
  top: 46rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 96rpx;
  height: 76rpx;
  background: #4a5af0;
  border-radius: 16rpx;
  box-shadow: 0 10rpx 22rpx rgba(74, 90, 240, 0.22);
}

.gate-title {
  margin-top: 32rpx;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.4;
  text-align: center;
  color: #1f2430;
}

.gate-desc {
  margin-top: 16rpx;
  font-size: 26rpx;
  line-height: 1.5;
  text-align: center;
  color: #8a93a6;
}

.gate-btn {
  margin-top: 48rpx;
  padding: 22rpx 56rpx;
  border-radius: 44rpx;
  background: #4a5af0;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
  box-shadow: 0 10rpx 24rpx rgba(74, 90, 240, 0.28);
}

.gate-btn-hover {
  opacity: 0.85;
}
</style>
