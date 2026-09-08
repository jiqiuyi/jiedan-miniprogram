<template>
  <view class="page">
    <!-- 汇总卡 -->
    <view class="card summary-card">
      <text class="summary-title">汇总</text>
      <view class="sum-row">
        <view class="sum-item">
          <text class="sum-label">约定总额</text>
          <text class="sum-value">¥{{ formatAmount(totalAgreed) }}</text>
        </view>
        <view class="sum-item">
          <text class="sum-label">累计已收</text>
          <text class="sum-value" style="color: #16a085">¥{{ formatAmount(totalPaid) }}</text>
        </view>
        <view class="sum-item">
          <text class="sum-label">待收总额</text>
          <text class="sum-value" style="color: #e67e22">¥{{ formatAmount(totalPending) }}</text>
        </view>
      </view>
      <text class="sum-foot">共 {{ projectRows.length }} 个项目，已结清 {{ clearedCount }} 个</text>
    </view>

    <!-- 项目维度对账行 -->
    <view v-if="!projectRows.length" class="empty card">
      <text class="empty-text">还没有项目收款数据</text>
    </view>
    <view v-else class="card list-card">
      <view v-for="(r, i) in projectRows" :key="String(r.id)" class="proj-row">
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
            <text class="proj-value" style="color: #16a085">¥{{ formatAmount(r.paid) }}</text>
          </view>
          <view class="proj-item">
            <text class="proj-label">待收</text>
            <text class="proj-value" style="color: #e67e22">¥{{ formatAmount(r.pending) }}</text>
          </view>
        </view>
        <view class="prog-track">
          <view class="prog-fill" :style="{ width: r.ratio * 100 + '%' }"></view>
        </view>
        <text class="prog-text">收款进度 {{ Math.round(r.ratio * 100) }}%</text>
      </view>
    </view>

    <!-- 收款流水 -->
    <view class="flow-head">
      <text class="flow-title">收款流水</text>
      <text class="flow-count">{{ flowSub }}</text>
    </view>
    <view class="chip-bar">
      <view
        v-for="f in flowFilters"
        :key="f.value"
        class="chip"
        :class="{ active: flowFilter === f.value }"
        @tap="flowFilter = f.value"
      >
        {{ f.label }}
      </view>
    </view>
    <view v-if="!flowRows.length" class="empty card">
      <text class="empty-text">暂无收款流水，登记收款后在此对账</text>
    </view>
    <view v-else class="card list-card">
      <view v-for="(f, i) in flowRows" :key="String(f.id)" class="flow-row">
        <view class="flow-main">
          <view class="flow-line1">
            <text class="flow-amount" style="color: #4a5af0">+¥{{ formatAmount(f.amount) }}</text>
            <text class="flow-type">{{ f.typeText }}</text>
          </view>
          <text class="flow-sub">{{ f.subLine }}</text>
        </view>
        <view class="flow-side" @tap="toggleFlow(f)">
          <text class="flow-tag" :class="f.reconciled === 1 ? 'done' : 'todo'">
            {{ f.reconciled === 1 ? '已对账' : '未对账' }}
          </text>
          <text class="flow-action">{{ f.reconciled === 1 ? '取消标记' : '标记已对账' }}</text>
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

function paidOf(pid: number): number {
  let sum = 0
  for (const pay of data.payments) {
    const row = pay as Row
    if (num(row['project_id']) === pid) sum += num(row['amount'])
  }
  return Math.max(0, sum)
}

const projectRows = computed<ProjRow[]>(() => {
  const arr: ProjRow[] = []
  for (const p of data.projects) {
    const row = p as Row
    const id = num(row['id'])
    const agreed = Math.max(0, num(row['amount_total']))
    const paid = paidOf(id)
    // 待收：仅待收尾款阶段有应收余款（对齐 App pending_collections 语义）
    let pending = 0
    if (num(row['status']) === 2 && agreed > paid) pending = agreed - paid
    const ratio = agreed <= 0 ? 0 : Math.min(1, paid / agreed)
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

const FLOW_FILTERS = [
  { label: '全部', value: 0 },
  { label: '未对账', value: 1 },
  { label: '已对账', value: 2 }
]
const flowFilters = FLOW_FILTERS
const flowFilter = ref(0)

interface FlowRow {
  id: number
  amount: number
  typeText: string
  reconciled: number
  subLine: string
  raw: Row
}

const flowAll = computed<FlowRow[]>(() => {
  const projectMap = projectById.value
  const quoteMap = quoteById.value
  const arr = data.payments
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
      const parts = [
        t > 0 ? formatDate(t) : '-',
        quote ? `报价·${str((quote as Row)['title'])}` : '',
        str(row['note'])
      ].filter(Boolean)
      return {
        id: num(row['id']),
        amount: Math.max(0, num(row['amount'])),
        typeText: payTypeText(row['type'], row['type_label']),
        reconciled: num(row['reconciled']),
        subLine: `${project} · ${parts.join(' · ')}`,
        raw: row
      }
    })
  return arr
})

const flowRows = computed(() => {
  if (flowFilter.value === 1) return flowAll.value.filter((f) => f.reconciled !== 1)
  if (flowFilter.value === 2) return flowAll.value.filter((f) => f.reconciled === 1)
  return flowAll.value
})

const flowSub = computed(() => {
  const unRec = flowAll.value.filter((f) => f.reconciled !== 1).length
  if (flowFilter.value === 0) return `共 ${flowAll.value.length} 笔，其中未对账 ${unRec} 笔`
  if (flowFilter.value === 1) return `未对账 ${flowRows.value.length} 笔`
  return `已对账 ${flowRows.value.length} 笔`
})

async function toggleFlow(f: FlowRow) {
  const cur = f.reconciled === 1
  const ok = await data.updatePayment(f.id, { reconciled: cur ? 0 : 1 } as Row)
  uni.showToast({ title: ok ? (cur ? '已取消对账标记' : '已标记为已对账') : '操作失败，请稍后重试', icon: 'none' })
}

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

.card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.summary-card {
  padding: 28rpx;
}

.summary-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.sum-row {
  margin-top: 20rpx;
  display: flex;
  gap: 16rpx;
}

.sum-item {
  flex: 1;
  min-width: 0;
}

.sum-label {
  display: block;
  font-size: 20rpx;
  color: #8a93a6;
}

.sum-value {
  display: block;
  margin-top: 6rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.sum-foot {
  display: block;
  margin-top: 18rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.list-card {
  margin-top: 20rpx;
  overflow: hidden;
}

.proj-row {
  padding: 26rpx 28rpx;
}

.proj-row + .proj-row {
  border-top: 1rpx solid #f0f1f5;
}

.proj-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.proj-title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 600;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
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
  font-size: 22rpx;
  color: #8a93a6;
}

.proj-items {
  margin-top: 18rpx;
  display: flex;
  gap: 16rpx;
}

.proj-item {
  flex: 1;
  min-width: 0;
}

.proj-label {
  display: block;
  font-size: 20rpx;
  color: #8a93a6;
}

.proj-value {
  display: block;
  margin-top: 4rpx;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.prog-track {
  margin-top: 18rpx;
  height: 10rpx;
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
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8a93a6;
}

.empty {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 30rpx;
}

.empty-text {
  font-size: 26rpx;
  color: #9ca3af;
}

.flow-head {
  margin: 36rpx 4rpx 16rpx;
  display: flex;
  align-items: baseline;
  gap: 14rpx;
}

.flow-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  flex-shrink: 0;
}

.flow-count {
  flex: 1;
  font-size: 22rpx;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chip-bar {
  display: flex;
  gap: 14rpx;
}

.chip {
  padding: 12rpx 30rpx;
  font-size: 24rpx;
  color: #3a4150;
  background: #fff;
  border-radius: 32rpx;
  box-shadow: 0 2rpx 10rpx rgba(31, 36, 48, 0.04);
}

.chip.active {
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.12);
  font-weight: 600;
}

.flow-row {
  display: flex;
  align-items: center;
  padding: 24rpx 26rpx;
}

.flow-row + .flow-row {
  border-top: 1rpx solid #f0f1f5;
}

.flow-main {
  flex: 1;
  min-width: 0;
}

.flow-line1 {
  display: flex;
  align-items: baseline;
  gap: 12rpx;
}

.flow-amount {
  font-size: 30rpx;
  font-weight: 700;
}

.flow-type {
  font-size: 22rpx;
  color: #8a93a6;
}

.flow-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.flow-side {
  margin-left: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  flex-shrink: 0;
}

.flow-tag {
  font-size: 20rpx;
  font-weight: 600;
  padding: 6rpx 14rpx;
  border-radius: 16rpx;
}

.flow-tag.done {
  color: #16a085;
  background: rgba(22, 160, 133, 0.12);
}

.flow-tag.todo {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.12);
}

.flow-action {
  margin-top: 8rpx;
  font-size: 18rpx;
  color: #8a93a6;
}
</style>
