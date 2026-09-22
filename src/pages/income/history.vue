<template>
  <view class="page">
    <!-- 筛选模式切换（对齐 App RangeFilterBar：左对齐、纯文字、间距一致、不做等宽拉伸） -->
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

    <!-- 时间切换条 -->
    <view class="nav-row">
      <view class="nav-btn" hover-class="nav-hover" @tap="shift(-1)">‹</view>
      <view class="nav-label" hover-class="nav-hover" @tap="openPicker">
        <text class="nav-label-text">{{ navLabel }}</text>
      </view>
      <view v-if="!isCurrent" class="today-btn" hover-class="nav-hover" @tap="goCurrent">回到当前</view>
      <view v-else class="today-spacer"></view>
      <view class="nav-btn" hover-class="nav-hover" @tap="shift(1)">›</view>
    </view>

    <!-- 收入汇总卡 -->
    <view class="summary-card">
      <text class="summary-title">{{ summaryTitle }}</text>
      <text class="summary-amount">¥{{ formatAmount(totalAmount) }}</text>
      <text class="summary-count">{{ rows.length }} 笔收款合计</text>
    </view>

    <!-- 收款明细 -->
    <view class="section-head">
      <text class="section-title">收款明细</text>
    </view>
    <view v-if="!rows.length" class="empty">
      <text class="empty-text">{{ emptyText }}</text>
    </view>
    <view v-else class="row-list">
      <view v-for="(r, i) in rows" :key="String(r.id)" class="row-card">
        <view class="row-date">
          <text class="row-day">{{ r.day }}</text>
          <text class="row-mon">{{ r.monthLabel }}</text>
        </view>
        <view class="row-main">
          <text class="row-title">{{ r.projectTitle }}</text>
          <text class="row-sub">{{ r.note ? r.typeText + ' · ' + r.note : r.typeText }}</text>
        </view>
        <text class="row-amount">+¥{{ formatAmount(r.amount) }}</text>
      </view>
    </view>

    <!-- 区间选择底部弹层 -->
    <view v-if="showPicker" class="sheet-mask" @tap="closePicker">
      <view class="sheet" @tap.stop>
        <view v-if="sheetTitle" class="sheet-title">{{ sheetTitle }}</view>

        <!-- 月模式：年份步进 + 12 宫格（对齐 App _MonthPickerSheet） -->
        <template v-if="mode === 'month'">
          <view class="year-nav">
            <view class="year-btn" hover-class="nav-hover" @tap="yearNav(-1)">‹</view>
            <text class="year-text">{{ pickYear }} 年</text>
            <view class="year-btn" hover-class="nav-hover" @tap="yearNav(1)">›</view>
          </view>
          <view class="month-grid">
            <view
              v-for="mo in 12"
              :key="mo"
              class="month-cell"
              :class="{ active: isMonthSelected(mo), future: isMonthFuture(mo) }"
              @tap="pickMonthCell(mo)"
            >
              {{ mo }}月
            </view>
          </view>
        </template>

        <!-- 年模式：年份滚动列表 -->
        <template v-else-if="mode === 'year'">
          <scroll-view class="year-scroll" scroll-y>
            <view
              v-for="y in yearOptions"
              :key="y"
              class="year-cell"
              :class="{ active: y === pickYear }"
              @tap="pickYear = y"
            >
              {{ y }}年
            </view>
          </scroll-view>
        </template>

        <!-- 周模式：日历选一天 -->
        <template v-else-if="mode === 'week'">
          <view class="picker-row">
            <picker mode="date" :value="weekDateStr" start="2000-01-01" end="2035-12-31" @change="onWeekChange">
              <view class="picker-cell">
                <text class="picker-label">所选日期</text>
                <text class="picker-value">{{ weekDateStr }}</text>
              </view>
            </picker>
          </view>
        </template>

        <!-- 区间模式：起止两个日期 -->
        <template v-else>
          <view class="range-row">
            <view class="picker-row half">
              <picker mode="date" :value="pickRStart" start="2000-01-01" end="2035-12-31" @change="onRStartChange">
                <view class="picker-cell">
                  <text class="picker-label">开始日期</text>
                  <text class="picker-value">{{ pickRStart }}</text>
                </view>
              </picker>
            </view>
            <view class="range-sep">至</view>
            <view class="picker-row half">
              <picker mode="date" :value="pickREnd" start="2000-01-01" end="2035-12-31" @change="onREndChange">
                <view class="picker-cell">
                  <text class="picker-label">结束日期</text>
                  <text class="picker-value">{{ pickREnd }}</text>
                </view>
              </picker>
            </view>
          </view>
        </template>

        <view v-if="mode !== 'week'" class="sheet-btn" @tap="confirmPicker">确定</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount, payTypeText } from '@/utils/format'
import type { Payment } from '@/utils/types'

const user = useUserStore()
const data = useDataStore()

type RangeMode = 'month' | 'week' | 'year' | 'range'
type Row = Record<string, unknown>

/** 展示顺序对齐 App income_history_page：按周 / 按月 / 按年 / 自定义 */
const MODE_LIST: { key: RangeMode; label: string }[] = [
  { key: 'week', label: '按周' },
  { key: 'month', label: '按月' },
  { key: 'year', label: '按年' },
  { key: 'range', label: '自定义' }
]

const MIN_YEAR = 2000
const MAX_YEAR = new Date().getFullYear() + 1

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function dayStartOf(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
}

function addDays(ts: number, n: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n).getTime()
}

function monthStartOf(ts: number): number {
  const d = new Date(ts)
  return new Date(d.getFullYear(), d.getMonth(), 1).getTime()
}

/** 某天所在自然周（周一开始）的周一 */
function weekStartOf(ts: number): number {
  const d = new Date(ts)
  const dow = d.getDay() // 0=周日 ... 6=周六
  const back = dow === 0 ? 6 : dow - 1
  return addDays(dayStartOf(ts), -back)
}

function dateStr(ts: number): string {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function parseDate(s: string): number {
  const [y, m, d] = s.split('-').map((x) => Number(x))
  return new Date(y, m - 1, d).getTime()
}

/** 起止区间文案：起止两端都带年份（同年也不省略，对齐 App _rangeLabel） */
function rangeLabel(s: number, e: number): string {
  const d0 = new Date(s)
  const d1 = new Date(e)
  return `${d0.getFullYear()}年${d0.getMonth() + 1}月${d0.getDate()}日 - ${d1.getFullYear()}年${d1.getMonth() + 1}月${d1.getDate()}日`
}

const mode = ref<RangeMode>('month')

// 各模式状态（与 App income_history_page 对齐）
const mYear = ref(new Date().getFullYear())
const mMonth = ref(new Date().getMonth() + 1)
const yYear = ref(new Date().getFullYear())
const weekAnchor = ref(weekStartOf(Date.now()))
const rStart = ref(monthStartOf(Date.now()))
const rEnd = ref(dayStartOf(Date.now()))

// 弹层状态
const showPicker = ref(false)
const pickYear = ref(mYear.value)
const pickMonth = ref(mMonth.value)
const pickRStart = ref(dateStr(rStart.value))
const pickREnd = ref(dateStr(rEnd.value))

const modeList = MODE_LIST

/** 当前模式时间范围 [s, e) 与汇总标题 */
function rangeOf(): { s: number; e: number; title: string } {
  if (mode.value === 'month') {
    const s = new Date(mYear.value, mMonth.value - 1, 1).getTime()
    const e = new Date(mYear.value, mMonth.value, 1).getTime()
    return { s, e, title: `${mYear.value}年${mMonth.value}月收入` }
  }
  if (mode.value === 'week') {
    const ws = weekStartOf(weekAnchor.value)
    const we = addDays(ws, 6)
    const d0 = new Date(ws)
    const d1 = new Date(we)
    return {
      s: ws,
      e: addDays(we, 1),
      title: `${d0.getMonth() + 1}月${d0.getDate()}日 - ${d1.getMonth() + 1}月${d1.getDate()}日 收入`
    }
  }
  if (mode.value === 'year') {
    return {
      s: new Date(yYear.value, 0, 1).getTime(),
      e: new Date(yYear.value + 1, 0, 1).getTime(),
      title: `${yYear.value}年收入`
    }
  }
  const s = dayStartOf(rStart.value)
  const e = addDays(dayStartOf(rEnd.value), 1)
  return { s, e, title: `${rangeLabel(s, rEnd.value)} 收入` }
}

const bounds = computed(() => rangeOf())

const navLabel = computed(() => {
  if (mode.value === 'month') return `${mYear.value}年 ${mMonth.value}月`
  if (mode.value === 'week') {
    const ws = weekStartOf(weekAnchor.value)
    return rangeLabel(ws, addDays(ws, 6))
  }
  if (mode.value === 'year') return `${yYear.value}年`
  return rangeLabel(rStart.value, rEnd.value)
})

const isCurrent = computed(() => {
  const now = new Date()
  if (mode.value === 'month') return mYear.value === now.getFullYear() && mMonth.value === now.getMonth() + 1
  if (mode.value === 'week') return weekStartOf(weekAnchor.value) === weekStartOf(Date.now())
  if (mode.value === 'year') return yYear.value === now.getFullYear()
  return rStart.value === monthStartOf(Date.now()) && rEnd.value === dayStartOf(Date.now())
})

const summaryTitle = computed(() => bounds.value.title)

function projectTitleOf(pid: unknown): string {
  const id = Number(pid)
  const p = data.projects.find((x) => Number((x as Row)['id']) === id)
  if (!p) return '已删除项目'
  return String((p as Row)['title'] || '未命名项目')
}

interface RowView {
  id: unknown
  day: string
  monthLabel: string
  projectTitle: string
  typeText: string
  note: string
  amount: number
}

/** 明细行：按收款时间倒序，字段与 App _IncomeRowTile 一致 */
const rows = computed<RowView[]>(() => {
  const { s, e } = bounds.value
  const arr = data.payments
    .slice()
    .filter((pay) => {
      const row = pay as Row
      const t = num(row['paid_at'])
      return t > 0 && t >= s && t < e
    })
    .sort((a, b) => num((b as Row)['paid_at']) - num((a as Row)['paid_at']))
  return arr.map((pay) => {
    const row = pay as Row
    const d = new Date(num(row['paid_at']))
    return {
      id: row['id'],
      day: String(d.getDate()),
      monthLabel: `${d.getMonth() + 1}月`,
      projectTitle: projectTitleOf(row['project_id']),
      typeText: payTypeText(row['type'], row['type_label']),
      note: String(row['note'] || ''),
      amount: num(row['amount'])
    }
  })
})

const totalAmount = computed(() => Math.max(0, rows.value.reduce((s, r) => s + r.amount, 0)))

const emptyText = computed(() => {
  if (mode.value === 'month' && isCurrent.value) {
    return '本月还没有收款记录\n登记收款后会显示在这里'
  }
  return '该时间段没有收款记录'
})

// ---------- 模式与区间导航 ----------

function switchMode(m: RangeMode) {
  if (mode.value === m) return
  mode.value = m
}

function shift(delta: number) {
  const now = new Date()
  if (mode.value === 'month') {
    let y = mYear.value
    let m = mMonth.value + delta
    while (m < 1) {
      m += 12
      y -= 1
    }
    while (m > 12) {
      m -= 12
      y += 1
    }
    if (y < MIN_YEAR || y > MAX_YEAR) return
    mYear.value = y
    mMonth.value = m
    return
  }
  if (mode.value === 'week') {
    const next = addDays(weekAnchor.value, 7 * delta)
    if (new Date(next).getFullYear() < MIN_YEAR) return
    weekAnchor.value = next
    return
  }
  if (mode.value === 'year') {
    const y = yYear.value + delta
    if (y < MIN_YEAR || y > MAX_YEAR) return
    yYear.value = y
    return
  }
  const s = addDays(rStart.value, 7 * delta)
  const e = addDays(rEnd.value, 7 * delta)
  if (new Date(s).getFullYear() < MIN_YEAR) return
  rStart.value = s
  rEnd.value = e
}

function goCurrent() {
  const now = new Date()
  if (mode.value === 'month') {
    mYear.value = now.getFullYear()
    mMonth.value = now.getMonth() + 1
  } else if (mode.value === 'week') {
    weekAnchor.value = weekStartOf(Date.now())
  } else if (mode.value === 'year') {
    yYear.value = now.getFullYear()
  } else {
    rStart.value = monthStartOf(Date.now())
    rEnd.value = dayStartOf(Date.now())
  }
}

// ---------- 区间选择弹层 ----------

const sheetTitle = computed(() => {
  if (mode.value === 'month') return ''
  if (mode.value === 'year') return '选择年份'
  if (mode.value === 'week') return '选择一周内的任意一天'
  return '选择起止日期'
})

const weekDateStr = computed(() => dateStr(weekAnchor.value))

const yearOptions = computed(() => {
  const arr: number[] = []
  for (let y = MAX_YEAR; y >= MIN_YEAR; y -= 1) arr.push(y)
  return arr
})

/** 月宫格：命中当前已选年月 */
function isMonthSelected(mo: number): boolean {
  return pickYear.value === mYear.value && mo === mMonth.value
}

/** 月宫格：未来月份不可选（对齐 App _MonthPickerSheet.isFuture） */
function isMonthFuture(mo: number): boolean {
  const now = new Date()
  return pickYear.value === now.getFullYear() && mo > now.getMonth() + 1
}

function pickMonthCell(mo: number) {
  if (isMonthFuture(mo)) return
  pickMonth.value = mo
}

function openPicker() {
  pickYear.value = mode.value === 'year' ? yYear.value : mYear.value
  pickMonth.value = mMonth.value
  pickRStart.value = dateStr(rStart.value)
  pickREnd.value = dateStr(rEnd.value)
  showPicker.value = true
}

function closePicker() {
  showPicker.value = false
}

function yearNav(delta: number) {
  const y = pickYear.value + delta
  if (y >= MIN_YEAR && y <= MAX_YEAR) pickYear.value = y
}

function onWeekChange(e: { detail: { value: string } }) {
  weekAnchor.value = weekStartOf(parseDate(e.detail.value))
  showPicker.value = false
}

function onRStartChange(e: { detail: { value: string } }) {
  pickRStart.value = e.detail.value
}

function onREndChange(e: { detail: { value: string } }) {
  pickREnd.value = e.detail.value
}

function confirmPicker() {
  if (mode.value === 'month') {
    mYear.value = pickYear.value
    mMonth.value = pickMonth.value
  } else if (mode.value === 'year') {
    yYear.value = pickYear.value
  } else if (mode.value === 'range') {
    let s = parseDate(pickRStart.value)
    let e = parseDate(pickREnd.value)
    if (e < s) {
      const t = s
      s = e
      e = t
    }
    rStart.value = s
    rEnd.value = e
  }
  showPicker.value = false
}

onShow(() => {
  if (user.isLoggedIn) data.refresh()
})
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 48rpx;
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
}

/* 筛选模式切换（对齐 AppFilterChip：胶囊 + 品牌色 8% 底） */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  padding: 8rpx 0;
}

.filter-chip {
  font-size: 24rpx;
  line-height: 1.2;
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  color: #1f2430;
  font-weight: 500;
  background: rgba(74, 90, 240, 0.08);
}

.filter-chip.active {
  color: #ffffff;
  background: #4a5af0;
  font-weight: 700;
}

.nav-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 16rpx;
  padding: 6rpx 8rpx;
  box-shadow: 0 2rpx 10rpx rgba(31, 36, 48, 0.04);
}

.nav-btn {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #4a5af0;
  font-weight: 600;
  flex-shrink: 0;
}

.nav-hover {
  opacity: 0.5;
}

.nav-label {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 20rpx 8rpx;
}

.nav-label-text {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.today-btn {
  font-size: 22rpx;
  color: #4a5af0;
  padding: 10rpx 16rpx;
  border: 1rpx solid rgba(74, 90, 240, 0.35);
  border-radius: 24rpx;
  flex-shrink: 0;
  white-space: nowrap;
}

.today-spacer {
  width: 88rpx;
  flex-shrink: 0;
}

/* 收入汇总卡（对齐 App _SummaryCard：标题 → 金额 → 笔数） */
.summary-card {
  margin: 8rpx 32rpx 16rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  border-radius: 28rpx;
  padding: 40rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.summary-title {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.summary-amount {
  margin-top: 16rpx;
  font-size: 68rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.2;
}

.summary-count {
  margin-top: 28rpx;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.7);
}

.section-head {
  padding: 16rpx 36rpx 8rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

.empty {
  padding: 80rpx 40rpx;
  display: flex;
  justify-content: center;
}

.empty-text {
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.6;
  text-align: center;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.row-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 28rpx;
  padding: 26rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.row-date {
  width: 92rpx;
  height: 92rpx;
  border-radius: 24rpx;
  background: rgba(74, 90, 240, 0.1);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
  flex-shrink: 0;
}

.row-day {
  font-size: 30rpx;
  font-weight: 700;
  color: #4a5af0;
  line-height: 1.1;
}

.row-mon {
  margin-top: 2rpx;
  font-size: 20rpx;
  color: rgba(74, 90, 240, 0.7);
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-amount {
  margin-left: 16rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #4a5af0;
  white-space: nowrap;
}

/* 底部弹层 */
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

.year-nav {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
}

.year-btn {
  width: 88rpx;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  color: #4a5af0;
}

.year-text {
  flex: 1;
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
  text-align: center;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.month-cell {
  text-align: center;
  padding: 22rpx 0;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
  color: #1f2430;
  background: rgba(74, 90, 240, 0.08);
}

.month-cell.active {
  color: #fff;
  background: #4a5af0;
  font-weight: 700;
}

.month-cell.future {
  color: rgba(140, 146, 166, 0.4);
  background: transparent;
}

.year-scroll {
  max-height: 440rpx;
  margin-bottom: 24rpx;
}

.year-cell {
  text-align: center;
  padding: 20rpx 0;
  font-size: 28rpx;
  color: #1f2430;
}

.year-cell.active {
  color: #4a5af0;
  font-weight: 700;
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
</style>
