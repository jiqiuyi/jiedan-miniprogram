<template>
  <view class="page">
    <!-- 未登录态（对齐 App _NotLoggedIn：图标 + 标题 + 副标题 + 去登录） -->
    <view v-if="!user.isLoggedIn" class="not-login">
      <text class="not-login-icon">🎁</text>
      <text class="not-login-title">登录后参与推广活动</text>
      <text class="not-login-sub">推荐好友得 VIP，返现 50%</text>
      <view class="primary-pill" hover-class="action-hover" @tap="goLogin">去登录</view>
    </view>

    <view v-else-if="loading" class="card center-card">
      <text class="center-text">加载中…</text>
    </view>

    <view v-else-if="!me" class="card center-card">
      <text class="center-text">加载失败，请检查网络后重试</text>
      <view class="primary-pill" hover-class="action-hover" @tap="reload">重新加载</view>
    </view>

    <template v-else>
      <!-- 我的邀请码（对齐 App 邀请码卡：白底 / 主色大字 / 复制按钮 / 说明） -->
      <view class="card code-card">
        <text class="code-label">我的邀请码</text>
        <view class="code-row">
          <text class="code-value">{{ inviteCode }}</text>
          <view class="code-copy" hover-class="action-hover" @tap="copyCode">复制</view>
        </view>
        <text class="code-tip">把邀请码发给朋友，朋友注册时填入即可自动完成邀请，无需手动登记。</text>
      </view>

      <!-- 统计卡（对齐 App _Stat：已推荐 / 已付款 / 累计返现 + 已打款 / 待打款 + 进度条） -->
      <view class="card">
        <view class="stat-row">
          <view class="stat">
            <text class="stat-num">{{ invitedCount }}</text>
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
        <view class="stat-row second">
          <view class="stat">
            <text class="stat-num">{{ formatYuan(rebatePaid) }}</text>
            <text class="stat-label">已打款（元）</text>
          </view>
          <view class="stat">
            <text class="stat-num">{{ formatYuan(rebatePending) }}</text>
            <text class="stat-label">待打款（元）</text>
          </view>
        </view>
        <text class="progress-text">
          推荐 {{ invitedCount }}/{{ NEED }} 位有效好友，即可免费获得 VIP {{ REWARD_MONTHS }} 个月{{ bonusText }}
        </text>
        <view class="progress-track">
          <view class="progress-bar" :style="{ width: progressPct + '%' }"></view>
        </view>
      </view>

      <!-- 专属邀请链接（对齐 App 邀请链接卡：标题 + 链接 + 复制链接 / 分享给好友） -->
      <view class="card link-card">
        <text class="link-title">专属邀请链接</text>
        <text class="link-value">{{ inviteLink }}</text>
        <view class="link-actions">
          <view class="link-btn ghost" hover-class="action-hover" @tap="copyLink">复制链接</view>
          <button class="link-btn primary" open-type="share" hover-class="btn-hover">分享给好友</button>
        </view>
      </view>

      <!-- 返现收款账户 & 申请打款（模块 B，对齐 App 返现卡结构） -->
      <view class="card payout-card">
        <view class="payout-head">
          <text class="payout-title">返现收款账户</text>
          <view class="payout-edit" hover-class="action-hover" @tap="openAccountForm">
            {{ payoutEmpty ? '去设置' : '修改' }}
          </view>
        </view>
        <text class="payout-summary">{{ accountSummary }}</text>
        <text class="payout-status">
          {{
            applyAtText
              ? `已申请，等待打款（${applyAtText}）`
              : `待打款 ¥${formatYuan(rebatePending)}，可随时申请`
          }}
        </text>
        <view
          class="apply-btn"
          :class="canApply ? 'apply-active' : 'apply-disabled'"
          :hover-class="canApply ? 'btn-hover' : 'none'"
          @tap="onApply"
        >
          <text>{{ applying ? '提交中…' : '申请打款' }}</text>
        </view>
      </view>

      <!-- 好友列表（对齐 App _InviteeTile：头像首字 + 名称 + 副标题 + 状态徽标） -->
      <view v-if="!invitedCount" class="card empty-card">
        <text class="empty-icon">👥</text>
        <text class="empty-text">还没有好友通过你的邀请码注册</text>
        <text class="empty-text">把邀请码发给朋友，注册后自动出现在这里</text>
      </view>
      <view v-else class="row-list">
        <view v-for="e in invitees" :key="String(e.id)" class="row-card">
          <view class="avatar">{{ avatarOf(e) }}</view>
          <view class="row-main">
            <text class="row-title">{{ nameOf(e) }}</text>
            <text class="row-sub">{{ tileSub(e) }}</text>
          </view>
          <view class="badge" :class="badgeOf(e).cls">
            <text class="badge-text">{{ badgeOf(e).text }}</text>
          </view>
        </view>
      </view>

      <!-- 活动规则（对齐 App 规则说明） -->
      <view class="card rules">
        <text class="rules-title">活动规则</text>
        <text class="rules-text">1. 好友注册时填写你的邀请码，系统自动绑定邀请关系；</text>
        <text class="rules-text">2. 好友付款开通专业版后自动返现其付款金额的 50%；</text>
        <text class="rules-text">
          3. 每 {{ NEED }} 位有效好友自动免费赠送 VIP {{ REWARD_MONTHS }} 个月；
        </text>
        <text class="rules-text">4. 返现与 VIP 赠送由服务器统一记录，换机 / 重装后依然保留。</text>
      </view>
    </template>

    <!-- 收款账户设置弹层（仅服务端返现使用，与本地钱包提现账户互不影响） -->
    <view v-if="showForm" class="mask" @tap="closeForm">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">返现收款账户</text>
        <text class="sheet-tip">用于接收邀请返现打款，仅在申请打款时使用；与钱包余额提现相互独立。</text>

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
          <text class="form-label">收款人姓名</text>
          <input
            class="form-input"
            :maxlength="20"
            v-model="form.name"
            placeholder="用于打款核对，如「张三」"
            placeholder-class="ph"
          />
        </view>
        <view class="form-field">
          <text class="form-label">收款账号</text>
          <input
            class="form-input"
            :maxlength="40"
            v-model="form.account"
            placeholder="微信号 / 支付宝账号"
            placeholder-class="ph"
          />
        </view>

        <view class="qr-row">
          <view class="qr-item">
            <view class="qr-thumb">
              <image
                v-if="form.wechatQrcode"
                class="qr-img"
                :src="form.wechatQrcode"
                mode="aspectFill"
              />
              <text v-else class="qr-mark">{{ payoutHasWechat ? '✓' : '＋' }}</text>
            </view>
            <view class="qr-main">
              <text class="qr-label">微信收款码</text>
              <text class="qr-state">{{ qrStateText('wechat') }}</text>
            </view>
            <view class="qr-btn" hover-class="action-hover" @tap="pickQr('wechat')">
              {{ hasNewQr('wechat') || payoutHasWechat ? '更换' : '选择图片' }}
            </view>
          </view>
          <view class="qr-item">
            <view class="qr-thumb">
              <image
                v-if="form.alipayQrcode"
                class="qr-img"
                :src="form.alipayQrcode"
                mode="aspectFill"
              />
              <text v-else class="qr-mark">{{ payoutHasAlipay ? '✓' : '＋' }}</text>
            </view>
            <view class="qr-main">
              <text class="qr-label">支付宝收款码</text>
              <text class="qr-state">{{ qrStateText('alipay') }}</text>
            </view>
            <view class="qr-btn" hover-class="action-hover" @tap="pickQr('alipay')">
              {{ hasNewQr('alipay') || payoutHasAlipay ? '更换' : '选择图片' }}
            </view>
          </view>
        </view>
        <text class="qr-hint">选填，建议上传以便后台扫码转账；单张压缩后不超过 200KB。</text>

        <view class="sheet-btns">
          <view class="sheet-btn ghost" hover-class="action-hover" @tap="closeForm">取消</view>
          <view
            class="sheet-btn primary"
            :class="saving ? 'btn-disabled' : ''"
            hover-class="action-hover"
            @tap="saveAccount"
          >
            {{ saving ? '保存中…' : '保存收款账户' }}
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { onShareAppMessage, onShareTimeline, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDateTime, formatYuan } from '@/utils/format'
import { applyPayout, savePayoutAccount, type MeInvitee } from '@/api/user'
import { pickQrcodeDataUrl } from '@/utils/qrcode-image'

/** 推荐好友数达到该值 → 送 VIP（对齐 AppConfig.inviteFreeVipFriends） */
const NEED = 2
/** 达成推荐目标赠送的 VIP 月数（对齐 AppConfig.inviteRewardMonths） */
const REWARD_MONTHS = 1

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
const invitees = computed<MeInvitee[]>(() => me.value?.invitees ?? [])
const invitedCount = computed(() => invitees.value.length)
const paidCount = computed(() => invitees.value.filter((e) => e.paid).length)

const inviteCode = computed(() => (me.value?.inviteCode || '').trim())
/** 专属邀请链接：优先取服务端 inviteLink，缺省时按邀请码拼接（对齐 App _load 兜底） */
const inviteLink = computed(() => {
  const raw = (me.value?.inviteLink || '').trim()
  if (raw) return raw
  return inviteCode.value ? `https://yurouyun.cn/?ic=${inviteCode.value}` : ''
})

const rebateTotal = computed(() => Number(me.value?.rebateTotal || 0))
const rebatePaid = computed(() => Number(me.value?.rebatePaid || 0))
const rebatePending = computed(() => Number(me.value?.rebatePending || 0))
const applyAtText = computed(() => {
  const ts = Number(me.value?.payoutApplyAt || 0)
  return ts ? formatDateTime(ts) : ''
})
const bonusText = computed(() => (me.value?.vipRewardGranted ? '（已领取）' : ''))

const payout = computed(() => me.value?.payout)
/** 收款账户是否为空（对齐 App payoutInfo().isEmpty：字段与收款码标记全空视为未设置） */
const payoutEmpty = computed(() => {
  const p = payout.value
  if (!p) return true
  return (
    !String(p.method || '') &&
    !String(p.name || '') &&
    !String(p.account || '') &&
    p.hasWechatQrcode !== true &&
    p.hasAlipayQrcode !== true
  )
})

/** 服务端是否已保存对应收款码（服务端不回传图片本体，仅返回已设置标记） */
const payoutHasWechat = computed(() => payout.value?.hasWechatQrcode === true)
const payoutHasAlipay = computed(() => payout.value?.hasAlipayQrcode === true)

const accountSummary = computed(() => {
  const p = payout.value
  const method = String(p?.method || '')
  const name = String(p?.name || '')
  const account = String(p?.account || '')
  const wx = p?.hasWechatQrcode === true
  const ali = p?.hasAlipayQrcode === true
  if (!method && !name && !account && !wx && !ali) {
    return '尚未设置，设置后才能申请打款'
  }
  const label = method === 'alipay' ? '支付宝' : method === 'wechat' ? '微信' : '未选方式'
  const masked = account.length <= 4 ? account : `${account.slice(0, 2)}****${account.slice(-2)}`
  const codes = [wx ? '已传微信码' : '', ali ? '已传支付宝码' : ''].filter(Boolean).join('、')
  return `${label} · ${name || '未填姓名'} · ${masked || '未填账号'}${codes ? ` · ${codes}` : ' · 未传收款码'}`
})

const canApply = computed(() => rebatePending.value > 0 && !applying.value)
const progressPct = computed(() => Math.min(100, Math.round((invitedCount.value / NEED) * 100)))

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

function tileSub(e: MeInvitee): string {
  if (e.paid) {
    return `已付款 ¥${formatYuan(e.payAmount)} · 返现 ¥${formatYuan(rebateOf(e))}`
  }
  const phone = (e.phone || '').trim()
  return phone || '已注册 · 待付款'
}

function badgeOf(e: MeInvitee): { text: string; cls: string } {
  if (!e.paid) return { text: '待付款', cls: 'badge-muted' }
  return e.payoutAt ? { text: '已打款', cls: 'badge-accent' } : { text: '待打款', cls: 'badge-primary' }
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
  if (!inviteCode.value) return
  uni.setClipboardData({
    data: inviteCode.value,
    success: () => {
      uni.showToast({ title: '邀请码已复制', icon: 'none' })
    }
  })
}

function copyLink() {
  if (!inviteLink.value) return
  uni.setClipboardData({
    data: inviteLink.value,
    success: () => {
      uni.showToast({ title: '专属邀请链接已复制', icon: 'none' })
    }
  })
}

/** 分享文案与 App _share 一致；小程序分享卡片以 path 携带邀请码，落地自动预填 */
function shareTitle(): string {
  return inviteCode.value
    ? `我在用「接单管家」管报价、客户和项目，注册时填邀请码 ${inviteCode.value} 即可`
    : '我在用「接单管家」管报价、客户和项目'
}

onShareAppMessage(() => ({
  title: shareTitle(),
  path: inviteCode.value ? `/pages/login/login?ic=${inviteCode.value}` : '/pages/login/login'
}))

onShareTimeline(() => ({
  title: shareTitle(),
  query: inviteCode.value ? `ic=${inviteCode.value}` : ''
}))

function openAccountForm() {
  const p = payout.value
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

/** 本次是否已选了新收款码（对齐 App「已选择新图片，保存后生效」） */
function hasNewQr(kind: 'wechat' | 'alipay'): boolean {
  return kind === 'wechat' ? !!form.wechatQrcode : !!form.alipayQrcode
}

/** 收款码行状态文案（对齐 App _QrRow：已选择新图片 / 已设置 / 未设置） */
function qrStateText(kind: 'wechat' | 'alipay'): string {
  if (hasNewQr(kind)) return '已选择新图片，保存后生效'
  const has = kind === 'wechat' ? payoutHasWechat.value : payoutHasAlipay.value
  return has ? '已设置' : '未设置'
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
  if (name.length > 20) {
    uni.showToast({ title: '姓名不能超过 20 个字', icon: 'none' })
    return
  }
  if (!account) {
    uni.showToast({ title: '请填写收款账号', icon: 'none' })
    return
  }
  if (account.length > 40) {
    uni.showToast({ title: '收款账号不能超过 40 个字符', icon: 'none' })
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
  if (!canApply.value) return
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
    title:
      count > 0
        ? `已提交 ${count} 笔、合计 ¥${formatYuan(amount)}，打款后会更新状态`
        : '当前没有可申请的返现',
    icon: 'none'
  })
  await reload()
}
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
  padding: 32rpx;
  border-radius: 28rpx;
  background: #ffffff;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.card:first-child {
  margin-top: 0;
}

.action-hover {
  opacity: 0.8;
}

.btn-hover {
  opacity: 0.88;
}

/* ===== 未登录 / 加载 / 失败 ===== */
.not-login {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 70vh;
}

.not-login-icon {
  font-size: 120rpx;
  line-height: 1;
}

.not-login-title {
  margin-top: 32rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.not-login-sub {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.primary-pill {
  margin-top: 40rpx;
  padding: 20rpx 72rpx;
  border-radius: 44rpx;
  background: #4a5af0;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.center-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 32rpx;
}

.center-text {
  font-size: 26rpx;
  color: #8a93a6;
}

/* ===== 我的邀请码卡 ===== */
.code-card {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.code-label {
  font-size: 26rpx;
  color: #8a93a6;
}

.code-row {
  margin-top: 20rpx;
  display: flex;
  align-items: center;
}

.code-value {
  font-size: 64rpx;
  font-weight: 800;
  letter-spacing: 6rpx;
  color: #4a5af0;
}

.code-copy {
  margin-left: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 26rpx;
  background: rgba(74, 90, 240, 0.08);
  color: #4a5af0;
  font-size: 24rpx;
  font-weight: 600;
}

.code-tip {
  margin-top: 24rpx;
  font-size: 24rpx;
  line-height: 1.7;
  text-align: center;
  color: #8a93a6;
}

/* ===== 统计卡 ===== */
.stat-row {
  display: flex;
  align-items: center;
}

.stat-row.second {
  margin-top: 28rpx;
}

.stat {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 800;
  color: #1f2430;
}

.stat-label {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.progress-text {
  display: block;
  margin-top: 28rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #4c5566;
}

.progress-track {
  margin-top: 16rpx;
  height: 16rpx;
  border-radius: 8rpx;
  background: rgba(74, 90, 240, 0.12);
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  border-radius: 8rpx;
  background: #16a085;
}

/* ===== 专属邀请链接卡 ===== */
.link-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.link-value {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-actions {
  margin-top: 8rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.link-btn {
  margin: 0;
  padding: 12rpx 32rpx;
  border-radius: 40rpx;
  font-size: 26rpx;
  font-weight: 600;
  line-height: 1.4;
}

.link-btn::after {
  border: none;
}

.link-btn.ghost {
  background: rgba(74, 90, 240, 0.08);
  color: #4a5af0;
}

.link-btn.primary {
  background: #4a5af0;
  color: #ffffff;
}

/* ===== 返现收款账户卡 ===== */
.payout-head {
  display: flex;
  align-items: center;
}

.payout-title {
  flex: 1;
  min-width: 0;
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
}

.payout-edit {
  margin-left: 16rpx;
  font-size: 26rpx;
  font-weight: 600;
  color: #4a5af0;
}

.payout-summary {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #8a93a6;
}

.payout-status {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #8a93a6;
}

.apply-btn {
  margin-top: 20rpx;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
  color: #ffffff;
}

.apply-active {
  background: #4a5af0;
}

.apply-disabled {
  background: #d8dce6;
}

/* ===== 好友列表 ===== */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 56rpx 32rpx;
}

.empty-icon {
  font-size: 72rpx;
  line-height: 1;
}

.empty-text {
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.6;
  text-align: center;
  color: #8a93a6;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  margin-top: 16rpx;
}

.row-card {
  padding: 24rpx;
  border-radius: 28rpx;
  background: #ffffff;
  display: flex;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
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
  font-weight: 600;
  color: #1f2430;
}

.row-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge {
  margin-left: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  flex-shrink: 0;
}

.badge-text {
  font-size: 22rpx;
  font-weight: 600;
}

.badge-primary {
  background: rgba(74, 90, 240, 0.12);
}

.badge-primary .badge-text {
  color: #4a5af0;
}

.badge-accent {
  background: rgba(22, 160, 133, 0.12);
}

.badge-accent .badge-text {
  color: #16a085;
}

.badge-muted {
  background: rgba(138, 147, 166, 0.1);
}

.badge-muted .badge-text {
  color: #8a93a6;
}

/* ===== 活动规则 ===== */
.rules {
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
  background: #ffffff;
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
  background: rgba(74, 90, 240, 0.08);
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

.ph {
  color: #9ca3af;
  font-size: 26rpx;
}

.qr-row {
  margin-top: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.qr-item {
  display: flex;
  align-items: center;
  padding: 16rpx;
  border-radius: 16rpx;
  background: #f7f8fc;
}

.qr-thumb {
  width: 96rpx;
  height: 96rpx;
  border-radius: 12rpx;
  background: rgba(138, 147, 166, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
}

.qr-img {
  width: 100%;
  height: 100%;
}

.qr-mark {
  font-size: 32rpx;
  color: #b6bcc9;
}

.qr-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rpx;
  display: flex;
  flex-direction: column;
}

.qr-label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.qr-state {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.qr-btn {
  margin-left: 16rpx;
  padding: 10rpx 24rpx;
  border-radius: 30rpx;
  background: rgba(74, 90, 240, 0.08);
  color: #4a5af0;
  font-size: 24rpx;
  font-weight: 600;
  flex-shrink: 0;
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
  background: #4a5af0;
  color: #ffffff;
}

.sheet-btn.primary.btn-disabled {
  opacity: 0.6;
}
</style>
