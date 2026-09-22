<template>
  <view class="page">
    <!-- 未登录：登录引导（保留原实现） -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">👑</text>
      <text class="empty-text">登录后查看订阅状态并开通专业版</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 订阅状态卡 -->
      <view class="status-card" :class="proActive ? 'is-pro' : ''">
        <view class="status-head">
          <text class="status-name">{{ proActive ? '专业版' : '免费版' }}</text>
          <text class="status-sub">{{ proActive ? '全部能力已解锁' : '开通后解锁完整能力' }}</text>
        </view>
        <view class="status-line">
          <text class="status-expire">{{ expireText }}</text>
        </view>
      </view>

      <!-- 权益说明（对照 paywall_page.dart：图标 + 主标题 + 副文案） -->
      <view class="hero">
        <text class="hero-icon">👑</text>
        <text class="hero-title">解锁接单管家的全部能力</text>
        <text class="hero-desc">从此不限客户数、不限项目数，专心接单不再被工具卡住。</text>
      </view>

      <!-- 订阅档位（永久档默认隐藏，见 SHOW_FOREVER） -->
      <view class="plan-list">
        <view
          v-for="p in plans"
          :key="p.key"
          class="plan-card"
          :class="{ selected: p.key === selectedKey, highlight: !!p.highlight }"
          @tap="selectedKey = p.key"
        >
          <text
            class="plan-radio"
            :class="{
              'is-on': p.key === selectedKey,
              'is-white': p.key === selectedKey && !!p.highlight
            }"
            >{{ p.key === selectedKey ? '◉' : '○' }}</text
          >
          <view class="plan-main">
            <view class="plan-name-row">
              <text class="plan-name">{{ p.name }}</text>
              <text v-if="p.highlight" class="plan-badge">限时</text>
            </view>
            <text class="plan-desc">{{ p.desc }}</text>
          </view>
          <text class="plan-price">{{ p.price }}</text>
        </view>
      </view>

      <view
        class="pay-btn"
        hover-class="action-hover"
        :class="{ disabled: paying || proActive }"
        @tap="buy"
      >
        {{ proActive ? '已是专业版' : paying ? '正在提交…' : payBtnText }}
      </view>

      <!-- 两行说明小字：起点对齐（同一左边缘），整体在页面内水平居中 -->
      <view class="tips-wrap">
        <view class="tips">
          <text class="tip-line">付款成功后由系统自动开通，无需等待人工确认。</text>
          <text class="tip-line">兑换码由系统后台核销开通，请从可靠渠道获取</text>
        </view>
      </view>

      <!-- 兑换码开通 -->
      <view class="entry" @tap="openRedeem">
        <text class="entry-icon">🎟</text>
        <text class="entry-text">兑换码开通</text>
      </view>

      <!-- 6h 退款入口（仅已开通显示） -->
      <view v-if="proActive" class="entry" @tap="openRefund">
        <text class="entry-icon">↩</text>
        <text class="entry-text">申请退款（开通 6 小时内，每账号 1 次）</text>
      </view>
    </template>

    <!-- 兑换码弹层（等价 App _showRedeemDialog：说明 + 输入 + 取消 / 兑换） -->
    <view v-if="redeemVisible" class="sheet-mask" @tap="closeRedeem">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">兑换码开通</text>
        <text class="sheet-sub">输入兑换码即可开通专业版，由系统后台核销。</text>
        <input
          v-model="redeemInput"
          class="field-input"
          type="text"
          placeholder="请输入兑换码"
          placeholder-class="ph"
        />
        <view class="sheet-actions">
          <view class="btn ghost" @tap="closeRedeem">取消</view>
          <view class="btn solid" :class="{ 'is-disabled': redeeming }" @tap="submitRedeem">
            兑换
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/format'
import {
  payCreate,
  redeemCode,
  jianpayRefund,
  jianpayRefundStatus,
  type PayPlanKey
} from '@/api/pay'

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const user = useUserStore()

/** 档位价格（元；与 App AppConfig.firstMonthPrice / monthlyPrice / yearlyPrice / foreverPrice 一致） */
const FIRST_MONTH_PRICE = 1
const MONTH_PRICE = 10
const YEAR_PRICE = 68
const FOREVER_PRICE = 98

/** 永久档展示开关：App paywall_page.dart `_showForever = false`（代码保留，恢复展示改 true） */
const SHOW_FOREVER = false

interface Plan {
  key: PayPlanKey
  name: string
  price: string
  desc: string
  /** 主按钮文案（对齐 App _Plan.buyText） */
  buyText: string
  highlight?: boolean
}

const firstMonthUsed = computed(() => {
  const u = user.userInfo as unknown as Row
  return num(u['firstMonthUsed']) === 1 || u['firstMonthUsed'] === true
})

const plans = computed<Plan[]>(() => {
  const list: Plan[] = []
  if (!firstMonthUsed.value) {
    list.push({
      key: 'firstMonth',
      name: '首月特惠',
      price: `¥${FIRST_MONTH_PRICE}`,
      desc: '仅限首次开通，每人一次',
      buyText: `¥${FIRST_MONTH_PRICE} 开通首月`,
      highlight: true
    })
  }
  list.push(
    {
      key: 'month',
      name: '月付',
      price: `¥${MONTH_PRICE}/月`,
      desc: '按月订阅，随时可续',
      buyText: '立即解锁'
    },
    {
      key: 'year',
      name: '年付',
      price: `¥${YEAR_PRICE}/年`,
      desc: '相当于每月不到 ¥6',
      buyText: '立即解锁'
    }
  )
  // 永久档暂时隐藏（代码保留，恢复展示把 SHOW_FOREVER 改为 true）
  if (SHOW_FOREVER) {
    list.push({
      key: 'forever',
      name: '永久',
      price: `¥${FOREVER_PRICE}`,
      desc: '一次买断，永久使用',
      buyText: '立即解锁'
    })
  }
  return list
})

/** 默认选中：年付（按 key 定位，首月档展示与否均不受影响） */
const selectedKey = ref<PayPlanKey>('year')
const selectedPlan = computed(
  () => plans.value.find((p) => p.key === selectedKey.value) || plans.value[plans.value.length - 1]
)

const payBtnText = computed(() => selectedPlan.value?.buyText || '立即解锁')

const proActive = computed(() => user.isPro)

const proExpireTs = computed(() => {
  const u = user.userInfo as unknown as Row
  return num(u['proExpireAt'])
})

const expireText = computed(() => {
  if (!proActive.value) return '未开通'
  return proExpireTs.value > 0 ? `有效期至 ${formatDate(proExpireTs.value)}` : '永久生效'
})

const paying = ref(false)
const redeemVisible = ref(false)
const redeemInput = ref('')
const redeeming = ref(false)
const refunding = ref(false)

onShow(() => {
  if (user.isLoggedIn) user.fetchMeData()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function refreshState() {
  if (user.isLoggedIn) await user.fetchMeData()
}

/** 下单：创建订单 → 复制支付链接 → 提示到浏览器完成付款（保持现有方案，不接入小程序内支付） */
function buy() {
  if (paying.value || proActive.value) return
  const plan = selectedPlan.value
  if (!plan) return
  paying.value = true
  payCreate(plan.key)
    .then(async (res) => {
      if (!res.ok || !res.data) {
        uni.showModal({
          title: '下单失败',
          content: res.error || '创建支付订单失败，请稍后重试',
          showCancel: false,
          confirmText: '知道了'
        })
        return
      }
      const d = res.data
      const url = d.url || ''
      // 先复制支付链接，便于用户在浏览器打开
      if (url) {
        try {
          await uni.setClipboardData({ data: url })
        } catch {
          // 复制失败不阻塞提示
        }
      }
      uni.showModal({
        title: '请在浏览器打开完成支付',
        content: `订单金额 ¥${(Number(d.amount) || 0).toFixed(2)}，支付链接已复制到剪贴板，请粘贴到手机浏览器打开并完成支付。付款成功后由系统自动开通，无需等待人工确认。`,
        showCancel: false,
        confirmText: '知道了'
      })
      // 返回后刷新云端订阅状态
      refreshState()
    })
    .catch(() => {
      uni.showModal({
        title: '下单失败',
        content: '网络异常，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      })
    })
    .finally(() => {
      paying.value = false
    })
}

/** 兑换码开通（对照 App _showRedeemDialog：提交后调用后端核销） */
function openRedeem() {
  redeemInput.value = ''
  redeemVisible.value = true
}

function closeRedeem() {
  if (redeeming.value) return
  redeemVisible.value = false
}

async function submitRedeem() {
  if (redeeming.value) return
  const code = redeemInput.value.trim()
  if (!code) {
    uni.showToast({ title: '请输入兑换码', icon: 'none' })
    return
  }
  redeeming.value = true
  try {
    const res = await redeemCode(code)
    if (!res.ok) {
      uni.showToast({ title: res.error || '兑换码核销暂不可用', icon: 'none' })
      return
    }
    redeemVisible.value = false
    await refreshState()
    const msg = (res.data as Row | undefined)?.['message']
    uni.showToast({ title: String(msg || '兑换成功，已开通专业版'), icon: 'none' })
  } catch {
    uni.showToast({ title: '兑换码核销暂不可用', icon: 'none' })
  } finally {
    redeeming.value = false
  }
}

/** 6h 退款：先查退款资格，符合则确认后提交；退款成功刷新订阅状态 */
function openRefund() {
  if (refunding.value) return
  refunding.value = true
  jianpayRefundStatus()
    .then((res) => {
      refunding.value = false
      if (!res.ok || !res.data) {
        uni.showToast({ title: res.error || '退款通道暂不可用', icon: 'none' })
        return
      }
      const st = res.data as Row
      const can = st['canRefund'] === true
      const reason = String(st['reason'] ?? '')
      const orderNo = String(st['orderNo'] ?? '')
      uni.showModal({
        title: '申请退款',
        content: can
          ? '退款将原路退回，退款成功后专业版权益立即收回，且该账号不再支持退款。确认申请退款？'
          : `当前暂不可退款：${reason}`,
        showCancel: can,
        confirmText: can ? '确认退款' : '关闭',
        cancelText: '取消',
        success: (r) => {
          if (!can || !r.confirm) return
          submitRefund(orderNo)
        }
      })
    })
    .catch(() => {
      refunding.value = false
      uni.showToast({ title: '退款通道暂不可用', icon: 'none' })
    })
}

function submitRefund(orderNo: string) {
  refunding.value = true
  jianpayRefund(orderNo)
    .then(async (res) => {
      if (!res.ok) {
        uni.showToast({ title: res.error || '退款申请失败，请稍后重试', icon: 'none' })
        return
      }
      const msg = (res.data as Row | undefined)?.['message']
      uni.showToast({ title: String(msg || '退款已提交'), icon: 'none' })
      // 订阅状态刷新失败不阻塞提示，下次进入页面会重新拉取
      try {
        await refreshState()
      } catch {
        // 忽略
      }
    })
    .catch(() => {
      uni.showToast({ title: '退款申请失败，请稍后重试', icon: 'none' })
    })
    .finally(() => {
      refunding.value = false
    })
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

.status-card {
  border-radius: 24rpx;
  padding: 36rpx 32rpx;
  background: linear-gradient(135deg, #8a93a6 0%, #b6bcc9 100%);
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.status-card.is-pro {
  background: linear-gradient(135deg, #f6b352 0%, #ff7a5c 100%);
}

.status-head {
  display: flex;
  flex-direction: column;
}

.status-name {
  font-size: 40rpx;
  font-weight: 700;
}

.status-sub {
  margin-top: 6rpx;
  font-size: 22rpx;
  opacity: 0.9;
}

.status-line {
  text-align: right;
}

.status-expire {
  font-size: 22rpx;
  opacity: 0.9;
}

/* ---- 权益说明 ---- */
.hero {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hero-icon {
  font-size: 80rpx;
  line-height: 1;
}

.hero-title {
  margin-top: 20rpx;
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2430;
  text-align: center;
}

.hero-desc {
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #8a93a6;
  text-align: center;
  line-height: 1.6;
}

/* ---- 订阅档位 ---- */
.plan-list {
  margin-top: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.plan-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx 32rpx;
  border: 2rpx solid #e4e7ef;
  box-sizing: border-box;
}

.plan-card.selected {
  border-color: #4a5af0;
  background: rgba(74, 90, 240, 0.08);
  box-shadow: 0 8rpx 20rpx rgba(74, 90, 240, 0.12);
}

.plan-card.selected.highlight {
  background: #4a5af0;
  border-color: #4a5af0;
}

.plan-radio {
  font-size: 34rpx;
  color: #8a93a6;
  margin-right: 22rpx;
  flex-shrink: 0;
}

.plan-radio.is-on {
  color: #4a5af0;
}

.plan-radio.is-white {
  color: #fff;
}

.plan-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.plan-name-row {
  display: flex;
  align-items: center;
}

.plan-name {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.plan-badge {
  margin-left: 12rpx;
  padding: 2rpx 10rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 600;
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.1);
}

.plan-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.plan-price {
  margin-left: 16rpx;
  font-size: 34rpx;
  font-weight: 800;
  color: #1f2430;
  flex-shrink: 0;
}

/* 选中 + 高亮档位（首月特惠）整体反白 */
.plan-card.selected .plan-name,
.plan-card.selected .plan-price {
  color: #4a5af0;
}

.plan-card.selected.highlight .plan-name,
.plan-card.selected.highlight .plan-price {
  color: #fff;
}

.plan-card.selected.highlight .plan-desc {
  color: rgba(255, 255, 255, 0.7);
}

.plan-card.selected.highlight .plan-badge {
  color: #fff;
  background: rgba(255, 255, 255, 0.2);
}

.pay-btn {
  margin-top: 34rpx;
  text-align: center;
  padding: 26rpx 0;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.pay-btn.disabled {
  opacity: 0.6;
}

.action-hover {
  opacity: 0.85;
}

/* ---- 两行说明小字 ---- */
.tips-wrap {
  margin-top: 20rpx;
  display: flex;
  justify-content: center;
}

.tips {
  display: flex;
  flex-direction: column;
}

.tip-line {
  font-size: 22rpx;
  color: #8a93a6;
  line-height: 1.8;
}

/* ---- 入口（兑换码 / 退款） ---- */
.entry {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 18rpx 0;
}

.entry-icon {
  font-size: 28rpx;
  margin-right: 10rpx;
}

.entry-text {
  font-size: 26rpx;
  color: #4a5af0;
}

/* ---- 兑换码弹层 ---- */
.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 18, 28, 0.45);
  z-index: 90;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.sheet-sub {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.field-input {
  margin-top: 20rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: #f6f7fb;
  font-size: 28rpx;
}

.ph {
  color: #b6bccb;
}

.sheet-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 24rpx;
}

.btn {
  padding: 16rpx 48rpx;
  border-radius: 36rpx;
  font-size: 28rpx;
  text-align: center;
  margin-left: 20rpx;
}

.btn.ghost {
  border: 1rpx solid rgba(31, 36, 48, 0.2);
  color: #5b6274;
}

.btn.solid {
  background: #4a5af0;
  color: #fff;
}

.btn.solid.is-disabled {
  opacity: 0.4;
}

/* ---- 未登录引导 ---- */
.empty-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 64rpx 24rpx;
}

.empty-icon {
  font-size: 72rpx;
}

.empty-text {
  margin-top: 16rpx;
  font-size: 26rpx;
  color: #9ca3af;
  text-align: center;
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
</style>
