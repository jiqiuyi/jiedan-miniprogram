<template>
  <view class="page">
    <template v-if="project">
      <!-- 信息卡（对齐 App build 中首个 Card） -->
      <view class="card">
        <view class="hero-row">
          <view class="hero-left">
            <text class="hero-title">{{ project.title || '未命名项目' }}</text>
            <text class="hero-sub">客户：{{ customerName }}</text>
          </view>
          <view class="status-badge" :style="statusStyle">
            <view class="badge-dot" :style="{ backgroundColor: statusColor }" />
            <text class="badge-text">{{ statusText }}</text>
          </view>
        </view>

        <view class="bar">
          <view class="bar-fill" :style="{ width: `${paidPercent}%` }" />
        </view>

        <view class="amounts">
          <view class="amount-col">
            <text class="amount-label">约定总额</text>
            <text class="amount-value sub">¥{{ formatAmount(project.amount_total) }}</text>
          </view>
          <view class="amount-col">
            <text class="amount-label">已收</text>
            <text class="amount-value accent">¥{{ formatAmount(paidTotal) }}</text>
          </view>
          <view class="amount-col">
            <text class="amount-label">待收</text>
            <text class="amount-value warn">¥{{ formatAmount(remaining) }}</text>
          </view>
        </view>

        <view class="advance-btn" @tap="advanceStatus">
          <text class="advance-text">进入「{{ nextLabel }}」</text>
        </view>
      </view>

      <!-- 里程碑 / 阶段（对齐 App _buildMilestoneBody） -->
      <view class="section-head">
        <text class="section-title">里程碑 / 阶段</text>
        <view class="head-action" @tap="openAddMilestone">
          <text class="head-action-text">＋ 添加阶段</text>
        </view>
      </view>
      <view class="card">
        <view v-if="!milestones.length" class="milestone-empty">
          <text class="milestone-empty-text"
            >尚未添加阶段，点右上角「添加阶段」拆解收款节点</text
          >
        </view>
        <template v-else>
          <view class="bar-row">
            <text class="bar-label">阶段进度</text>
            <text class="bar-value">{{ milestonePercent }}%</text>
          </view>
          <view class="bar mt-12">
            <view class="bar-fill primary" :style="{ width: `${milestonePercent}%` }" />
          </view>
          <text class="milestone-sum"
            >已完成 {{ formatAmount(milestoneDoneAmount) }} 元 / 共
            {{ formatAmount(milestoneTotalAmount) }} 元</text
          >
          <view v-for="ms in milestones" :key="String(ms.id)" class="ms-row">
            <view
              class="ms-check"
              :class="{ 'ms-check-on': isMsDone(ms) }"
              @tap="toggleMilestone(ms)"
            >
              <text v-if="isMsDone(ms)" class="ms-check-mark">✓</text>
            </view>
            <view class="ms-main" @tap="toggleMilestone(ms)">
              <text class="ms-name" :class="{ 'ms-name-done': isMsDone(ms) }">{{ ms.name }}</text>
              <text class="ms-amount">¥{{ formatAmount(ms.amount) }}</text>
            </view>
            <view class="ms-del" @tap="confirmDeleteMilestone(ms)">
              <text class="ms-del-text">删除</text>
            </view>
          </view>
        </template>
      </view>

      <!-- 项目进度 / 交付 -->
      <view class="section-head">
        <text class="section-title">项目进度 / 交付</text>
      </view>
      <view class="card">
        <view class="bar-row">
          <text class="bar-label">进度</text>
          <text class="bar-value">{{ progressValue }}%</text>
        </view>
        <view class="bar mt-12">
          <view class="bar-fill primary" :style="{ width: `${progressValue}%` }" />
        </view>
        <view class="deliver-row">
          <text class="deliver-text" :style="{ color: deliverColor }">{{ deliverText }}</text>
        </view>
        <view class="outline-btn" @tap="openProgressEditor">
          <text class="outline-text">编辑进度 / 交付</text>
        </view>
      </view>

      <!-- 催款提醒（对齐 App _buildReminderBody，本地通知改为到期日标记） -->
      <view class="section-head">
        <text class="section-title">催款提醒</text>
      </view>
      <view class="card">
        <text class="remind-amount">待收金额 ¥{{ formatAmount(remaining) }}</text>
        <text class="remind-text">{{ reminderText }}</text>
        <view class="remind-actions">
          <picker
            mode="date"
            :value="reminderPickValue"
            :start="reminderStart"
            :end="reminderEnd"
            @change="onReminderPick"
          >
            <view class="outline-btn small">
              <text class="outline-text">{{ hasReminder ? '修改到期日' : '设置到期日' }}</text>
            </view>
          </picker>
          <view v-if="hasReminder" class="text-btn" @tap="cancelReminder">
            <text class="text-btn-text">取消提醒</text>
          </view>
        </view>
      </view>

      <!-- 报价关联入口（对齐 App AppBar「报价单」action） -->
      <view class="link-card" @tap="openQuoteEntry">
        <view class="link-main">
          <text class="link-title">报价单</text>
          <text class="link-sub">{{ quoteEntrySub }}</text>
        </view>
        <text class="link-arrow">›</text>
      </view>

      <!-- 收款记录（登记 / 删除） -->
      <view class="section-head">
        <text class="section-title">收款记录</text>
        <view class="head-action" @tap="openAddPayment">
          <text class="head-action-text">＋ 登记收款</text>
        </view>
      </view>
      <view v-if="!payments.length" class="empty card">还没有收款记录</view>
      <view v-else class="pay-list">
        <view v-for="pay in payments" :key="String(pay.id)" class="pay-card card">
          <view class="pay-main">
            <text class="pay-type">¥{{ formatAmount(pay.amount) }}</text>
            <text class="pay-note">{{ paySubtitle(pay) }}</text>
          </view>
          <view class="pay-del" @tap="confirmDeletePayment(pay)">
            <text class="pay-del-text">删除</text>
          </view>
        </view>
      </view>

      <!-- 删除项目 -->
      <view class="danger-ghost" @tap="confirmDelete">
        <text class="danger-ghost-text">删除项目</text>
      </view>
    </template>
    <view v-else-if="!loading" class="empty card">项目不存在或已删除</view>

    <!-- ===== 进度 / 交付 编辑弹层 ===== -->
    <view v-if="editVisible" class="mask" @tap="editVisible = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">项目进度</text>

        <view class="field">
          <text class="field-label">进度（%）</text>
          <slider
            class="slider"
            :value="sliderValue"
            :min="0"
            :max="100"
            :step="1"
            activeColor="#4A5AF0"
            backgroundColor="rgba(74, 90, 240, 0.1)"
            block-size="20"
            @changing="onSliderChanging"
            @change="onSliderChange"
          />
          <input
            v-model="progressText"
            class="input"
            type="number"
            placeholder="0"
            @input="onProgressInput"
          />
        </view>

        <view class="field">
          <view class="field-row">
            <text class="field-label">交付时间</text>
            <view class="field-row-right">
              <picker
                mode="date"
                :value="deliverDateText"
                :start="dateStart"
                :end="dateEnd"
                @change="onDeliverChange"
              >
                <text class="deliver-pick">{{
                  deliverDateText || '未设置'
                }}</text>
              </picker>
              <text v-if="deliverDateText" class="clear-btn" @tap="clearDeliver">×</text>
            </view>
          </view>
          <text class="field-hint">列表会展示进度条；交付时间临近或超期时将标记提醒。</text>
        </view>

        <view class="sheet-actions">
          <view class="sheet-cancel" @tap="editVisible = false">取消</view>
          <view class="sheet-save" @tap="saveProgress">保存</view>
        </view>
      </view>
    </view>

    <!-- ===== 添加阶段 弹层（对齐 App _addMilestone 对话框） ===== -->
    <view v-if="msVisible" class="mask" @tap="msVisible = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">添加阶段</text>

        <view class="field">
          <text class="field-label">阶段名称</text>
          <input v-model="msName" class="input left" placeholder="如：设计稿 / 首款 / 尾款" />
        </view>

        <view class="field">
          <text class="field-label">阶段金额（元）</text>
          <input v-model="msAmount" class="input left" type="digit" placeholder="0" />
        </view>

        <view class="sheet-actions">
          <view class="sheet-cancel" @tap="msVisible = false">取消</view>
          <view class="sheet-save" @tap="saveMilestone">保存</view>
        </view>
      </view>
    </view>

    <!-- ===== 登记收款 弹层（对齐 App showPaymentDialog） ===== -->
    <view v-if="payVisible" class="mask" @tap="payVisible = false">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">登记收款</text>

        <view class="field">
          <text class="field-label">金额（元）*</text>
          <input v-model="payAmountYuan" class="input left" type="digit" placeholder="0" />
          <text v-if="payAmountHint" class="field-hint">{{ payAmountHint }}</text>
        </view>

        <view class="field">
          <text class="field-label">类型</text>
          <picker :range="PAY_TYPE_NAMES" :value="payTypeIdx" @change="onPayTypeChange">
            <view class="picker-box">
              <text class="picker-text">{{ PAY_TYPE_NAMES[payTypeIdx] }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          </picker>
        </view>

        <view v-if="payTypeIdx === 3" class="field">
          <text class="field-label">自定义类型名称 *</text>
          <input
            v-model="payTypeLabel"
            class="input left"
            placeholder="如：首期款 / 二期款 / 质保金"
            @input="payCustomError = false"
          />
          <text v-if="payCustomError" class="field-error">请输入自定义类型名称</text>
        </view>

        <view v-if="projectQuotes.length" class="field">
          <text class="field-label">关联报价</text>
          <picker :range="payQuoteOptions" :value="payQuoteIdx" @change="onPayQuoteChange">
            <view class="picker-box">
              <text class="picker-text">{{ payQuoteOptions[payQuoteIdx] }}</text>
              <text class="picker-arrow">▾</text>
            </view>
          </picker>
        </view>

        <view class="field">
          <text class="field-label">备注</text>
          <input v-model="payNote" class="input left" placeholder="如：首期款到账" />
        </view>

        <view class="sheet-actions">
          <view class="sheet-cancel" @tap="payVisible = false">取消</view>
          <view class="sheet-save" @tap="savePayment">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate, payTypeText, projectStatusText } from '@/utils/format'
import { PRIMARY, ACCENT, WARN, DANGER, TEXT_MAIN, TEXT_SUB } from '@/utils/quote-helper'
import type { Project, Customer, Payment, Milestone, Quote, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const projectId = ref(0)
/** 列表页收款按钮直达标记（进入详情后自动拉起「登记收款」弹层） */
let autoPay = false
const loading = ref(true)
const project = ref<Project | null>(null)

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const statusMeta: Record<number, { text: string; color: string }> = {
  0: { text: '接单', color: PRIMARY },
  1: { text: '制作中', color: ACCENT },
  2: { text: '待收尾款', color: WARN },
  3: { text: '完结', color: TEXT_SUB }
}

const statusColor = computed(() => statusMeta[num(project.value?.status)]?.color || TEXT_SUB)
const statusText = computed(() => projectStatusText(project.value?.status))
const statusStyle = computed(() => {
  const color = statusColor.value
  return { color, backgroundColor: `${color}1F` }
})

const customerName = computed(() => {
  const p = project.value as DataRow | null
  if (!p || !num(p.customer_id)) return '未关联客户'
  const list = data.customers as unknown as Customer[]
  const found = list.find((c) => num((c as DataRow).id) === num(p.customer_id))
  return (found as Customer | undefined)?.name || '未关联客户'
})

const payments = computed(() => data.paymentsOf(projectId.value))
const paidTotal = computed(() => data.paidTotalOf(projectId.value))

/** 里程碑 / 阶段（对齐 App _milestones） */
const milestones = computed(() => data.milestonesOf(projectId.value))
const milestoneTotalAmount = computed(() =>
  milestones.value.reduce((s, m) => s + num(m.amount), 0)
)
const milestoneDoneAmount = computed(() =>
  milestones.value.filter((m) => isMsDone(m)).reduce((s, m) => s + num(m.amount), 0)
)
/** 阶段进度：按金额加权（对齐 App：doneAmount / totalAmount） */
const milestonePercent = computed(() => {
  const total = milestoneTotalAmount.value
  if (total <= 0) return 0
  return Math.round((milestoneDoneAmount.value / total) * 100)
})

function isMsDone(ms: Milestone): boolean {
  return num(ms.done) === 1
}

/** 本项目关联报价单（对齐 App getQuotesByProject 过滤非模板） */
const projectQuotes = computed(() => {
  const list = data.quotes as unknown as Quote[]
  return list.filter(
    (q) => num((q as DataRow).project_id) === projectId.value && num((q as DataRow).is_template) !== 1
  )
})

const quoteEntrySub = computed(() =>
  projectQuotes.value.length
    ? `本项目已有 ${projectQuotes.value.length} 份报价单，点此新建`
    : '本项目还没有报价单，点此新建'
)

/** 报价单入口（对齐 App AppBar「报价单」→ QuotePage(initialProjectId, initialTitle)） */
function openQuoteEntry() {
  const p = project.value
  if (!p) return
  const title = encodeURIComponent(String(p.title ?? ''))
  uni.navigateTo({ url: `/pages/quote/form?project_id=${projectId.value}&title=${title}` })
}

/** 待收 / 到期日（对齐 App _project.dueDate） */
const dueDateMs = computed(() => num((project.value as DataRow | null)?.due_date))
const hasReminder = computed(() => dueDateMs.value > 0)
const reminderText = computed(() =>
  hasReminder.value
    ? `到期日：${formatDate(dueDateMs.value)}（到期当天在项目列表 / 详情页标记提醒）`
    : '设置到期日后，到期当天将在项目列表 / 详情页标记提醒（仅记录到期日，数据仅存本机）'
)
const amountTotal = computed(() => num(project.value?.amount_total))
const remaining = computed(() => Math.max(amountTotal.value - paidTotal.value, 0))
const paidPercent = computed(() => {
  if (amountTotal.value <= 0) return 0
  return Math.min(Math.max((paidTotal.value / amountTotal.value) * 100, 0), 100)
})

const progressValue = computed(() => {
  const v = num(project.value?.progress)
  return Math.min(Math.max(v, 0), 100)
})

const deliverText = computed(() => {
  const ms = num(project.value?.deliver_date)
  if (ms <= 0) return '未设置交付时间'
  const overdue = ms < Date.now()
  const near = !overdue && ms - Date.now() < 3 * 24 * 3600 * 1000
  return `交付时间：${formatDate(ms)}${overdue ? '（已超期）' : near ? '（临近）' : ''}`
})

const deliverColor = computed(() => {
  const ms = num(project.value?.deliver_date)
  const now = Date.now()
  if (ms > 0 && ms < now) return DANGER
  if (ms > 0 && ms - now < 3 * 24 * 3600 * 1000) return WARN
  return TEXT_MAIN
})

/** 状态推进目标（对齐 App _nextLabel / _advanceStatus） */
const nextLabel = computed(() => {
  const s = num(project.value?.status)
  if (s === 0) return '制作中'
  if (s === 1) return '待收尾款'
  if (s === 2) return '完结'
  return '待收尾款（重新开启）'
})

function nextStatus(): number {
  const s = num(project.value?.status)
  if (s === 0) return 1
  if (s === 1) return 2
  if (s === 2) return 3
  return 2
}

function paySubtitle(p: Payment): string {
  const row = p as DataRow
  const type = payTypeText(row.type, row.type_label)
  const note = String(row.note ?? '').trim()
  return `${type} · ${formatDate(num(row.paid_at))}${note ? ` · ${note}` : ''}`
}

// ===== 催款提醒（对齐 App _setReminder / _cancelReminder；小程序无本地通知，仅写回到期日） =====
const reminderPickValue = computed(() => {
  const ms = dueDateMs.value
  if (ms > 0) return formatDate(ms)
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return formatDate(d.getTime())
})
const reminderStart = computed(() => formatDate(Date.now()))
const reminderEnd = computed(() => `${new Date().getFullYear() + 3}-12-31`)

/** 到期时间取所选日期当天 09:00，同时写 due_date 与 remind_at（对齐 App） */
async function onReminderPick(e: { detail: { value: string } }) {
  const p = project.value
  if (!p) return
  const parts = String(e.detail.value ?? '')
    .split('-')
    .map((s) => parseInt(s, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return
  const when = new Date(parts[0], parts[1] - 1, parts[2], 9, 0, 0, 0).getTime()
  const ok = await data.updateProject(
    Number(p.id),
    { due_date: when, remind_at: when },
    { silent: true }
  )
  if (!ok) return
  syncFromStore()
  uni.showToast({ title: `已设置催款提醒：${formatDate(when)} 09:00`, icon: 'none' })
}

async function cancelReminder() {
  const p = project.value
  if (!p) return
  const ok = await data.updateProject(
    Number(p.id),
    { due_date: 0, remind_at: 0 },
    { silent: true }
  )
  if (!ok) return
  syncFromStore()
  uni.showToast({ title: '已取消催款提醒', icon: 'none' })
}

// ===== 里程碑 / 阶段（对齐 App _addMilestone / _toggleMilestone / _deleteMilestone） =====
const msVisible = ref(false)
const msName = ref('')
const msAmount = ref('')

function openAddMilestone() {
  msName.value = ''
  msAmount.value = ''
  msVisible.value = true
}

async function saveMilestone() {
  const name = msName.value.trim()
  if (!name) return
  const amount = Math.round((Number(msAmount.value) || 0) * 100)
  msVisible.value = false
  const ok = await data.createMilestone(
    { project_id: projectId.value, name, amount, done: 0, created_at: Date.now() },
    { silent: true }
  )
  if (!ok) return
  uni.showToast({ title: '已添加阶段', icon: 'none' })
}

async function toggleMilestone(ms: Milestone) {
  await data.toggleMilestone(Number(ms.id))
}

function confirmDeleteMilestone(ms: Milestone) {
  uni.showModal({
    title: '删除阶段',
    content: `确定删除阶段「${ms.name}」吗？\n\n删除后该阶段进度标记将一并清除，不可恢复。`,
    confirmColor: DANGER,
    success: async (res) => {
      if (!res.confirm) return
      await data.removeMilestone(Number(ms.id))
    }
  })
}

// ===== 登记收款（对齐 App showPaymentDialog） =====
const PAY_TYPE_NAMES = ['定金', '尾款', '全额', '自定义']

const payVisible = ref(false)
const payAmountYuan = ref('')
const payTypeIdx = ref(0)
const payTypeLabel = ref('')
const payNote = ref('')
const payQuoteIdx = ref(0)
const payCustomError = ref(false)
const payAmountHint = ref('')

const payQuoteOptions = computed(() => [
  '不关联报价',
  ...projectQuotes.value.map((q) => `${q.title} · ¥${formatAmount(num((q as DataRow).total))}`)
])

function openAddPayment() {
  const total = amountTotal.value
  const paid = paidTotal.value
  const rem = remaining.value
  // 智能默认类型（对齐 App：未约定总额→全额；未收过款→定金；仍有剩余→尾款；已收满→全额）
  if (total <= 0) {
    payTypeIdx.value = 2
    payAmountHint.value = ''
  } else if (paid <= 0) {
    payTypeIdx.value = 0
    payAmountHint.value = rem > 0 ? `可收定金，剩余待收 ¥${formatAmount(rem)}` : ''
  } else if (rem > 0) {
    payTypeIdx.value = 1
    payAmountHint.value = `剩余待收 ¥${formatAmount(rem)}`
  } else {
    payTypeIdx.value = 2
    payAmountHint.value = ''
  }
  // 有剩余时预填剩余金额，一键保存（对齐 App）
  payAmountYuan.value = rem > 0 && total > 0 ? String(rem / 100) : ''
  payTypeLabel.value = ''
  payNote.value = ''
  payQuoteIdx.value = 0
  payCustomError.value = false
  payVisible.value = true
}

function onPayTypeChange(e: { detail: { value: number | string } }) {
  payTypeIdx.value = Number(e.detail.value)
  payCustomError.value = false
}

function onPayQuoteChange(e: { detail: { value: number | string } }) {
  payQuoteIdx.value = Number(e.detail.value)
}

async function savePayment() {
  const yuan = Number(payAmountYuan.value)
  if (!Number.isFinite(yuan) || yuan <= 0) {
    // App 此处为静默关闭弹层，小程序端给出提示避免误以为已保存
    uni.showToast({ title: '请输入大于 0 的收款金额', icon: 'none' })
    return
  }
  if (payTypeIdx.value === 3 && !payTypeLabel.value.trim()) {
    payCustomError.value = true
    return
  }
  const quote = payQuoteIdx.value > 0 ? projectQuotes.value[payQuoteIdx.value - 1] : null
  payVisible.value = false
  const ok = await data.createPayment({
    project_id: projectId.value,
    amount: Math.round(yuan * 100),
    type: payTypeIdx.value,
    type_label: payTypeIdx.value === 3 ? payTypeLabel.value.trim() : '',
    paid_at: Date.now(),
    note: payNote.value.trim(),
    quote_id: quote ? Number(quote.id) : null
  })
  if (!ok) return
  syncFromStore()
}

function confirmDeletePayment(pay: Payment) {
  uni.showModal({
    title: '删除收款记录',
    content: `确定删除这笔 ¥${formatAmount(pay.amount)} 的收款记录吗？\n删除后项目已收金额会相应减少。`,
    confirmColor: DANGER,
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removePayment(Number(pay.id))
      if (!ok) return
      syncFromStore()
    }
  })
}

// ===== 加载 =====
function syncFromStore() {
  const list = data.projects as unknown as Project[]
  project.value = (list.find((r) => num((r as DataRow).id) === projectId.value) as Project) || null
}

async function load() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  syncFromStore()
  loading.value = false
  // 列表页收款图标直达：首屏数据就绪后自动拉起登记收款弹层（仅一次）
  if (autoPay) {
    autoPay = false
    openAddPayment()
  }
}

onLoad((q) => {
  projectId.value = Number(q?.id ?? 0)
  // 列表页收款按钮直达（对齐 App 卡片 trailing 登记收款入口）
  autoPay = q?.pay === '1'
})

onShow(() => {
  load()
})

// ===== 状态推进 =====
async function advanceStatus() {
  const p = project.value
  if (!p) return
  const ok = await data.updateProject(Number(p.id), { status: nextStatus() }, { silent: true })
  if (!ok) return
  syncFromStore()
}

// ===== 进度 / 交付编辑 =====
const editVisible = ref(false)
const progressText = ref('0')
const progressNum = ref(0)
const deliverDateText = ref('')

const sliderValue = computed(() => progressNum.value)

const dateStart = computed(() => `${new Date().getFullYear() - 1}-01-01`)
const dateEnd = computed(() => `${new Date().getFullYear() + 5}-12-31`)

function openProgressEditor() {
  progressNum.value = progressValue.value
  progressText.value = String(progressNum.value)
  const ms = num(project.value?.deliver_date)
  deliverDateText.value = ms > 0 ? formatDate(ms) : ''
  editVisible.value = true
}

function onSliderChanging(e: { detail: { value: number } }) {
  progressNum.value = Math.min(Math.max(Math.round(e.detail.value), 0), 100)
  progressText.value = String(progressNum.value)
}

function onSliderChange(e: { detail: { value: number } }) {
  onSliderChanging(e)
}

function onProgressInput() {
  const raw = String(progressText.value ?? '')
  const n = parseInt(raw, 10)
  progressNum.value = Math.min(Math.max(Number.isFinite(n) ? n : 0, 0), 100)
}

function onDeliverChange(e: { detail: { value: string } }) {
  deliverDateText.value = String(e.detail.value ?? '')
}

function clearDeliver() {
  deliverDateText.value = ''
}

/** 'YYYY-MM-DD' → 当天 00:00 的毫秒时间戳 */
function dateToMs(text: string): number {
  if (!text) return 0
  const parts = text.split('-').map((s) => parseInt(s, 10))
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return 0
  return new Date(parts[0], parts[1] - 1, parts[2]).getTime()
}

async function saveProgress() {
  const p = project.value
  if (!p) return
  const saved = progressNum.value
  editVisible.value = false
  const ok = await data.updateProject(
    Number(p.id),
    { progress: saved, deliver_date: dateToMs(deliverDateText.value) },
    { silent: true }
  )
  if (!ok) return
  syncFromStore()
  uni.showToast({ title: '项目进度已更新', icon: 'none' })
}

// ===== 删除项目（对齐 App _deleteProject 文案） =====
function confirmDelete() {
  const p = project.value
  if (!p) return
  uni.showModal({
    title: '删除项目',
    content: '将删除该项目及其全部收款记录，不可恢复。确定吗？',
    confirmColor: DANGER,
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeProject(projectId.value)
      if (!ok) return
      uni.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 400)
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

/* ---- 信息卡 ---- */
.hero-row {
  display: flex;
  align-items: flex-start;
}

.hero-left {
  flex: 1;
  min-width: 0;
  margin-right: 16rpx;
}

.hero-title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1b2233;
}

.hero-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.status-badge {
  display: flex;
  align-items: center;
  padding: 8rpx 20rpx;
  border-radius: 40rpx;
  flex-shrink: 0;
}

.badge-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 10rpx;
}

.badge-text {
  font-size: 24rpx;
  font-weight: 600;
}

.bar {
  margin-top: 28rpx;
  height: 12rpx;
  border-radius: 6rpx;
  background: rgba(74, 90, 240, 0.1);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  border-radius: 6rpx;
  background: #16a085;
}

.bar-fill.primary {
  background: #4a5af0;
}

.mt-12 {
  margin-top: 12rpx;
}

.amounts {
  margin-top: 24rpx;
  display: flex;
  justify-content: space-around;
}

.amount-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.amount-label {
  font-size: 24rpx;
  color: #8a93a6;
}

.amount-value {
  margin-top: 8rpx;
  font-size: 30rpx;
  font-weight: 700;
}

.amount-value.sub {
  color: #8a93a6;
}

.amount-value.accent {
  color: #16a085;
}

.amount-value.warn {
  color: #e67e22;
}

.advance-btn {
  margin-top: 28rpx;
  height: 76rpx;
  border-radius: 38rpx;
  background: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.advance-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

/* ---- 区块标题 ---- */
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

/* ---- 进度 / 交付 ---- */
.bar-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.bar-label {
  font-size: 26rpx;
  color: #8a93a6;
}

.bar-value {
  font-size: 28rpx;
  font-weight: 700;
  color: #4a5af0;
}

.deliver-row {
  margin-top: 20rpx;
}

.deliver-text {
  font-size: 26rpx;
}

.outline-btn {
  margin-top: 20rpx;
  height: 72rpx;
  border-radius: 36rpx;
  border: 1rpx solid #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.outline-text {
  font-size: 26rpx;
  color: #4a5af0;
}

/* ---- 收款记录 ---- */
.empty {
  color: #9ca3af;
  text-align: center;
  font-size: 28rpx;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

.pay-card {
  display: flex;
  align-items: center;
}

.pay-main {
  flex: 1;
  min-width: 0;
}

.pay-type {
  font-size: 28rpx;
  font-weight: 700;
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

/* ---- 删除项目 ---- */
.danger-ghost {
  margin: 40rpx auto 0;
  padding: 16rpx 56rpx;
  border-radius: 36rpx;
  border: 1rpx solid rgba(231, 76, 60, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.danger-ghost-text {
  font-size: 26rpx;
  color: #e74c3c;
}

/* ---- 弹层 ---- */
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
  border-radius: 28rpx 28rpx 0 0;
  padding: 36rpx 32rpx 48rpx;
}

.sheet-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
  text-align: center;
}

.field {
  margin-top: 28rpx;
}

.field-label {
  font-size: 26rpx;
  color: #8a93a6;
}

.field-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.field-row-right {
  display: flex;
  align-items: center;
}

.field-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.slider {
  margin: 8rpx 0 0;
}

.input {
  height: 76rpx;
  border: 1rpx solid #e5e8f0;
  border-radius: 16rpx;
  text-align: center;
  font-size: 28rpx;
  color: #1b2233;
}

.deliver-pick {
  font-size: 28rpx;
  color: #4a5af0;
  padding: 8rpx 0 8rpx 16rpx;
}

.clear-btn {
  font-size: 34rpx;
  color: #8a93a6;
  padding: 0 8rpx 0 16rpx;
}

.sheet-actions {
  margin-top: 40rpx;
  display: flex;
}

.sheet-cancel {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  border: 1rpx solid #e5e8f0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  color: #5b6478;
  margin-right: 20rpx;
}

.sheet-save {
  flex: 1;
  height: 84rpx;
  border-radius: 42rpx;
  background: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

/* ---- 区块右上角动作 ---- */
.head-action {
  padding: 6rpx 4rpx;
}

.head-action-text {
  font-size: 26rpx;
  color: #4a5af0;
}

/* ---- 里程碑 / 阶段 ---- */
.milestone-empty {
  display: flex;
  align-items: center;
}

.milestone-empty-text {
  font-size: 26rpx;
  color: #8a93a6;
}

.milestone-sum {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.ms-row {
  display: flex;
  align-items: center;
  margin-top: 16rpx;
}

.ms-check {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #d5dae6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ms-check-on {
  background: #4a5af0;
  border-color: #4a5af0;
}

.ms-check-mark {
  font-size: 24rpx;
  color: #fff;
}

.ms-main {
  flex: 1;
  min-width: 0;
  margin-left: 16rpx;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.ms-name {
  font-size: 28rpx;
  color: #1f2430;
}

.ms-name-done {
  color: #8a93a6;
  text-decoration: line-through;
}

.ms-amount {
  font-size: 24rpx;
  color: #8a93a6;
  margin-left: 16rpx;
}

.ms-del {
  padding: 6rpx 8rpx 6rpx 20rpx;
}

.ms-del-text {
  font-size: 24rpx;
  color: #8a93a6;
}

/* ---- 催款提醒 ---- */
.remind-amount {
  display: block;
  font-size: 26rpx;
  color: #e67e22;
}

.remind-text {
  display: block;
  margin-top: 10rpx;
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.5;
}

.remind-actions {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
}

.outline-btn.small {
  height: 68rpx;
  padding: 0 32rpx;
  border-radius: 34rpx;
  margin-top: 0;
}

.text-btn {
  padding: 12rpx 24rpx;
}

.text-btn-text {
  font-size: 26rpx;
  color: #4a5af0;
}

/* ---- 报价单入口 ---- */
.link-card {
  margin-top: 16rpx;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx 28rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.link-main {
  flex: 1;
  min-width: 0;
}

.link-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.link-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.link-arrow {
  font-size: 34rpx;
  color: #c4cad8;
}

/* ---- 收款记录删除 ---- */
.pay-del {
  padding: 6rpx 0 6rpx 20rpx;
}

.pay-del-text {
  font-size: 24rpx;
  color: #8a93a6;
}

/* ---- 弹层表单补充 ---- */
.input.left {
  text-align: left;
  padding: 0 20rpx;
  box-sizing: border-box;
}

.field-error {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #e74c3c;
}

.picker-box {
  margin-top: 8rpx;
  height: 76rpx;
  border: 1rpx solid #e5e8f0;
  border-radius: 16rpx;
  padding: 0 20rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  font-size: 28rpx;
  color: #1b2233;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-arrow {
  font-size: 24rpx;
  color: #8a93a6;
  margin-left: 12rpx;
}
</style>
