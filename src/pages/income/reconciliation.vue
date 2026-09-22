<template>
  <!-- VIP 门禁（对齐 App _vipGate：入口不隐藏，免费用户进入即见升级引导） -->
  <view v-if="!user.isPro" class="gate">
    <view class="gate-icon">
      <view class="lock-shackle"></view>
      <view class="lock-body"></view>
    </view>
    <text class="gate-title">经营对账汇总为专业版专属</text>
    <text class="gate-desc">多维度经营对账报表为专业版专属权益。</text>
    <view class="gate-btn" hover-class="gate-btn-hover" @tap="goPro">升级 VIP 解锁</view>
  </view>

  <view v-else class="page">
    <!-- 汇总卡（对齐 App _SummaryCard：标题 → 约定总额/累计已收/待收总额 → 项目结清统计） -->
    <view class="card summary-card">
      <text class="summary-title">汇总</text>
      <view class="sum-row">
        <view class="sum-item">
          <text class="sum-label">约定总额</text>
          <text class="sum-value">¥{{ formatAmount(totalAgreed) }}</text>
        </view>
        <view class="sum-item">
          <text class="sum-label">累计已收</text>
          <text class="sum-value accent">¥{{ formatAmount(totalPaid) }}</text>
        </view>
        <view class="sum-item">
          <text class="sum-label">待收总额</text>
          <text class="sum-value warn">¥{{ formatAmount(totalPending) }}</text>
        </view>
      </view>
      <text class="sum-foot">共 {{ projectRows.length }} 个项目，已结清 {{ clearedCount }} 个</text>
    </view>

    <!-- 项目维度汇总（对齐 App _buildRow：项目名/客户 + 约定-已收-待收 + 收款进度条） -->
    <view v-if="!projectRows.length" class="card empty-card">
      <text class="empty-text">还没有项目收款数据</text>
    </view>
    <view v-else class="card list-card">
      <view
        v-for="(r, i) in projectRows"
        :key="r.id"
        class="proj-row"
        :class="{ 'row-line': i > 0 }"
      >
        <view class="proj-top">
          <text class="proj-title">{{ r.title }}</text>
          <text v-if="r.pending <= 0" class="tag ok">已结清</text>
          <text v-else class="tag warn">待收中</text>
        </view>
        <text v-if="r.customer" class="proj-customer">{{ r.customer }}</text>
        <view class="proj-items">
          <view class="proj-item">
            <text class="proj-label">约定</text>
            <text class="proj-value">¥{{ formatAmount(r.agreed) }}</text>
          </view>
          <view class="proj-item">
            <text class="proj-label">已收</text>
            <text class="proj-value accent">¥{{ formatAmount(r.paid) }}</text>
          </view>
          <view class="proj-item">
            <text class="proj-label">待收</text>
            <text class="proj-value warn">¥{{ formatAmount(r.pending) }}</text>
          </view>
        </view>
        <view class="prog-track">
          <view class="prog-fill" :style="{ width: r.ratio * 100 + '%' }"></view>
        </view>
        <text class="prog-text">收款进度 {{ Math.round(r.ratio * 100) }}%</text>
      </view>
    </view>

    <!-- 收款流水（对齐 App 第17批 _buildFlowsSection：标题+统计 → 全部/未对账/已对账 筛选 → 流水明细） -->
    <view class="flow-head">
      <text class="flow-title">收款流水</text>
      <text class="flow-count">{{ flowSub }}</text>
    </view>
    <view class="chip-bar">
      <view
        v-for="f in flowFilters"
        :key="f.value"
        class="filter-chip"
        :class="['chip-' + f.tone, { active: flowFilter === f.value }]"
        @tap="flowFilter = f.value"
      >
        {{ f.label }}
      </view>
    </view>
    <view v-if="!flowRows.length" class="card empty-card">
      <text class="empty-text">暂无收款流水，登记收款后在此对账</text>
    </view>
    <view v-else class="card list-card">
      <view
        v-for="(f, i) in flowRows"
        :key="f.id"
        class="flow-row"
        :class="{ 'row-line': i > 0 }"
      >
        <view class="flow-main">
          <view class="flow-line1">
            <text class="flow-amount">+¥{{ formatAmount(f.amount) }}</text>
            <text class="flow-type">{{ f.typeText }}</text>
          </view>
          <text class="flow-project">{{ f.project }}</text>
          <text class="flow-sub">{{ f.subLine }}</text>
        </view>
        <text class="tag" :class="f.reconciled === 1 ? 'ok' : 'warn'">
          {{ f.reconciled === 1 ? '已对账' : '未对账' }}
        </text>
        <view
          class="flow-toggle"
          :class="f.reconciled === 1 ? 'done' : 'todo'"
          hover-class="flow-toggle-hover"
          @tap="toggleFlow(f)"
        >
          {{ f.reconciled === 1 ? '↺' : '✓' }}
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount, formatDate, payTypeText } from '@/utils/format'

const user = useUserStore()
const data = useDataStore()

/** 升级引导跳转（对齐 App PaywallPage(title:'升级专业版', desc:'解锁全部高级经营功能')） */
function goPro() {
  uni.navigateTo({ url: '/pages/wallet/pro' })
}

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function str(v: unknown): string {
  return String(v ?? '').trim()
}

interface ProjRow {
  id: number
  title: string
  customer: string
  agreed: number
  paid: number
  pending: number
  ratio: number
}

const projectById = computed(() => {
  const m = new Map<number, Row>()
  for (const p of data.projects) m.set(num((p as Row)['id']), p as Row)
  return m
})

const quoteById = computed(() => {
  const m = new Map<number, Row>()
  for (const q of data.quotes) m.set(num((q as Row)['id']), q as Row)
  return m
})

const customerById = computed(() => {
  const m = new Map<number, Row>()
  for (const c of data.customers) m.set(num((c as Row)['id']), c as Row)
  return m
})

/** 项目已收合计（分），口径同 App reconciliationSummary 的 paid_total（SUM(payments.amount)） */
function paidOf(pid: number): number {
  let sum = 0
  for (const pay of data.payments) {
    const row = pay as Row
    if (num(row['project_id']) === pid) sum += num(row['amount'])
  }
  return sum
}

/**
 * 项目待收合计（分），口径同 App reconciliationSummary 的 pending_total：
 * SUM(pending_collections.amount WHERE status = 0)，为当前未结清存量、不受项目阶段与时间影响。
 */
function pendingOf(pid: number): number {
  let sum = 0
  for (const item of data.pendingCollections) {
    const row = item as Row
    if (num(row['project_id']) !== pid) continue
    if (num(row['status']) !== 0) continue
    sum += num(row['amount'])
  }
  return sum
}

/** 项目维度汇总（对齐 App：ORDER BY updated_at DESC，标题空值按「（未命名项目）」兜底） */
const projectRows = computed<ProjRow[]>(() => {
  const arr: ProjRow[] = []
  for (const p of data.projects) {
    const row = p as Row
    const id = num(row['id'])
    const agreed = num(row['amount_total'])
    const paid = paidOf(id)
    const pending = pendingOf(id)
    const ratio = agreed <= 0 ? 0 : Math.min(1, Math.max(0, paid / agreed))
    const cid = num(row['customer_id'])
    const cu = cid > 0 ? customerById.value.get(cid) : undefined
    arr.push({
      id,
      title: str(row['title']) || '（未命名项目）',
      customer: cu ? str((cu as Row)['name']) : '未关联客户',
      agreed,
      paid,
      pending,
      ratio
    })
  }
  arr.sort((a, b) => {
    const pa = num((projectById.value.get(a.id) as Row)['updated_at'] || 0)
    const pb = num((projectById.value.get(b.id) as Row)['updated_at'] || 0)
    return pb - pa
  })
  return arr
})

const totalAgreed = computed(() => projectRows.value.reduce((s, r) => s + r.agreed, 0))
const totalPaid = computed(() => projectRows.value.reduce((s, r) => s + r.paid, 0))
const totalPending = computed(() => projectRows.value.reduce((s, r) => s + r.pending, 0))
const clearedCount = computed(() => projectRows.value.filter((r) => r.pending <= 0).length)

// ---------- 收款流水 ----------

/** 筛选顺序与文案对齐 App（全部 / 未对账 / 已对账），tone 对应 AppFilterChip 的 color */
const FLOW_FILTERS: { label: string; value: number; tone: 'primary' | 'warn' | 'accent' }[] = [
  { label: '全部', value: 0, tone: 'primary' },
  { label: '未对账', value: 1, tone: 'warn' },
  { label: '已对账', value: 2, tone: 'accent' }
]
const flowFilters = FLOW_FILTERS
const flowFilter = ref(0)

interface FlowRow {
  id: number
  amount: number
  typeText: string
  reconciled: number
  project: string
  subLine: string
}

/** 全量收款流水（对齐 App reconciliationFlows：按 paid_at DESC，含项目/关联报价标题） */
const flowAll = computed<FlowRow[]>(() => {
  const projectMap = projectById.value
  const quoteMap = quoteById.value
  return data.payments
    .slice()
    .sort((a, b) => num((b as Row)['paid_at']) - num((a as Row)['paid_at']))
    .map((pay) => {
      const row = pay as Row
      const pid = num(row['project_id'])
      const pr = projectMap.get(pid)
      const project = pr ? str((pr as Row)['title']) || '（未命名项目）' : '已删除项目'
      const quoteId = num(row['quote_id'])
      const quote = quoteId > 0 ? quoteMap.get(quoteId) : undefined
      const t = num(row['paid_at'])
      // 副行口径同 App：日期 · 报价·xxx · 备注
      const parts = [
        t > 0 ? formatDate(t) : '-',
        quote ? `报价·${str((quote as Row)['title'])}` : '',
        str(row['note'])
      ].filter(Boolean)
      return {
        id: num(row['id']),
        amount: num(row['amount']),
        typeText: payTypeText(row['type'], row['type_label']),
        reconciled: num(row['reconciled']),
        project,
        subLine: parts.join(' · ')
      }
    })
})

const flowRows = computed(() => {
  if (flowFilter.value === 1) return flowAll.value.filter((f) => f.reconciled !== 1)
  if (flowFilter.value === 2) return flowAll.value.filter((f) => f.reconciled === 1)
  return flowAll.value
})

/** 统计文案口径同 App：全部→共 N 笔其中未对账 M 笔 / 未对账→M 笔 / 已对账→N 笔 */
const flowSub = computed(() => {
  const unRec = flowAll.value.filter((f) => f.reconciled !== 1).length
  if (flowFilter.value === 0) return `共 ${flowAll.value.length} 笔，其中未对账 ${unRec} 笔`
  if (flowFilter.value === 1) return `未对账 ${unRec} 笔`
  return `已对账 ${flowAll.value.length - unRec} 笔`
})

/** 切换对账标记（对齐 App _toggleFlow：0 未对账 / 1 已对账 + 提示文案） */
async function toggleFlow(f: FlowRow) {
  const cur = f.reconciled === 1
  const ok = await data.updatePayment(f.id, { reconciled: cur ? 0 : 1 } as Row)
  if (!ok) {
    uni.showToast({ title: '操作失败，请稍后重试', icon: 'none' })
    return
  }
  uni.showToast({ title: cur ? '已取消对账标记' : '已标记为已对账', icon: 'none' })
}

onShow(() => {
  if (!user.isLoggedIn) return
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

.card {
  margin-top: 16rpx;
  background: #ffffff;
  border-radius: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

/* ===== 汇总卡 ===== */
.summary-card {
  padding: 32rpx;
}

.summary-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.sum-row {
  margin-top: 24rpx;
  display: flex;
  gap: 16rpx;
}

.sum-item {
  flex: 1;
  min-width: 0;
}

.sum-label {
  display: block;
  font-size: 22rpx;
  line-height: 1.2;
  color: #8a93a6;
}

.sum-value {
  display: block;
  margin-top: 4rpx;
  font-size: 32rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2430;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sum-value.accent {
  color: #16a085;
}

.sum-value.warn {
  color: #e67e22;
}

.sum-foot {
  display: block;
  margin-top: 20rpx;
  font-size: 24rpx;
  line-height: 1.3;
  color: #8a93a6;
}

/* ===== 卡片列表 ===== */
.list-card {
  overflow: hidden;
}

.row-line {
  border-top: 1rpx solid #f0f1f5;
}

/* ===== 项目维度行（对齐 App _buildRow） ===== */
.proj-row {
  padding: 24rpx 28rpx;
}

.proj-top {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.proj-title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  line-height: 1.3;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex-shrink: 0;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  font-size: 22rpx;
  font-weight: 600;
  line-height: 1.2;
}

.tag.ok {
  color: #16a085;
  background: rgba(22, 160, 133, 0.12);
}

.tag.warn {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.12);
}

.proj-customer {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  line-height: 1.3;
  color: #8a93a6;
}

.proj-items {
  margin-top: 16rpx;
  display: flex;
  gap: 16rpx;
}

.proj-item {
  flex: 1;
  min-width: 0;
}

.proj-label {
  display: block;
  font-size: 22rpx;
  line-height: 1.2;
  color: #8a93a6;
}

.proj-value {
  display: block;
  margin-top: 4rpx;
  font-size: 28rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #1f2430;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.proj-value.accent {
  color: #16a085;
}

.proj-value.warn {
  color: #e67e22;
}

.prog-track {
  margin-top: 16rpx;
  height: 12rpx;
  border-radius: 8rpx;
  background: rgba(74, 90, 240, 0.1);
  overflow: hidden;
}

.prog-fill {
  height: 100%;
  border-radius: 8rpx;
  background: #4a5af0;
  transition: width 0.3s;
}

.prog-text {
  display: block;
  margin-top: 8rpx;
  font-size: 22rpx;
  line-height: 1.2;
  color: #8a93a6;
}

/* ===== 空态 ===== */
.empty-card {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 30rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #8a93a6;
}

/* ===== 收款流水区块 ===== */
.flow-head {
  margin-top: 28rpx;
  padding: 8rpx 6rpx 16rpx;
  display: flex;
  align-items: baseline;
  gap: 20rpx;
}

.flow-title {
  flex-shrink: 0;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.flow-count {
  flex: 1;
  min-width: 0;
  font-size: 24rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ===== 筛选胶囊（对齐 AppFilterChip：未选色值 8% 底 + 正文色 w500；选中纯色底白字 w700） ===== */
.chip-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  padding: 0 6rpx 8rpx;
}

.filter-chip {
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  font-size: 24rpx;
  line-height: 1.2;
  font-weight: 500;
}

.filter-chip.chip-primary {
  color: #1f2430;
  background: rgba(74, 90, 240, 0.08);
}

.filter-chip.chip-primary.active {
  color: #ffffff;
  background: #4a5af0;
  font-weight: 700;
}

.filter-chip.chip-warn {
  color: #1f2430;
  background: rgba(230, 126, 34, 0.08);
}

.filter-chip.chip-warn.active {
  color: #ffffff;
  background: #e67e22;
  font-weight: 700;
}

.filter-chip.chip-accent {
  color: #1f2430;
  background: rgba(22, 160, 133, 0.08);
}

.filter-chip.chip-accent.active {
  color: #ffffff;
  background: #16a085;
  font-weight: 700;
}

/* ===== 流水行（对齐 App _FlowRow） ===== */
.flow-row {
  display: flex;
  align-items: center;
  padding: 20rpx 12rpx 20rpx 28rpx;
}

.flow-main {
  flex: 1;
  min-width: 0;
}

.flow-line1 {
  display: flex;
  align-items: baseline;
  gap: 16rpx;
}

.flow-amount {
  font-size: 30rpx;
  font-weight: 700;
  line-height: 1.2;
  color: #16a085;
}

.flow-type {
  font-size: 24rpx;
  color: #8a93a6;
}

.flow-project {
  display: block;
  margin-top: 4rpx;
  font-size: 24rpx;
  line-height: 1.3;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  line-height: 1.3;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56rpx;
  height: 56rpx;
  margin-left: 12rpx;
  border-radius: 50%;
  font-size: 28rpx;
  line-height: 1;
  flex-shrink: 0;
}

.flow-toggle.todo {
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.08);
}

.flow-toggle.done {
  color: #8a93a6;
  background: rgba(138, 147, 166, 0.1);
}

.flow-toggle-hover {
  opacity: 0.7;
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
