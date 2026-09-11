<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">🎁</text>
      <text class="empty-text">登录后查看我的邀请码与推广进度</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <view v-else-if="loading" class="card empty-card">
      <text class="empty-text">加载中…</text>
    </view>

    <view v-else-if="!me" class="card empty-card">
      <text class="empty-text">加载失败，请检查网络后重试</text>
      <view class="primary-btn" @tap="reload">重新加载</view>
    </view>

    <template v-else>
      <!-- 我的邀请码卡片 -->
      <view class="invite-code-card">
        <text class="code-label">我的邀请码</text>
        <view class="code-row">
          <text class="code-value">{{ me.inviteCode }}</text>
          <view class="copy-btn" hover-class="action-hover" @tap="copyCode">复制</view>
        </view>
        <text class="code-tip">把邀请码发给朋友，朋友注册时填入即可自动完成邀请，无需手动登记。</text>
      </view>

      <!-- 进度卡片 -->
      <view class="card stat-card">
        <view class="stat-row">
          <view class="stat">
            <text class="stat-num">{{ me.invitees.length }}</text>
            <text class="stat-label">已推荐（人）</text>
          </view>
          <view class="stat">
            <text class="stat-num">{{ paidCount }}</text>
            <text class="stat-label">已付款（人）</text>
          </view>
          <view class="stat">
            <text class="stat-num">{{ formatYuan(rebateTotal) }}</text>
            <text class="stat-label">累计返现（元）</text>
          </view>
        </view>
        <view class="progress-head">
          <text class="progress-text">推荐 {{ me.invitees.length }}/{{ NEED }} 位有效好友，即可免费获得 VIP 1 个月{{ bonusText }}</text>
        </view>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: progressPct + '%' }"></view>
        </view>
      </view>

      <!-- 返现提现（服务端返现：与钱包余额 / 本地提现严格分开，不得混用） -->
      <view class="card payout-card">
        <view class="payout-head">
          <text class="payout-title">返现提现</text>
          <text class="payout-sub">返现按订单申请，绑定收款账户后提交，后台转账后标记已打款</text>
        </view>

        <view class="payout-stats">
          <view class="payout-stat">
            <text class="payout-num done">¥{{ formatYuan(rebatePaid) }}</text>
            <text class="payout-label">已打款</text>
          </view>
          <view class="payout-stat">
            <text class="payout-num pending">¥{{ formatYuan(rebatePending) }}</text>
            <text class="payout-label">待打款</text>
          </view>
          <view class="payout-stat">
            <text class="payout-num">¥{{ formatYuan(rebateTotal) }}</text>
            <text class="payout-label">累计返现</text>
          </view>
        </view>

        <view class="account-box" hover-class="action-hover" @tap="openAccountForm">
          <view class="account-main">
            <text class="account-title">我的收款账户</text>
            <text class="account-sub">{{ accountSummary }}</text>
          </view>
          <text class="account-action">{{ hasAccount ? '修改' : '去设置' }}</text>
        </view>

        <view v-if="applyAtText" class="applied-tip">
          <text>已申请、等待打款 · {{ applyAtText }}</text>
        </view>

        <view
          class="apply-btn"
          :class="canApply ? 'apply-active' : 'apply-disabled'"
          :hover-class="canApply ? 'btn-hover' : 'none'"
          @tap="onApply"
        >
          <text>{{ applying ? '提交中…' : '申请打款' }}</text>
        </view>
        <text class="apply-tip">
          待打款为 0 时无需申请；提交后该笔返现金额冻结，打款完成自动更新为「已打款」。
        </text>
      </view>

      <!-- 好友列表 -->
      <view class="section-head">
        <text class="section-title">邀请的好友</text>
      </view>
      <view v-if="!me.invitees.length" class="card empty-card small">
        <text class="empty-text">还没有好友通过你的邀请码注册\n把邀请码发给朋友，注册后自动出现在这里</text>
      </view>
      <view v-else class="row-list">
        <view v-for="e in me.invitees" :key="String(e.id)" class="row-card">
          <view class="avatar">{{ avatarOf(e) }}</view>
          <view class="row-main">
            <text class="row-title">{{ nameOf(e) }}</text>
            <text class="row-sub">{{ maskPhone(e.phone) }} · {{ dateText(e.paidAt || 0) }}</text>
          </view>
          <view v-if="e.paid" class="paid-tag">
            <text class="paid-main">已付款 ¥{{ formatYuan(e.payAmount) }}</text>
            <text class="paid-sub">返现 ¥{{ formatYuan(rebateOf(e)) }}</text>
            <text class="paid-state" :class="e.payoutAt ? 'state-done' : 'state-wait'">
              {{ e.payoutAt ? '已打款' : '待打款' }}
            </text>
          </view>
          <text v-else class="wait-text">待付款</text>
        </view>
      </view>

      <view class="rules card">
        <text class="rules-title">活动规则</text>
        <text class="rules-text">
          1. 好友注册时填写你的邀请码，系统自动绑定邀请关系；
          2. 好友付款开通专业版后，你获得其付款金额 50% 的返现；
          3. 每 2 位有效好友可免费获赠 VIP 1 个月（进度见上方）；
          4. 返现与 VIP 赠送由服务器统一记录，换机 / 重装后依然保留。
        </text>
      </view>
    </template>

    <!-- 收款账户设置弹层（仅服务端返现使用，与本地钱包提现账户无关） -->
    <view v-if="showForm" class="mask" @tap="closeForm">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">返现收款账户</text>
        <text class="sheet-tip">返现打款将转入该账户。此处仅用于服务端返现，与「钱包余额提现」互不影响。</text>

        <view class="method-row">
          <view
            class="method"
            :class="form.method === 'wechat' ? 'method-on' : ''"
            @tap="form.method = 'wechat'"
          >
            微信
          </view>
          <view
            class="method"
            :class="form.method === 'alipay' ? 'method-on' : ''"
            @tap="form.method = 'alipay'"
          >
            支付宝
          </view>
        </view>

        <view class="form-field">
          <text class="form-label">收款人</text>
          <input
            class="form-input"
            :maxlength="20"
            v-model="form.name"
            placeholder="真实姓名"
            placeholder-class="ph"
          />
        </view>
        <view class="form-field">
          <text class="form-label">收款账号</text>
          <input
            class="form-input"
            :maxlength="40"
            v-model="form.account"
            placeholder="微信 / 支付宝账号"
            placeholder-class="ph"
          />
        </view>

        <view class="qr-row">
          <view class="qr-item" @tap="pickQr('wechat')">
            <image v-if="form.wechatQrcode" class="qr-img" :src="form.wechatQrcode" mode="aspectFit" />
            <view v-else class="qr-empty">
              <text class="qr-plus">＋</text>
              <text class="qr-text">选择微信收款码</text>
            </view>
            <text class="qr-label">{{ form.wechatQrcode ? '微信收款码（点击更换）' : '微信收款码' }}</text>
          </view>
          <view class="qr-item" @tap="pickQr('alipay')">
            <image v-if="form.alipayQrcode" class="qr-img" :src="form.alipayQrcode" mode="aspectFit" />
            <view v-else class="qr-empty">
              <text class="qr-plus">＋</text>
              <text class="qr-text">选择支付宝收款码</text>
            </view>
            <text class="qr-label">{{ form.alipayQrcode ? '支付宝收款码（点击更换）' : '支付宝收款码' }}</text>
          </view>
        </view>
        <text class="qr-hint">收款码单张压缩后不超过 200KB；不更换时保留已上传的图片。</text>

        <view class="sheet-btns">
          <view class="sheet-btn ghost" hover-class="action-hover" @tap="closeForm">取消</view>
          <view
            class="sheet-btn primary"
            :class="saving ? 'btn-disabled' : ''"
            hover-class="action-hover"
            @tap="saveAccount"
          >
            {{ saving ? '保存中…' : '保存' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatYuan, maskPhone } from '@/utils/format'
import { applyPayout, savePayoutAccount, type MeInvitee } from '@/api/user'
import { pickQrcodeDataUrl } from '@/utils/qrcode-image'

const NEED = 2 // 满 2 位有效好友赠 1 个月 VIP

const user = useUserStore()
const loading = ref(false)
const applying = ref(false)
const saving = ref(false)
const showForm = ref(false)

// 收款账户表单（仅服务端返现使用，与本地钱包提现账户互不影响）
const form = reactive({
  method: 'wechat' as 'wechat' | 'alipay',
  name: '',
  account: '',
  wechatQrcode: '',
  alipayQrcode: ''
})

const me = computed(() => user.me)

const paidCount = computed(() => {
  return me.value ? me.value.invitees.filter((e) => e.paid).length : 0
})

const rebateTotal = computed(() => Number(me.value?.rebateTotal || 0))
const rebatePaid = computed(() => Number(me.value?.rebatePaid || 0))
const rebatePending = computed(() => Number(me.value?.rebatePending || 0))
const applyAtText = computed(() => (me.value?.payoutApplyAt ? dateTimeText(me.value.payoutApplyAt) : ''))

const hasAccount = computed(() => {
  const p = me.value?.payout
  return !!(p && p.method && p.name && p.account)
})

const accountSummary = computed(() => {
  const p = me.value?.payout
  if (!p || !p.method) return '未设置（申请打款前请先绑定）'
  const way = p.method === 'alipay' ? '支付宝' : '微信'
  const qrs = [p.hasWechatQrcode ? '微信码' : '', p.hasAlipayQrcode ? '支付宝码' : '']
    .filter(Boolean)
    .join('、')
  return `${way} · ${p.name || ''} · ${maskAccount(p.account || '')}${qrs ? ' · 已传 ' + qrs : ' · 未传收款码'}`
})

const canApply = computed(() => rebatePending.value > 0 && !applying.value)

const bonusText = computed(() => {
  if (me.value && me.value.vipRewardGranted) return '（已领取）'
  return ''
})

const progressPct = computed(() => {
  const n = me.value ? me.value.invitees.length : 0
  return Math.min(100, Math.round((n / NEED) * 100))
})

function maskAccount(a: string): string {
  const s = (a || '').trim()
  if (!s) return ''
  if (s.length <= 4) return '****'
  return `${s.slice(0, 2)}****${s.slice(-2)}`
}

function dateText(ts: number): string {
  if (!ts) return '刚刚注册'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateTimeText(ts: number): string {
  if (!ts) return ''
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function nameOf(e: MeInvitee): string {
  return (e.nickname || '').trim() || `好友${e.id}`
}

function avatarOf(e: MeInvitee): string {
  return (nameOf(e) || '友').charAt(0)
}

/** 该笔返现：优先直读后端 rebate，服务端缺失时按 50% 本地兜底（单位：元） */
function rebateOf(e: MeInvitee): number {
  const server = Number(e.rebate)
  if (!isNaN(server) && server > 0) return server
  return Math.round((Number(e.payAmount) || 0) * 0.5 * 100) / 100
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function reload() {
  loading.value = true
  try {
    await user.fetchMeData()
  } finally {
    loading.value = false
  }
}

onShow(() => {
  if (user.isLoggedIn) reload()
})

function copyCode() {
  if (!me.value) return
  uni.setClipboardData({
    data: me.value.inviteCode,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'none' })
    }
  })
}

function openAccountForm() {
  const p = me.value?.payout
  form.method = p?.method === 'alipay' ? 'alipay' : 'wechat'
  form.name = p?.name || ''
  form.account = p?.account || ''
  form.wechatQrcode = ''
  form.alipayQrcode = ''
  showForm.value = true
}

function closeForm() {
  showForm.value = false
}

/** 选择并压缩收款码（≤200KB 的 base64），保存时才上传 */
async function pickQr(kind: 'wechat' | 'alipay') {
  try {
    const dataUrl = await pickQrcodeDataUrl()
    if (kind === 'wechat') form.wechatQrcode = dataUrl
    else form.alipayQrcode = dataUrl
    uni.showToast({ title: '图片已就绪，保存后生效', icon: 'none' })
  } catch (e) {
    const msg = e instanceof Error ? e.message : ''
    if (msg && msg !== 'cancel') {
      uni.showToast({ title: msg, icon: 'none' })
    }
  }
}

async function saveAccount() {
  if (saving.value) return
  const name = form.name.trim()
  const account = form.account.trim()
  if (!name) {
    uni.showToast({ title: '请填写收款人姓名', icon: 'none' })
    return
  }
  if (!account) {
    uni.showToast({ title: '请填写收款账号', icon: 'none' })
    return
  }
  saving.value = true
  const res = await savePayoutAccount({
    method: form.method,
    name,
    account,
    wechatQrcode: form.wechatQrcode,
    alipayQrcode: form.alipayQrcode
  })
  saving.value = false
  if (!res.ok) {
    uni.showToast({ title: res.error || '保存失败', icon: 'none' })
    return
  }
  showForm.value = false
  uni.showToast({ title: '收款账户已保存', icon: 'success' })
  await reload()
}

/** 申请打款：按订单冻结待打款返现、附账户快照，重复申请幂等 */
async function onApply() {
  if (applying.value) return
  if (rebatePending.value <= 0) {
    uni.showToast({ title: '当前没有可申请的返现', icon: 'none' })
    return
  }
  if (!hasAccount.value) {
    uni.showToast({ title: '请先设置收款账户', icon: 'none' })
    openAccountForm()
    return
  }
  applying.value = true
  const res = await applyPayout()
  applying.value = false
  if (!res.ok) {
    uni.showToast({ title: res.error || '申请失败', icon: 'none' })
    return
  }
  const count = Number(res.data?.applyCount || 0)
  const amount = Number(res.data?.applyAmount || 0)
  uni.showToast({
    title: count > 0 ? `已提交 ${count} 笔 ¥${formatYuan(amount)}` : '没有新增可申请返现',
    icon: 'none'
  })
  await reload()
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

.invite-code-card {
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  background: linear-gradient(135deg, #ff9f43 0%, #ff7a5c 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-label {
  font-size: 26rpx;
  opacity: 0.92;
}

.code-row {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  gap: 18rpx;
}

.code-value {
  font-size: 60rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
}

.copy-btn {
  font-size: 22rpx;
  color: #ff9f43;
  background: #fff;
  padding: 8rpx 24rpx;
  border-radius: 26rpx;
  font-weight: 600;
}

.action-hover {
  opacity: 0.85;
}

.code-tip {
  margin-top: 22rpx;
  font-size: 22rpx;
  text-align: center;
  opacity: 0.9;
  line-height: 1.6;
}

.stat-card {
  margin-top: 20rpx;
}

.stat-row {
  display: flex;
}

.stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 38rpx;
  font-weight: 700;
  color: #1f2430;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.progress-head {
  margin-top: 28rpx;
}

.progress-text {
  font-size: 24rpx;
  color: #4c5566;
}

.progress-track {
  margin-top: 14rpx;
  height: 14rpx;
  border-radius: 8rpx;
  background: #f0e6fb;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 8rpx;
  background: linear-gradient(90deg, #ff9f43, #ff7a5c);
}

.section-head {
  margin: 30rpx 8rpx 14rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 24rpx;
}

.empty-card.small {
  padding: 44rpx 24rpx;
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

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #f2f4fa;
  color: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  margin-right: 18rpx;
  flex-shrink: 0;
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
}

.paid-tag {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.paid-main {
  font-size: 24rpx;
  color: #2e9e5b;
  font-weight: 600;
}

.paid-sub {
  margin-top: 4rpx;
  font-size: 20rpx;
  color: #ff7a5c;
}

.wait-text {
  font-size: 24rpx;
  color: #b6bcc9;
}

.rules {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
}

.rules-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 14rpx;
}

.rules-text {
  font-size: 24rpx;
  line-height: 1.9;
  color: #4c5566;
  white-space: pre-line;
}

/* ===== 返现提现（服务端返现，与本地钱包提现严格分开） ===== */
.payout-card {
  margin-top: 20rpx;
}

.payout-head {
  display: flex;
  flex-direction: column;
}

.payout-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.payout-sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.payout-stats {
  margin-top: 22rpx;
  display: flex;
}

.payout-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.payout-num {
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
}

.payout-num.done {
  color: #2e9e5b;
}

.payout-num.pending {
  color: #ff7a5c;
}

.payout-label {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.account-box {
  margin-top: 22rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #f7f8fc;
  display: flex;
  align-items: center;
}

.account-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.account-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.account-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.account-action {
  margin-left: 12rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #4a5af0;
}

.applied-tip {
  margin-top: 18rpx;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  background: #fff7e8;
  color: #b06a00;
  font-size: 22rpx;
}

.apply-btn {
  margin-top: 24rpx;
  height: 84rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #fff;
}

.apply-active {
  background: linear-gradient(135deg, #ff9f43 0%, #ff7a5c 100%);
}

.apply-disabled {
  background: #d8dce6;
}

.btn-hover {
  opacity: 0.88;
}

.apply-tip {
  display: block;
  margin-top: 14rpx;
  font-size: 21rpx;
  color: #9ca3af;
  line-height: 1.6;
}

.paid-state {
  margin-top: 6rpx;
  padding: 2rpx 12rpx;
  border-radius: 20rpx;
  font-size: 20rpx;
}

.state-done {
  color: #2e9e5b;
  background: #eaf7ef;
}

.state-wait {
  color: #d9822b;
  background: #fff6e8;
}

/* ===== 收款账户弹层 ===== */
.mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(17, 20, 28, 0.45);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.sheet {
  width: 100%;
  max-height: 86vh;
  overflow-y: auto;
  box-sizing: border-box;
  padding: 32rpx 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  background: #fff;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.sheet-tip {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.method-row {
  margin-top: 26rpx;
  display: flex;
  gap: 18rpx;
}

.method {
  flex: 1;
  padding: 18rpx 0;
  border-radius: 16rpx;
  background: #f4f6fb;
  color: #4c5566;
  font-size: 28rpx;
  text-align: center;
}

.method-on {
  background: #eef0ff;
  color: #4a5af0;
  font-weight: 600;
}

.form-field {
  margin-top: 24rpx;
  display: flex;
  align-items: center;
}

.form-label {
  width: 150rpx;
  font-size: 26rpx;
  color: #4c5566;
}

.form-input {
  flex: 1;
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 14rpx;
  background: #f7f8fc;
  font-size: 26rpx;
  color: #1f2430;
}

.qr-row {
  margin-top: 24rpx;
  display: flex;
  gap: 20rpx;
}

.qr-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qr-img {
  width: 100%;
  height: 220rpx;
  border-radius: 14rpx;
  background: #f7f8fc;
}

.qr-empty {
  width: 100%;
  height: 220rpx;
  border: 2rpx dashed #d8dce6;
  border-radius: 14rpx;
  background: #f7f8fc;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.qr-plus {
  font-size: 46rpx;
  line-height: 1;
  color: #b6bcc9;
}

.qr-text {
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #9ca3af;
}

.qr-label {
  margin-top: 10rpx;
  font-size: 21rpx;
  color: #4c5566;
  text-align: center;
}

.qr-hint {
  display: block;
  margin-top: 16rpx;
  font-size: 21rpx;
  color: #9ca3af;
  line-height: 1.6;
}

.sheet-btns {
  margin-top: 32rpx;
  display: flex;
  gap: 20rpx;
}

.sheet-btn {
  flex: 1;
  height: 84rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.sheet-btn.ghost {
  background: #f4f6fb;
  color: #4c5566;
}

.sheet-btn.primary {
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
}

.sheet-btn.primary.btn-disabled {
  opacity: 0.6;
}
</style>
