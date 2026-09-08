<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">👑</text>
      <text class="empty-text">登录后查看订阅状态并开通专业版</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 当前订阅状态 -->
      <view class="status-card" :class="proActive ? 'is-pro' : ''">
        <view class="status-head">
          <text class="status-name">{{ proActive ? '专业版' : '免费版' }}</text>
          <text class="status-sub">{{ proActive ? '全部能力已解锁' : '开通后解锁完整能力' }}</text>
        </view>
        <view class="status-line">
          <text v-if="proActive && proExpireTs > 0" class="status-expire">有效期至 {{ formatDate(proExpireTs) }}</text>
          <text v-else-if="proActive" class="status-expire">永久生效</text>
          <text v-else class="status-expire">未开通</text>
        </view>
      </view>

      <!-- 订阅档位 -->
      <view class="section-head">
        <text class="section-title">选择订阅方案</text>
      </view>
      <view class="plan-list">
        <view
          v-for="(p, i) in plans"
          :key="p.key"
          class="plan-card"
          :class="{ selected: selected === i, highlight: !!p.highlight }"
          @tap="selected = i"
        >
          <view class="plan-main">
            <text class="plan-name">{{ p.name }}</text>
            <text class="plan-desc">{{ p.desc }}</text>
          </view>
          <text class="plan-price">{{ p.price }}</text>
          <view v-if="selected === i" class="plan-check">✓</view>
        </view>
      </view>

      <view class="pay-btn" hover-class="action-hover" :class="{ disabled: paying }" @tap="buy">
        {{ paying ? '正在提交…' : '立即开通' }}
      </view>
      <text class="pay-tip">提交后将创建支付订单，请在打开的支付页面完成付款；支付成功后系统会自动开通专业版。</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/format'
import { payCreate, type PayPlanKey } from '@/api/pay'

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

const user = useUserStore()
const selected = ref(1) // 默认选中年付
const paying = ref(false)

interface Plan {
  key: PayPlanKey
  name: string
  price: string
  desc: string
  highlight?: boolean
}

const FIRST_MONTH_PRICE = 1
const MONTH_PRICE = 10
const YEAR_PRICE = 68
const FOREVER_PRICE = 98

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
      highlight: true
    })
  }
  list.push(
    {
      key: 'month',
      name: '月付',
      price: `¥${MONTH_PRICE}/月`,
      desc: '按月订阅，随时可续'
    },
    {
      key: 'year',
      name: '年付',
      price: `¥${YEAR_PRICE}/年`,
      desc: '相当于每月不到 ¥6'
    },
    {
      key: 'forever',
      name: '永久',
      price: `¥${FOREVER_PRICE}`,
      desc: '一次买断，永久使用'
    }
  )
  return list
})

const proActive = computed(() => {
  const u = user.userInfo as unknown as Row
  return u['isPro'] === true || u['isPro'] === 1 || u['isPro'] === '1'
})

const proExpireTs = computed(() => {
  const u = user.userInfo as unknown as Row
  return num(u['proExpireAt'])
})

onShow(() => {
  if (user.isLoggedIn) user.fetchMeData()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function refreshState() {
  if (user.isLoggedIn) await user.fetchMeData()
}

function buy() {
  if (paying.value) return
  const plan = plans.value[selected.value]
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
        content: `订单金额 ¥${(Number(d.amount) || 0).toFixed(2)}，支付链接已复制到剪贴板，请粘贴到手机浏览器打开并完成支付。支付成功后系统将自动开通专业版。`,
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

.section-head {
  margin: 30rpx 8rpx 14rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.plan-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.plan-card {
  position: relative;
  background: #fff;
  border-radius: 20rpx;
  padding: 26rpx 28rpx;
  display: flex;
  align-items: center;
  border: 3rpx solid transparent;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.plan-card.selected {
  border-color: #4a5af0;
}

.plan-card.highlight {
  background: linear-gradient(180deg, #fff8f2 0%, #fff 60%);
}

.plan-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.plan-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.plan-desc {
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.plan-price {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
  margin-left: 12rpx;
}

.plan-check {
  position: absolute;
  right: 22rpx;
  bottom: 18rpx;
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #4a5af0;
  color: #fff;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pay-btn {
  margin-top: 30rpx;
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

.pay-tip {
  display: block;
  margin-top: 18rpx;
  padding: 0 8rpx;
  font-size: 22rpx;
  color: #9ca3af;
  line-height: 1.6;
}

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
