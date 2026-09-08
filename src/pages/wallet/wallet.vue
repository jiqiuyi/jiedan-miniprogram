<template>
  <view class="page">
    <!-- 未登录引导 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">👛</text>
      <text class="empty-text">登录后查看钱包余额与往来记录</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 余额渐变卡 -->
      <view class="balance-card">
        <text class="balance-label">可用余额（元）</text>
        <text class="balance-value">¥{{ formatAmount(balance) }}</text>
        <view class="stat-row">
          <view class="stat">
            <text class="stat-num">{{ formatAmount(totalPaid) }}</text>
            <text class="stat-label">收款合计</text>
          </view>
          <view class="stat">
            <text class="stat-num">{{ formatAmount(totalRecharged) }}</text>
            <text class="stat-label">累计充值</text>
          </view>
          <view class="stat">
            <text class="stat-num">{{ formatAmount(totalWithdrawn) }}</text>
            <text class="stat-label">已提现</text>
          </view>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="action-row">
        <view class="action-btn recharge" hover-class="action-hover" @tap="openRecharge">充值</view>
        <view class="action-btn plain" hover-class="action-hover" @tap="openWithdraw">申请提现</view>
      </view>

      <!-- 提现账户 -->
      <view class="card account-card" @tap="openWithdraw">
        <view class="icon-circle">🏦</view>
        <view class="account-main">
          <text class="account-title">{{ accountTitle }}</text>
          <text v-if="account" class="account-sub">{{ accountMethodLabel }} · {{ maskAccountNo(account.no) }}</text>
          <text v-else class="account-sub">设置提现收款账户（微信 / 支付宝 / 银行卡）</text>
        </view>
        <text class="arrow">›</text>
      </view>

      <view class="notice">提现申请提交后由人工核对打款，到账后状态更新为「已提现」；接入官方收款通道后自动到账。</view>

      <!-- 往来记录 -->
      <view class="section-head">
        <text class="section-title">充值记录</text>
        <text class="section-tip">出示收款码付款后点「确认到账」</text>
      </view>
      <view v-if="!recharges.length" class="card empty-card small">
        <text class="empty-text">暂无充值记录</text>
      </view>
      <view v-else class="row-list">
        <view v-for="(r, i) in recharges" :key="String(r.id)" class="row-card">
          <view class="row-date">
            <text class="row-day">{{ dayText(r.createdAt) }}</text>
            <text class="row-mon">{{ timeText(r.createdAt) }}</text>
          </view>
          <view class="row-main">
            <text class="row-title">充值 · {{ methodLabel(r.method) }}</text>
            <text class="row-sub">{{ r.note || '收款码转账' }}</text>
          </view>
          <view class="row-right">
            <text class="row-amount plus">+¥{{ formatAmount(r.amount) }}</text>
            <view v-if="r.status === 'pending'" class="mini-btn" @tap="confirmArrive(r.id)">确认到账</view>
            <text v-else class="done-text">已到账</text>
          </view>
        </view>
      </view>

      <view class="section-head">
        <text class="section-title">提现记录</text>
      </view>
      <view v-if="!withdrawals.length" class="card empty-card small">
        <text class="empty-text">暂无提现记录</text>
      </view>
      <view v-else class="row-list">
        <view v-for="(w, i) in withdrawals" :key="String(w.id)" class="row-card">
          <view class="row-date">
            <text class="row-day">{{ dayText(w.createdAt) }}</text>
            <text class="row-mon">{{ timeText(w.createdAt) }}</text>
          </view>
          <view class="row-main">
            <text class="row-title">提现 · {{ methodLabel(w.method) }}</text>
            <text class="row-sub">{{ w.accountName }}（{{ w.accountNo }}）</text>
          </view>
          <view class="row-right">
            <text class="row-amount minus">-¥{{ formatAmount(w.amount) }}</text>
            <view v-if="w.status === 'pending'" class="mini-btn" @tap="markDone(w.id)">已到账</view>
            <text v-else class="done-text">{{ withdrawStatusText(w.status) }}</text>
          </view>
        </view>
      </view>

      <!-- 充值底部弹层 -->
      <view v-if="showRecharge" class="sheet-mask" @tap="showRecharge = false">
        <view class="sheet" @tap.stop>
          <view class="sheet-title">余额充值</view>
          <picker class="picker-row" mode="selector" :range="rechargeLabels" @change="onRechargeMethodChange">
            <view class="picker-cell">
              <text class="picker-label">充值方式</text>
              <text class="picker-value">{{ rechargeLabels[rechargeMethodIdx] }}</text>
            </view>
          </picker>
          <view class="field-row">
            <text class="field-label">充值金额</text>
            <view class="field-input-wrap">
              <text class="field-prefix">¥</text>
              <input class="field-input" type="digit" v-model="rechargeAmount" placeholder="请输入金额" placeholder-class="ph" />
            </view>
          </view>
          <view class="quick-row">
            <view v-for="q in quickAmounts" :key="q" class="quick-chip" :class="{ active: rechargeAmount === q }" @tap="rechargeAmount = q">{{ q }}</view>
          </view>
          <text class="sheet-notice">付款后请回到「充值记录」点击「确认到账」完成入账。</text>
          <view class="sheet-btn primary" hover-class="action-hover" :class="{ disabled: busy }" @tap="confirmRecharge">出示收款码并登记</view>
        </view>
      </view>

      <!-- 提现底部弹层 -->
      <view v-if="showWithdraw" class="sheet-mask" @tap="showWithdraw = false">
        <view class="sheet" @tap.stop>
          <view class="sheet-title">申请提现</view>
          <picker class="picker-row" mode="selector" :range="withdrawLabels" @change="onWithdrawMethodChange">
            <view class="picker-cell">
              <text class="picker-label">收款方式</text>
              <text class="picker-value">{{ withdrawLabels[withdrawMethodIdx] }}</text>
            </view>
          </picker>
          <view class="field-row">
            <text class="field-label">收款人</text>
            <input class="field-input plain" v-model="draft.name" placeholder="请输入收款人姓名" placeholder-class="ph" />
          </view>
          <view class="field-row">
            <text class="field-label">账号</text>
            <input class="field-input plain" v-model="draft.no" :placeholder="withdrawNoHint" placeholder-class="ph" />
          </view>
          <view class="field-row">
            <text class="field-label">提现金额</text>
            <view class="field-input-wrap">
              <text class="field-prefix">¥</text>
              <input class="field-input" type="digit" v-model="withdrawAmount" placeholder="请输入金额" placeholder-class="ph" />
            </view>
          </view>
          <text class="sheet-notice">余额不足时不可提现；提交后由人工核对打款。</text>
          <view class="sheet-btn primary" hover-class="action-hover" :class="{ disabled: busy }" @tap="confirmWithdraw">提交提现申请</view>
        </view>
      </view>

      <!-- 出示收款码弹层 -->
      <view v-if="showCodes" class="sheet-mask" @tap="showCodes = false">
        <view class="sheet codes-sheet" @tap.stop>
          <view class="sheet-title">向付款方出示收款码</view>
          <view v-if="codeImages.length" class="code-imgs">
            <view v-for="c in codeImages" :key="c.kind" class="code-item">
              <image class="code-img" :src="c.path" mode="aspectFit" @tap="preview(c.path)" />
              <text class="code-name">{{ c.label }}收款码</text>
            </view>
          </view>
          <text class="sheet-notice">付款完成后，回到「充值记录」点击该笔记录右侧「确认到账」，余额即可入账。</text>
          <view class="sheet-btn ghost" hover-class="action-hover" @tap="showCodes = false">知道了</view>
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
import { formatAmount, formatDate, maskPhone } from '@/utils/format'
import {
  addRecharge,
  addWithdrawal,
  getPayCodePath,
  hasAnyPayCode,
  loadAccount,
  loadRecharges,
  loadWithdrawals,
  markRechargeDone,
  markWithdrawDone,
  methodLabel,
  RECHARGE_METHODS,
  saveAccount,
  withdrawStatusText,
  WITHDRAW_METHODS,
  yuanToFen,
  type PayCodeKind,
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

const balance = ref(0)
const totalPaid = ref(0)
const totalRecharged = ref(0)
const totalWithdrawn = ref(0)
const recharges = ref<RechargeRec[]>([])
const withdrawals = ref<WithdrawRec[]>([])
const account = ref<WithdrawAccount | null>(null)
const busy = ref(false)

const quickAmounts = ['10', '50', '100', '500']

// ---------- 弹层状态 ----------
const showRecharge = ref(false)
const showWithdraw = ref(false)
const showCodes = ref(false)
const rechargeMethodIdx = ref(0)
const rechargeAmount = ref('')
const withdrawMethodIdx = ref(0)
const withdrawAmount = ref('')
const draft = reactive({ name: '', no: '' })

const rechargeLabels = RECHARGE_METHODS.map((m) => m.label)
const withdrawLabels = WITHDRAW_METHODS.map((m) => m.label)
const withdrawNoHint = computed(() => WITHDRAW_METHODS[withdrawMethodIdx.value].noHint)

const accountMethodLabel = computed(() => {
  if (!account.value) return ''
  const found = WITHDRAW_METHODS.find((m) => m.key === account.value?.method)
  return found ? found.label : ''
})

const accountTitle = computed(() => (account.value ? '提现账户' : '设置提现账户'))

function maskAccountNo(no: string): string {
  if (no.length <= 4) return no
  return `****${no.slice(-4)}`
}

const codeImages = computed(() => {
  const arr: { kind: string; label: string; path: string }[] = []
  const wx = getPayCodePath('wechat')
  const ali = getPayCodePath('alipay')
  if (wx) arr.push({ kind: 'wechat', label: '微信', path: wx })
  if (ali) arr.push({ kind: 'alipay', label: '支付宝', path: ali })
  return arr
})

function dayText(ts: number): string {
  const d = new Date(ts)
  return String(d.getDate()).padStart(2, '0')
}

function timeText(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
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
  rechargeMethodIdx.value = 0
  rechargeAmount.value = ''
  showRecharge.value = true
}

function onRechargeMethodChange(e: { detail: { value: number | string } }) {
  rechargeMethodIdx.value = Number(e.detail.value) || 0
}

function confirmRecharge() {
  if (busy.value) return
  const fen = yuanToFen(rechargeAmount.value)
  if (fen <= 0) {
    uni.showToast({ title: '请输入正确的充值金额', icon: 'none' })
    return
  }
  const method = RECHARGE_METHODS[rechargeMethodIdx.value]?.key ?? 'wechat'
  busy.value = true
  try {
    addRecharge({ amount: fen, method })
    showRecharge.value = false
    refreshLedger()
    showCodes.value = true
  } finally {
    busy.value = false
  }
}

function confirmArrive(id: number) {
  uni.showModal({
    title: '确认到账',
    content: '请确认已收到该笔充值款项，确认后余额将立即入账。',
    confirmText: '确认到账',
    cancelText: '再看看',
    success: (res) => {
      if (!res.confirm) return
      markRechargeDone(id)
      refreshLedger()
      uni.showToast({ title: '充值已到账', icon: 'success' })
    }
  })
}

// ---------- 提现 ----------
function openWithdraw() {
  if (busy.value) return
  const acc = account.value
  withdrawAmount.value = ''
  if (acc) {
    const idx = WITHDRAW_METHODS.findIndex((m) => m.key === acc.method)
    withdrawMethodIdx.value = idx >= 0 ? idx : 0
    draft.name = acc.name
    draft.no = acc.no
  } else {
    withdrawMethodIdx.value = 0
    draft.name = ''
    draft.no = ''
  }
  showWithdraw.value = true
}

function onWithdrawMethodChange(e: { detail: { value: number | string } }) {
  withdrawMethodIdx.value = Number(e.detail.value) || 0
}

function confirmWithdraw() {
  if (busy.value) return
  const fen = yuanToFen(withdrawAmount.value)
  if (fen <= 0) {
    uni.showToast({ title: '请输入正确的提现金额', icon: 'none' })
    return
  }
  if (fen > balance.value) {
    uni.showToast({ title: '提现金额超过可用余额', icon: 'none' })
    return
  }
  const name = draft.name.trim()
  const no = draft.no.trim()
  if (!name || !no) {
    uni.showToast({ title: '请填写完整的收款人姓名与账号', icon: 'none' })
    return
  }
  const method = WITHDRAW_METHODS[withdrawMethodIdx.value]?.key as WithdrawMethodKey
  busy.value = true
  try {
    addWithdrawal({ amount: fen, method, accountName: name, accountNo: no })
    saveAccount({ method, name, no })
    showWithdraw.value = false
    refreshLedger()
    uni.showToast({ title: '提现申请已提交，等待人工打款', icon: 'none' })
  } finally {
    busy.value = false
  }
}

function markDone(id: number) {
  markWithdrawDone(id)
  refreshLedger()
  uni.showToast({ title: '已更新为已提现', icon: 'none' })
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
  padding: 36rpx 32rpx 30rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
}

.balance-label {
  font-size: 24rpx;
  opacity: 0.85;
}

.balance-value {
  margin-top: 10rpx;
  font-size: 64rpx;
  font-weight: 700;
  line-height: 1.15;
}

.stat-row {
  margin-top: 32rpx;
  display: flex;
  border-top: 1rpx solid rgba(255, 255, 255, 0.22);
  padding-top: 26rpx;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 30rpx;
  font-weight: 600;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  opacity: 0.8;
}

.action-row {
  display: flex;
  gap: 20rpx;
  margin-top: 22rpx;
}

.action-btn {
  flex: 1;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 18rpx;
  font-size: 28rpx;
  font-weight: 600;
}

.action-btn.recharge {
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
}

.action-btn.plain {
  background: #fff;
  color: #1f2430;
  border: 1rpx solid #e5e8f0;
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
  font-size: 22rpx;
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
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.6;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 30rpx 8rpx 14rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.section-tip {
  font-size: 20rpx;
  color: #b6bcc9;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 24rpx;
}

.empty-card.small {
  padding: 36rpx 24rpx;
}

.empty-icon {
  font-size: 72rpx;
}

.empty-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
  white-space: pre-line;
}

.primary-btn {
  margin-top: 26rpx;
  padding: 16rpx 64rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
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

.row-date {
  width: 84rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 18rpx;
}

.row-day {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
}

.row-mon {
  font-size: 20rpx;
  color: #b6bcc9;
}

.row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.row-title {
  font-size: 28rpx;
  color: #1f2430;
}

.row-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8a93a6;
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

.row-amount {
  font-size: 28rpx;
  font-weight: 600;
}

.row-amount.plus {
  color: #2e9e5b;
}

.row-amount.minus {
  color: #e07856;
}

.mini-btn {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #4a5af0;
  padding: 6rpx 18rpx;
  border: 1rpx solid rgba(74, 90, 240, 0.45);
  border-radius: 24rpx;
}

.done-text {
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #9ca3af;
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
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 24rpx;
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
  width: 150rpx;
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

.sheet-notice {
  display: block;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.6;
  margin-bottom: 22rpx;
}

.sheet-btn {
  text-align: center;
  padding: 24rpx 0;
  border-radius: 18rpx;
  font-size: 30rpx;
  font-weight: 600;
}

.sheet-btn.primary {
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
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

.code-imgs {
  display: flex;
  gap: 24rpx;
  justify-content: center;
  margin-bottom: 18rpx;
}

.code-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-img {
  width: 260rpx;
  height: 260rpx;
  border-radius: 16rpx;
  background: #f5f6fa;
  border: 1rpx solid #eef0f5;
}

.code-name {
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #4c5566;
}
</style>
