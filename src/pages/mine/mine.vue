<template>
  <view class="page">
    <!-- 账户卡 -->
    <view class="card account-card" @tap="onAccountTap">
      <view class="avatar">{{ avatarText }}</view>
      <view class="account-main">
        <template v-if="user.isLoggedIn">
          <text class="account-title">{{ displayName }}</text>
          <text class="account-sub">{{ maskPhone(phone) }} · 已登录</text>
        </template>
        <template v-else>
          <text class="account-title">未登录</text>
          <text class="account-sub">登录后自动同步数据</text>
        </template>
      </view>
      <view v-if="user.isLoggedIn" class="logout-btn" @tap.stop="onLogout">退出</view>
      <text v-else class="arrow">›</text>
    </view>

    <!-- 订阅状态卡 -->
    <view class="card sub-card" @tap="openPro">
      <view class="sub-row">
        <view class="icon-circle crown">👑</view>
        <view class="sub-main">
          <text class="sub-title">{{ proTitle }}</text>
          <text class="sub-sub">{{ proSub }}</text>
        </view>
        <text class="arrow">›</text>
      </view>
      <view class="menu-item" @tap.stop="openPro">
        <text class="menu-text">升级专业版</text>
        <text class="arrow small">›</text>
      </view>
    </view>

    <!-- 功能分组 -->
    <template v-for="group in groups" :key="group.header">
      <view class="group-header">{{ group.header }}</view>
      <view class="card group-card">
        <view
          v-for="(item, i) in group.items"
          :key="item.title"
          class="menu-item"
          :class="{ 'with-divider': i > 0 }"
          @tap="onItemTap(item)"
        >
          <view class="icon-circle plain">{{ item.icon }}</view>
          <view class="item-main">
            <text class="item-title">{{ item.title }}</text>
            <text class="item-sub">{{ item.subtitle }}</text>
          </view>
          <text class="arrow small">›</text>
        </view>
      </view>
    </template>

    <text class="version">接单管家 v{{ version }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDate, maskPhone } from '@/utils/format'

const user = useUserStore()

const version = '0.1.0' // 与 src/manifest.json versionName 保持一致

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

interface MenuItem {
  icon: string
  title: string
  subtitle: string
  route?: string
}

const groups: { header: string; items: MenuItem[] }[] = [
  {
    header: '资金',
    items: [
      { icon: '💰', title: '钱包', subtitle: '收款余额、提现到账', route: '/pages/wallet/wallet' },
      { icon: '🎁', title: '推广活动', subtitle: '邀请好友赚返现、领 VIP', route: '/pages/wallet/invite' },
      { icon: '💳', title: '收款设置', subtitle: '配置微信 / 支付宝收款码', route: '/pages/wallet/paycodes' },
      { icon: '🔔', title: '付款到账核对', subtitle: '自动识别到账说明', route: '/pages/wallet/payguide' }
    ]
  },
  {
    header: '经营分析',
    items: [
      { icon: '🧾', title: '收入记录', subtitle: '收款明细、按时间筛选', route: '/pages/income/history' },
      { icon: '📈', title: '收入统计', subtitle: '近 12 月收入曲线、客户贡献排行', route: '/pages/income/stats' },
      { icon: '📑', title: '对账汇总', subtitle: '每项目约定 / 已收 / 待收一览', route: '/pages/income/reconciliation' }
    ]
  },
  {
    header: '数据与存储',
    items: [
      { icon: '☁️', title: '数据存储方式', subtitle: '存储模式与云端同步' },
      { icon: '🗂️', title: '数据导出', subtitle: '导出本人云端数据（文本备份）', route: '/pages/data/export' }
    ]
  },
  {
    header: '服务与支持',
    items: [
      { icon: '📮', title: '意见反馈', subtitle: '在线提交 Bug 与建议', route: '/pages/feedback/feedback' },
      { icon: '🔒', title: '隐私政策', subtitle: '数据存储与隐私说明', route: '/pages/privacy/privacy' }
    ]
  },
  {
    header: '管理',
    items: [
      { icon: '🛠️', title: '管理后台', subtitle: '经营数据总览（仅管理员）', route: '/pages/admin/admin' }
    ]
  }
]

/** 登录用户扩展字段：后端 _pub 返回 isPro / proExpireAt（LoginUser 未声明，按未知扩展读取） */
function extUser(): Row {
  const info = user.userInfo as unknown
  return (info ?? {}) as Row
}

const isPro = computed(() => {
  const v = extUser()['isPro']
  return v === true || v === 1 || v === '1'
})

const proExpireAt = computed(() => num(extUser()['proExpireAt']))

const proTitle = computed(() => (isPro.value ? '专业版' : '免费版'))

const proSub = computed(() => {
  if (isPro.value) {
    return proExpireAt.value > 0
      ? `订阅有效期至 ${formatDate(proExpireAt.value)}`
      : '专业版权益已生效'
  }
  return user.isLoggedIn ? '免费版 · 可升级解锁完整能力' : '登录后可查看订阅状态'
})

const phone = computed(() => user.userInfo?.phone || '')
const displayName = computed(() => {
  const nickname = (user.userInfo?.nickname || '').trim()
  if (nickname) return nickname
  return phone.value ? maskPhone(phone.value) : '接单管家用户'
})

const avatarText = computed(() => {
  if (!user.isLoggedIn) return '👤'
  const ch = (displayName.value || '接').charAt(0)
  return ch
})

function onAccountTap() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后本机将清空登录与缓存数据，确定退出吗？',
    success: (res) => {
      if (!res.confirm) return
      user.logout()
    }
  })
}

function comingSoon() {
  uni.showToast({ title: '后续版本开放', icon: 'none' })
}

function openPro() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/wallet/pro' })
}

function onItemTap(item: MenuItem) {
  if (item.route) {
    uni.navigateTo({ url: item.route })
    return
  }
  comingSoon()
}

// 回到本页时刷新订阅状态与账号资料
onShow(() => {
  if (user.isLoggedIn) void user.fetchMeData()
})
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 0 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.account-card {
  display: flex;
  align-items: center;
  padding: 28rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #edefff;
  color: #4a5af0;
  font-size: 40rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 22rpx;
  overflow: hidden;
}

.account-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.account-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.account-sub {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.logout-btn {
  font-size: 24rpx;
  color: #e74c3c;
  padding: 10rpx 18rpx;
  border: 1rpx solid rgba(231, 76, 60, 0.4);
  border-radius: 28rpx;
}

.arrow {
  color: #c4c9d4;
  font-size: 40rpx;
  margin-left: 16rpx;
}

.arrow.small {
  font-size: 32rpx;
}

.sub-card {
  margin-top: 20rpx;
  padding-top: 24rpx;
}

.sub-row {
  display: flex;
  align-items: center;
  padding-bottom: 16rpx;
}

.sub-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sub-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
}

.sub-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.group-header {
  margin: 28rpx 8rpx 12rpx;
  font-size: 24rpx;
  color: #9ca3af;
}

.group-card {
  padding-top: 6rpx;
  padding-bottom: 6rpx;
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
}

.menu-item.with-divider {
  border-top: 1rpx solid #f0f1f5;
}

.menu-text {
  font-size: 28rpx;
  color: #1f2430;
}

.item-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.item-title {
  font-size: 28rpx;
  color: #1f2430;
}

.item-sub {
  margin-top: 2rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.icon-circle {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  margin-right: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  flex-shrink: 0;
}

.icon-circle.plain {
  background: #f2f4fa;
}

.icon-circle.crown {
  background: #fdf3e7;
  font-size: 40rpx;
}

.version {
  display: block;
  text-align: center;
  margin-top: 48rpx;
  font-size: 22rpx;
  color: #b6bcc9;
}
</style>
