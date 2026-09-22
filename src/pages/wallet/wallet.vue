<template>
  <view class="page">
    <!-- 未登录引导 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">👛</text>
      <text class="empty-text">登录后查看钱包余额与往来记录</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 余额卡 -->
      <view class="balance-card">
        <text class="balance-label">可提现余额</text>
        <text class="balance-value">¥{{ formatAmount(balance) }}</text>
        <view class="stat-row">
          <view class="stat">
            <text class="stat-line">累计收款</text>
            <text class="stat-line">¥{{ formatAmount(totalPaid) }}</text>
          </view>
          <view class="stat">
            <text class="stat-line">累计充值</text>
            <text class="stat-line">¥{{ formatAmount(totalRecharged) }}</text>
          </view>
          <view class="stat">
            <text class="stat-line">已提现</text>
            <text class="stat-line">¥{{ formatAmount(totalWithdrawn) }}</text>
          </view>
        </view>
      </view>

      <!-- 操作区：充值入口按 App 产品策略隐藏（openRecharge 实现保留，后续可恢复） -->
      <view class="action-row">
        <view
          v-if="SHOW_RECHARGE_ENTRY"
          class="action-btn recharge"
          hover-class="action-hover"
          @tap="openRecharge"
        >
          充值
        </view>
        <view
          class="action-btn primary-fill"
          :class="{ disabled: busy || balance <= 0 }"
          hover-class="action-hover"
          @tap="openWithdraw"
        >
          申请提现
        </view>
      </view>

      <!-- 提现账户 -->
      <view class="card account-card" @tap="openAccountSheet">
        <view class="icon-circle">🏦</view>
        <view class="account-main">
          <text class="account-title">提现账户</text>
          <text class="account-sub">{{ accountSub }}</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="notice">{{ WITHDRAW_NOTICE }}</view>

      <!-- 充值记录 -->
      <view class="section-head">
        <text class="section-title">充值记录</text>
      </view>
      <view v-if="!recharges.length" class="card empty-card small">
        <text class="empty-text">还没有充值记录</text>
      </view>
      <view v-else class="row-list">
        <view v-for="r in recharges" :key="String(r.id)" class="row-card">
          <view class="row-badge badge-accent">
            <text class="badge-txt accent">{{ methodLabel(r.method).charAt(0) }}</text>
          </view>
          <view class="row-main">
            <text class="row-amount plus">+¥{{ formatAmount(r.amount) }}</text>
            <text class="row-sub">{{ methodLabel(r.method) }} · {{ r.note }}</text>
            <text class="row-sub">{{ formatDateTime(r.createdAt) }}</text>
          </view>
          <view class="row-right">
            <text class="chip" :class="rechargeChipClass(r.status)">{{ rechargeStatusText(r.status) }}</text>
            <view
              v-if="r.status !== 'done'"
              class="mini-btn"
              hover-class="action-hover"
              @tap="markRecharge(r.id)"
            >
              标记到账
            </view>
          </view>
        </view>
      </view>

      <!-- 提现记录 -->
      <view class="section-head">
        <text class="section-title">提现记录</text>
      </view>
      <view v-if="!withdrawals.length" class="card empty-card small">
        <text class="empty-text">还没有提现记录</text>
        <text class="empty-text">收款到账后可在这里申请提现</text>
      </view>
      <view v-else class="row-list">
        <view v-for="w in withdrawals" :key="String(w.id)" class="row-card">
          <view class="row-badge badge-primary">
            <text class="badge-txt primary">{{ methodLabel(w.method).charAt(0) }}</text>
          </view>
          <view class="row-main">
            <text class="row-amount">-¥{{ formatAmount(w.amount) }}</text>
            <text class="row-sub">{{ methodLabel(w.method) }} · {{ w.accountName }} {{ w.accountNo }}</text>
            <text class="row-sub">{{ formatDateTime(w.createdAt) }}</text>
          </view>
          <view class="row-right">
            <text class="chip" :class="withdrawChipClass(w.status)">{{ withdrawStatusText(w.status) }}</text>
            <view
              v-if="w.status !== 'done'"
              class="mini-btn"
              hover-class="action-hover"
              @tap="markWithdraw(w.id)"
            >
              标记到账
            </view>
          </view>
        </view>
      </view>

      <!-- 充值弹层（金额 + 方式 + 下一步） -->
      <view v-if="showRecharge" class="sheet-mask" @tap="showRecharge = false">
        <view class="sheet" @tap.stop>
          <view class="sheet-title">余额充值</view>
          <view class="field-row">
            <text class="field-label">充值金额（元）</text>
            <view class="field-input-wrap">
              <text class="field-prefix">¥</text>
              <input
                class="field-input"
                type="digit"
                v-model="rechargeAmount"
                placeholder="如 100"
                placeholder-class="ph"
              />
            </view>
          </view>
          <view class="quick-row">
            <view
              v-for="q in QUICK_AMOUNTS"
              :key="q"
              class="quick-chip"
              :class="{ active: rechargeAmount === q }"
              @tap="rechargeAmount = q"
            >
              ¥{{ q }}
            </view>
          </view>
          <picker class="picker-row" mode="selector" :range="rechargeLabels" :value="rechargeMethodIdx" @change="onRechargeMethodChange">
            <view class="picker-cell">
              <text class="picker-label">充值方式</text>
              <text class="picker-value">{{ rechargeLabels[rechargeMethodIdx] }}</text>
            </view>
          </picker>
          <view class="sheet-actions">
            <view class="sheet-btn ghost" hover-class="action-hover" @tap="showRecharge = false">取消</view>
            <view class="sheet-btn primary" hover-class="action-hover" @tap="nextRecharge">下一步</view>
          </view>
        </view>
      </view>

      <!-- 出示收款码弹层 -->
      <view v-if="showCodes" class="sheet-mask" @tap="closeCodes">
        <view class="sheet codes-sheet" @tap.stop>
          <view class="sheet-title">出示收款码</view>
          <text class="sheet-sub">请客户扫码付款</text>
          <view v-if="codeTabs.length > 1" class="seg-row">
            <view
              v-for="t in codeTabs"
              :key="t.key"
              class="seg-chip"
              :class="{ active: codeTab === t.key }"
              @tap="codeTab = t.key"
            >
              {{ t.label }}
            </view>
          </view>
          <image
            v-if="currentCode"
            class="code-img"
            :src="currentCode"
            mode="aspectFit"
            @tap="preview(currentCode)"
          />
          <text v-else class="code-empty">该收款码尚未配置</text>
          <view class="tip-box">
            <text class="tip-txt">客户付款到账后，请返回点击「登记收款」完成入账。</text>
          </view>
          <view class="sheet-btn primary" hover-class="action-hover" @tap="closeCodes">关闭</view>
        </view>
      </view>

      <!-- 确认到账弹层 -->
      <view v-if="showArrive" class="sheet-mask" @tap="confirmArrive(false)">
        <view class="sheet" @tap.stop>
          <view class="sheet-title">确认到账</view>
          <text class="arrive-text">
            请确认 ¥{{ formatAmount(pendingRecharge.amount) }} 已通过{{ methodLabel(pendingRecharge.method) }}支付成功。
          </text>
          <text class="arrive-text">
            选「已到账」立即入账；选「未到账」可稍后在充值记录里标记到账。
          </text>
          <view class="sheet-actions">
            <view class="sheet-btn ghost" hover-class="action-hover" @tap="confirmArrive(false)">未到账</view>
            <view class="sheet-btn primary" hover-class="action-hover" @tap="confirmArrive(true)">已到账</view>
          </view>
        </view>
      </view>

      <!-- 提现账户编辑弹层 -->
      <view v-if="showAccountSheet" class="sheet-mask" @tap="showAccountSheet = false">
        <view class="sheet" @tap.stop>
          <view class="sheet-title left">提现账户</view>
          <picker class="picker-row" mode="selector" :range="withdrawLabels" :value="accMethodIdx" @change="onAccMethodChange">
            <view class="picker-cell">
              <text class="picker-label">提现方式</text>
              <text class="picker-value">{{ withdrawLabels[accMethodIdx] }}</text>
            </view>
          </picker>
          <view class="field-row">
            <input
              class="field-input plain"
              v-model="accDraft.no"
              :placeholder="accNoHint"
              placeholder-class="ph"
            />
          </view>
          <view class="field-row">
            <input
              class="field-input plain"
              v-model="accDraft.name"
              placeholder="收款人姓名"
              placeholder-class="ph"
            />
          </view>
          <view class="sheet-btn primary" hover-class="action-hover" @tap="saveAccountSheet">保存</view>
        </view>
      </view>

      <!-- 提现弹层（金额 + 提现至账户） -->
      <view v-if="showWithdraw" class="sheet-mask" @tap="showWithdraw = false">
        <view class="sheet" @tap.stop>
          <view class="sheet-title">申请提现</view>
          <view class="field-row">
            <text class="field-label">提现金额（元） *</text>
            <view class="field-input-wrap">
              <input
                class="field-input"
                type="digit"
                v-model="withdrawAmount"
                :placeholder="`可提现 ¥${formatAmount(balance)}`"
                placeholder-class="ph"
              />
            </view>
          </view>
          <view class="tip-box">
            <text class="tip-txt">提现至【{{ accountMethodLabel }}】{{ account?.name }} {{ account?.no }}</text>
          </view>
          <view class="sheet-actions">
            <view class="sheet-btn ghost" hover-class="action-hover" @tap="showWithdraw = false">取消</view>
            <view class="sheet-btn primary" :class="{ disabled: busy }" hover-class="action-hover" @tap="submitWithdraw">提交</view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount, formatDateTime } from '@/utils/format'
import {
  addRecharge,
  addWithdrawal,
  getPayCodePath,
  hasAnyPayCode,
  isAccountFilled,
  loadAccount,
  loadRecharges,
  loadWithdrawals,
  markRechargeDone,
  markWithdrawDone,
  methodLabel,
  rechargeStatusText,
  RECHARGE_METHODS,
  saveAccount,
  withdrawStatusText,
  WITHDRAW_METHODS,
  WITHDRAW_NOTICE,
  yuanToFen,
  type PayCodeKind,
  type RechargeMethodKey,
  type RechargeRec,
  type WithdrawAccount,
  type WithdrawRec,
  type WithdrawMethodKey
} from '@/utils/localWallet'

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const user = useUserStore()
const data = useDataStore()

/** 充值入口开关：App 当前产品策略隐藏充值按钮（流程保留，后续可恢复） */
const SHOW_RECHARGE_ENTRY = false

const QUICK_AMOUNTS = ['10', '50', '100', '500']

const balance = ref(0)
const totalPaid = ref(0)
const totalRecharged = ref(0)
const totalWithdrawn = ref(0)
const recharges = ref<RechargeRec[]>([])
const withdrawals = ref<WithdrawRec[]>([])
const account = ref<WithdrawAccount | null>(null)
const busy = ref(false)

// ---------- 弹层状态 ----------
const showRecharge = ref(false)
const showCodes = ref(false)
const showArrive = ref(false)
const showAccountSheet = ref(false)
const showWithdraw = ref(false)

const rechargeAmount = ref('')
const rechargeMethodIdx = ref(0)
const codeTab = ref<PayCodeKind>('wechat')
const pendingRecharge = reactive<{ amount: number; method: RechargeMethodKey }>({
  amount: 0,
  method: 'wechat'
})
const accMethodIdx = ref(0)
const accDraft = reactive({ name: '', no: '' })
const withdrawAmount = ref('')

const rechargeLabels = RECHARGE_METHODS.map((m) => m.label)
const withdrawLabels = WITHDRAW_METHODS.map((m) => m.label)
const accNoHint = computed(() => WITHDRAW_METHODS[accMethodIdx.value]?.noHint ?? '')

const accountMethodLabel = computed(() => {
  const acc = account.value
  return acc ? methodLabel(acc.method) : ''
})

const accountSub = computed(() => {
  const acc = account.value
  if (!isAccountFilled(acc)) return '未设置，点击配置收款账户'
  return `${methodLabel(acc!.method)} · ${acc!.name} ${acc!.no}`
})

const codeTabs = computed(() => {
  const arr: { key: PayCodeKind; label: string }[] = []
  if (getPayCodePath('wechat')) arr.push({ key: 'wechat', label: '微信' })
  if (getPayCodePath('alipay')) arr.push({ key: 'alipay', label: '支付宝' })
  return arr
})

const currentCode = computed(() => {
  const first = codeTabs.value[0]
  return getPayCodePath(codeTab.value) || (first ? getPayCodePath(first.key) : '')
})

function rechargeChipClass(s: RechargeRec['status']): string {
  return s === 'done' ? 'chip-accent' : 'chip-warn'
}

function withdrawChipClass(s: WithdrawRec['status']): string {
  if (s === 'done') return 'chip-accent'
  if (s === 'processing') return 'chip-primary'
  return 'chip-warn'
}

function recompute() {
  totalPaid.value = data.payments.reduce((s, p) => s + num((p as Row)['amount']), 0)
  totalRecharged.value = recharges.value
    .filter((r) => r.status === 'done')
    .reduce((s, r) => s + r.amount, 0)
  totalWithdrawn.value = withdrawals.value.reduce((s, w) => s + w.amount, 0)
  balance.value = Math.max(0, totalPaid.value + totalRecharged.value - totalWithdrawn.value)
}

function refreshLedger() {
  recharges.value = loadRecharges()
  withdrawals.value = loadWithdrawals()
  account.value = loadAccount()
  recompute()
}

onShow(() => {
  if (!user.isLoggedIn) return
  data.refresh()
  refreshLedger()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function preview(path: string) {
  uni.previewImage({ urls: [path], current: path })
}

// ---------- 充值 ----------
function openRecharge() {
  if (busy.value) return
  // 预检：未配置收款码先引导去设置
  if (!hasAnyPayCode()) {
    uni.showModal({
      title: '尚未配置收款码',
      content: '充值需向您的微信 / 支付宝收款码付款，请先到「我的 → 收款设置」上传收款码。',
      confirmText: '去设置',
      cancelText: '暂不',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/wallet/paycodes' })
      }
    })
    return
  }
  rechargeAmount.value = ''
  rechargeMethodIdx.value = 0
  showRecharge.value = true
}

function onRechargeMethodChange(e: { detail: { value: number | string } }) {
  rechargeMethodIdx.value = Number(e.detail.value) || 0
}

function nextRecharge() {
  const fen = yuanToFen(rechargeAmount.value)
  if (fen <= 0) {
    uni.showToast({ title: '请输入正确的充值金额', icon: 'none' })
    return
  }
  pendingRecharge.amount = fen
  pendingRecharge.method = RECHARGE_METHODS[rechargeMethodIdx.value]?.key ?? 'wechat'
  showRecharge.value = false
  // 出示收款码供扫码付款
  codeTab.value = codeTabs.value[0]?.key ?? 'wechat'
  showCodes.value = true
}

function closeCodes() {
  showCodes.value = false
  showArrive.value = true
}

function confirmArrive(arrived: boolean) {
  if (busy.value) return
  busy.value = true
  try {
    addRecharge({
      amount: pendingRecharge.amount,
      method: pendingRecharge.method,
      status: arrived ? 'done' : 'pending',
      note: arrived ? '手动确认到账' : '待确认'
    })
    showArrive.value = false
    refreshLedger()
    uni.showToast({
      title: arrived
        ? `充值成功，¥${formatAmount(pendingRecharge.amount)} 已入账`
        : '已登记充值申请，到账后请在记录里标记到账',
      icon: 'none'
    })
  } finally {
    busy.value = false
  }
}

/** 充值记录：标记到账（人工确认） */
function markRecharge(id: number) {
  markRechargeDone(id)
  refreshLedger()
}

// ---------- 提现 ----------
function openWithdraw() {
  if (busy.value || balance.value <= 0) return
  if (!isAccountFilled(account.value)) {
    uni.showToast({ title: '请先设置提现账户', icon: 'none' })
    openAccountSheet()
    return
  }
  withdrawAmount.value = ''
  showWithdraw.value = true
}

function submitWithdraw() {
  if (busy.value) return
  const fen = yuanToFen(withdrawAmount.value)
  if (fen <= 0) {
    uni.showToast({ title: '请输入正确的提现金额', icon: 'none' })
    return
  }
  if (fen > balance.value) {
    uni.showToast({ title: '提现金额不能超过可提现余额', icon: 'none' })
    return
  }
  const acc = account.value
  if (!isAccountFilled(acc)) {
    uni.showToast({ title: '请先设置提现账户', icon: 'none' })
    return
  }
  const method: WithdrawMethodKey = acc!.method
  busy.value = true
  try {
    const note = '提现申请已提交，待人工核对打款'
    addWithdrawal({
      amount: fen,
      method,
      accountName: acc!.name,
      accountNo: acc!.no,
      note
    })
    showWithdraw.value = false
    refreshLedger()
    uni.showToast({ title: note, icon: 'none' })
  } finally {
    busy.value = false
  }
}

/** 提现记录：标记到账 / 已提现（人工打款完成后） */
function markWithdraw(id: number) {
  markWithdrawDone(id)
  refreshLedger()
}

// ---------- 提现账户 ----------
function openAccountSheet() {
  const acc = account.value
  const idx = acc ? WITHDRAW_METHODS.findIndex((m) => m.key === acc.method) : 0
  accMethodIdx.value = idx >= 0 ? idx : 0
  accDraft.name = acc?.name ?? ''
  accDraft.no = acc?.no ?? ''
  showAccountSheet.value = true
}

function onAccMethodChange(e: { detail: { value: number | string } }) {
  accMethodIdx.value = Number(e.detail.value) || 0
}

function saveAccountSheet() {
  const name = accDraft.name.trim()
  const no = accDraft.no.trim()
  if (!name || !no) {
    uni.showToast({ title: '请填写完整的收款人姓名与账号', icon: 'none' })
    return
  }
  const method: WithdrawMethodKey = WITHDRAW_METHODS[accMethodIdx.value]?.key ?? 'wechat'
  saveAccount({ method, name, no })
  showAccountSheet.value = false
  refreshLedger()
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

.balance-card {
  border-radius: 24rpx;
  padding: 40rpx 32rpx 32rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.balance-label {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.85);
}

.balance-value {
  margin-top: 16rpx;
  font-size: 68rpx;
  font-weight: 700;
  line-height: 1.15;
}

.stat-row {
  margin-top: 28rpx;
  display: flex;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.stat-line {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.5;
}

.action-row {
  display: flex;
  gap: 20rpx;
  margin: 24rpx 8rpx 8rpx;
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.action-btn.recharge {
  background: #eef0fe;
  color: #4a5af0;
}

.action-btn.primary-fill {
  background: #4a5af0;
  color: #fff;
}

.action-btn.disabled {
  opacity: 0.45;
}

.action-hover {
  opacity: 0.85;
}

.account-card {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
  padding: 24rpx;
}

.icon-circle {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  background: #f2f4fa;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  flex-shrink: 0;
}

.account-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.account-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.account-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arrow {
  color: #c4c9d4;
  font-size: 40rpx;
  margin-left: 12rpx;
}

.notice {
  margin-top: 18rpx;
  padding: 0 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.5;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 32rpx 8rpx 16rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1b2233;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 24rpx;
}

.empty-card.small {
  padding: 40rpx 24rpx;
}

.empty-icon {
  font-size: 72rpx;
}

.empty-text {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
  white-space: pre-line;
}

.primary-btn {
  margin-top: 26rpx;
  padding: 16rpx 64rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  color: #fff;
  border-radius: 44rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.row-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 22rpx 24rpx;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.row-badge {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  margin-right: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.row-badge.badge-accent {
  background: rgba(22, 160, 133, 0.1);
}

.row-badge.badge-primary {
  background: rgba(74, 90, 240, 0.1);
}

.badge-txt {
  font-size: 30rpx;
  font-weight: 700;
}

.badge-txt.accent {
  color: #16a085;
}

.badge-txt.primary {
  color: #4a5af0;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-amount {
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
}

.row-amount.plus {
  color: #16a085;
}

.row-sub {
  margin-top: 4rpx;
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.5;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: 12rpx;
}

.chip {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.chip.chip-warn {
  color: #e67e22;
  background: rgba(230, 126, 34, 0.12);
}

.chip.chip-accent {
  color: #16a085;
  background: rgba(22, 160, 133, 0.12);
}

.chip.chip-primary {
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.12);
}

.mini-btn {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #4a5af0;
  padding: 6rpx 18rpx;
  border: 1rpx solid rgba(74, 90, 240, 0.45);
  border-radius: 24rpx;
}

.sheet-mask {
  position: fixed;
  inset: 0;
  background: rgba(20, 24, 38, 0.45);
  z-index: 90;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 32rpx calc(36rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.sheet-title {
  text-align: center;
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
  margin-bottom: 24rpx;
}

.sheet-title.left {
  text-align: left;
}

.sheet-sub {
  display: block;
  text-align: center;
  margin-top: -14rpx;
  margin-bottom: 20rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.picker-row {
  background: #f5f6fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
}

.picker-cell {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
}

.picker-label {
  font-size: 26rpx;
  color: #1f2430;
}

.picker-value {
  font-size: 26rpx;
  color: #4a5af0;
}

.field-row {
  display: flex;
  align-items: center;
  background: #f5f6fa;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 18rpx;
  min-height: 92rpx;
}

.field-label {
  font-size: 26rpx;
  color: #1f2430;
  margin-right: 16rpx;
  flex-shrink: 0;
}

.field-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
}

.field-prefix {
  font-size: 30rpx;
  color: #1f2430;
  margin-right: 8rpx;
}

.field-input {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.field-input.plain {
  height: 88rpx;
  line-height: 88rpx;
}

.ph {
  color: #b6bcc9;
}

.quick-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 18rpx;
}

.quick-chip {
  flex: 1;
  text-align: center;
  padding: 14rpx 0;
  border-radius: 14rpx;
  background: #f5f6fa;
  font-size: 26rpx;
  color: #4c5566;
}

.quick-chip.active {
  background: #edefff;
  color: #4a5af0;
  font-weight: 600;
}

.seg-row {
  display: flex;
  gap: 16rpx;
  justify-content: center;
  margin-bottom: 20rpx;
}

.seg-chip {
  padding: 12rpx 36rpx;
  border-radius: 40rpx;
  background: #f5f6fa;
  font-size: 26rpx;
  color: #4c5566;
}

.seg-chip.active {
  background: #edefff;
  color: #4a5af0;
  font-weight: 600;
}

.code-img {
  width: 480rpx;
  height: 480rpx;
  margin: 0 auto 20rpx;
  border-radius: 20rpx;
  background: #f5f6fa;
  display: block;
}

.code-empty {
  display: block;
  text-align: center;
  padding: 60rpx 0;
  font-size: 26rpx;
  color: #8a93a6;
}

.tip-box {
  background: rgba(22, 160, 133, 0.08);
  border-radius: 20rpx;
  padding: 20rpx 24rpx;
  margin-bottom: 22rpx;
}

.tip-txt {
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.arrive-text {
  display: block;
  font-size: 26rpx;
  color: #1b2233;
  line-height: 1.6;
  margin-bottom: 12rpx;
}

.sheet-actions {
  display: flex;
  gap: 20rpx;
}

.sheet-btn {
  flex: 1;
  text-align: center;
  padding: 24rpx 0;
  border-radius: 20rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.sheet-btn.primary {
  background: #4a5af0;
  color: #fff;
}

.sheet-btn.ghost {
  background: #f2f4fa;
  color: #4c5566;
}

.sheet-btn.disabled {
  opacity: 0.6;
}

.codes-sheet {
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
}
</style>
