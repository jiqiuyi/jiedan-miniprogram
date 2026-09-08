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
            <text class="stat-num">{{ formatAmount(rebateTotal) }}</text>
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
            <text class="paid-main">已付款 ¥{{ formatAmount(e.payAmount) }}</text>
            <text class="paid-sub">返现 ¥{{ formatAmount(rebateOf(e)) }}</text>
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
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatAmount, maskPhone } from '@/utils/format'
import type { MeInvitee } from '@/api/user'

const NEED = 2 // 满 2 位有效好友赠 1 个月 VIP
const REBATE_RATE = 0.5 // 返现比例 50%

const user = useUserStore()
const loading = ref(false)

const me = computed(() => user.me)

const paidCount = computed(() => {
  return me.value ? me.value.invitees.filter((e) => e.paid).length : 0
})

const rebateTotal = computed(() => {
  return me.value ? Number(me.value.rebateTotal || 0) : 0
})

const bonusText = computed(() => {
  if (me.value && me.value.vipRewardGranted) return '（已领取）'
  return ''
})

const progressPct = computed(() => {
  const n = me.value ? me.value.invitees.length : 0
  return Math.min(100, Math.round((n / NEED) * 100))
})

function dateText(ts: number): string {
  if (!ts) return '刚刚注册'
  const d = new Date(ts)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nameOf(e: MeInvitee): string {
  return (e.nickname || '').trim() || `好友${e.id}`
}

function avatarOf(e: MeInvitee): string {
  return (nameOf(e) || '友').charAt(0)
}

function rebateOf(e: MeInvitee): number {
  return Math.round((Number(e.payAmount) || 0) * REBATE_RATE)
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
</style>
