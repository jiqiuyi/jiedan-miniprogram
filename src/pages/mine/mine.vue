<template>
  <view class="page">
    <!-- ============ 顶部渐变个人卡片（对齐 App settings_page.dart v1.38.0 _ProfileHeader） ============ -->
    <view class="profile" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="profile-nav">
        <text class="profile-title">我的</text>
        <view class="nav-btn" @tap="onCheckUpdate">
          <view class="ic ic-22 ic-sysupdatealt-white"></view>
        </view>
      </view>

      <view class="profile-body">
        <!-- 头像（可自定义；本机保存，不上传） -->
        <view class="avatar-wrap" @tap="openAvatarSheet">
          <view class="avatar-ring">
            <image
              v-if="displayAvatar"
              class="avatar-img"
              :src="displayAvatar"
              mode="aspectFill"
            />
            <view v-else class="avatar-fallback">
              <text v-if="avatarFallback" class="avatar-char">{{ avatarFallback }}</text>
              <view v-else class="ic ic-32 ic-person-white"></view>
            </view>
          </view>
          <view class="avatar-edit">
            <view class="ic ic-13 ic-edit-primary"></view>
          </view>
        </view>

        <view class="profile-main" @tap="onAccountTap">
          <view class="name-row">
            <text class="nickname">{{ nickname }}</text>
            <view class="level-badge">
              <view class="ic ic-12" :class="isPro ? 'ic-verified-white' : 'ic-lock-white'"></view>
              <text class="badge-text">{{ isPro ? '专业版' : '免费版' }}</text>
            </view>
          </view>
          <text class="profile-sub">{{ subtitle }}</text>
          <text class="profile-id">{{ idText }}</text>
        </view>
      </view>

      <!-- 数据概览四列 -->
      <view class="metric-row">
        <view class="metric">
          <text class="metric-value">¥{{ formatAmount(monthIncome) }}</text>
          <text class="metric-label">本月收入</text>
        </view>
        <view class="metric-divider"></view>
        <view class="metric">
          <text class="metric-value">{{ customerCount }}</text>
          <text class="metric-label">客户</text>
        </view>
        <view class="metric-divider"></view>
        <view class="metric">
          <text class="metric-value">{{ projectCount }}</text>
          <text class="metric-label">项目</text>
        </view>
        <view class="metric-divider"></view>
        <view class="metric">
          <text class="metric-value">¥{{ formatAmount(balance) }}</text>
          <text class="metric-label">钱包余额</text>
        </view>
      </view>

    </view>

    <!-- ============ 订阅 / 额度卡 ============ -->
    <view class="card sub-card" @tap="openPro">
      <view class="sub-head">
        <view class="ic ic-26" :class="isPro ? 'ic-verified-accent' : 'ic-lock-warn'"></view>
        <view class="sub-main">
          <text class="sub-title" :style="{ color: isPro ? '#16A085' : '#1B2233' }">
            {{ proTitle }}
          </text>
          <text class="sub-sub">{{ proSub }}</text>
        </view>
        <view class="sub-chip">
          <text class="sub-chip-text">{{ isPro ? '续费' : '升级' }}</text>
        </view>
      </view>
      <view class="sub-bar">
        <view
          class="sub-bar-inner"
          :style="{ width: barPercent, backgroundColor: overLimit ? '#E67E22' : '#4A5AF0' }"
        ></view>
      </view>
      <view class="sub-foot">
        <text class="sub-foot-text">{{ subFootText }}</text>
        <view class="ic ic-24 ic-chevron-sub"></view>
      </view>
    </view>

    <!-- ============ 常用功能宫格 ============ -->
    <view class="card fn-card">
      <text class="fn-title">常用功能</text>
      <view class="fn-grid">
        <view
          v-for="item in funcItems"
          :key="item.label"
          class="fn-item"
          @tap="onFuncTap(item)"
        >
          <view class="fn-icon-box" :style="{ backgroundColor: item.color + '1F' }">
            <view class="ic ic-22" :class="item.icon"></view>
          </view>
          <text class="fn-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- ============ 设置列表 ============ -->
    <view class="card set-card">
      <view class="set-row" @tap="onCheckUpdate">
        <view class="ic ic-24 ic-sysupdate-primary"></view>
        <text class="set-title">检查更新</text>
        <text class="set-trailing">v{{ version }}</text>
        <view class="ic ic-24 ic-chevron-sub"></view>
      </view>
      <view class="set-divider"></view>
      <view class="set-row">
        <view class="ic ic-24 ic-devices-primary"></view>
        <text class="set-title">反馈信息上报</text>
        <view class="set-switch">
          <switch :checked="feedbackReport" color="#4A5AF0" @change="onReportChange" />
        </view>
      </view>
      <view class="set-divider"></view>
      <view class="set-row" @tap="onPrivacy">
        <view class="ic ic-24 ic-privacy-primary"></view>
        <text class="set-title">隐私政策</text>
        <view class="ic ic-24 ic-chevron-sub"></view>
      </view>
      <template v-if="isAdmin">
        <view class="set-divider"></view>
        <view class="set-row" @tap="onAdmin">
          <view class="ic ic-24 ic-admin-primary"></view>
          <view class="set-main">
            <text class="set-title">后台管理</text>
            <text class="set-sub">待确认 / 抽查 / 返现 / 收款配置</text>
          </view>
          <view class="ic ic-24 ic-chevron-sub"></view>
        </view>
        <view class="set-divider"></view>
        <view class="set-row" @tap="onPayNotice">
          <view class="ic ic-24 ic-notify-primary"></view>
          <view class="set-main">
            <text class="set-title">到账监听状态</text>
            <text class="set-sub">仅运维：查看本机通知监听是否生效</text>
          </view>
          <view class="ic ic-24 ic-chevron-sub"></view>
        </view>
      </template>
      <template v-if="user.isLoggedIn">
        <view class="set-divider"></view>
        <view class="set-row" @tap="onLogout">
          <view class="ic ic-24 ic-logout-danger"></view>
          <text class="set-title danger">退出登录</text>
        </view>
      </template>
    </view>

    <text class="version">接单管家 v{{ version }}</text>

    <!-- ============ 更换头像面板（对齐 App _editAvatar ActionSheet） ============ -->
    <view v-if="avatarSheetVisible" class="mask" @tap="closeAvatarSheet">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">更换头像</text>
        <view class="sheet-row" @tap="chooseAvatar">
          <text class="sheet-row-icon">🖼️</text>
          <view class="sheet-row-main">
            <text class="sheet-row-title">从相册选择</text>
            <text class="sheet-row-sub">图片仅保存在本机，不会上传</text>
          </view>
        </view>
        <view v-if="avatarPath" class="sheet-row" @tap="resetAvatar">
          <text class="sheet-row-icon">↺</text>
          <view class="sheet-row-main">
            <text class="sheet-row-title">恢复默认头像</text>
          </view>
        </view>
        <view class="sheet-cancel" @tap="closeAvatarSheet">
          <text class="sheet-cancel-text">取消</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { useDataStore } from '@/store/data'
import { formatAmount, formatDate, maskPhone } from '@/utils/format'
import { storage } from '@/utils/storage'
import { loadRecharges, loadWithdrawals } from '@/utils/localWallet'
import {
  AVATAR_LOCAL_KEY,
  FEEDBACK_REPORT_KEY,
  FREE_CUSTOMER_LIMIT,
  FREE_PROJECT_LIMIT
} from '@/utils/config'

type Row = Record<string, unknown>

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function sameMonth(ms: number): boolean {
  if (!ms) return false
  const d = new Date(ms)
  const now = new Date()
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
}

const user = useUserStore()
const data = useDataStore()

const version = '0.1.0' // 与 src/manifest.json versionName 保持一致

const statusBarHeight = ref(20)
const avatarPath = ref('')
const avatarSheetVisible = ref(false)
const feedbackReport = ref(true)
const balance = ref(0)

// ---------------- 账号信息 ----------------

/** 登录用户扩展字段：后端返回 isPro / proExpireAt（LoginUser 未声明，按未知扩展读取） */
function extUser(): Row {
  const info = user.userInfo as unknown
  return (info ?? {}) as Row
}

const phone = computed(() => user.userInfo?.phone || '')

/** Pro 判定：统一走 user store 的 isPro（兼容 isPro / vip 语义） */
const isPro = computed(() => user.isPro)

/** 后台管理入口仅管理员可见，与 App AppState.isCurrentAdmin（role == admin）一致 */
const isAdmin = computed(() => String(user.me?.user?.role ?? 'user') === 'admin')

const nickname = computed(() => {
  if (!user.isLoggedIn) return '未登录'
  const n = (user.userInfo?.nickname || '').trim()
  return n || (phone.value ? maskPhone(phone.value) : '未登录')
})

const subtitle = computed(() =>
  user.isLoggedIn ? `${maskPhone(phone.value)} · 已登录` : '登录后订阅状态云端长期有效'
)

const idText = computed(() => {
  const id = num(user.userInfo?.id)
  return user.isLoggedIn && id > 0 ? `ID: ${id}` : 'ID: —'
})

const avatarFallback = computed(() => {
  if (!user.isLoggedIn) return ''
  const n = (user.userInfo?.nickname || '').trim()
  const src = n || (phone.value ? maskPhone(phone.value) : '接单管家用户')
  return src.charAt(0)
})

// ---------------- 概览数字 ----------------

const customerCount = computed(() => (user.isLoggedIn ? data.customers.length : 0))
const projectCount = computed(() => (user.isLoggedIn ? data.projects.length : 0))

const monthIncome = computed(() => {
  if (!user.isLoggedIn) return 0
  let sum = 0
  for (const pay of data.payments) {
    const row = pay as Row
    if (sameMonth(num(row['paid_at']))) sum += num(row['amount'])
  }
  return Math.max(0, sum)
})

/** 钱包余额：对齐钱包页口径（收款合计 + 已到账充值 - 提现，下限 0） */
function recomputeBalance() {
  if (!user.isLoggedIn) {
    balance.value = 0
    return
  }
  const totalPaid = data.payments.reduce((s, p) => s + num((p as Row)['amount']), 0)
  const totalRecharged = loadRecharges()
    .filter((r) => r.status === 'done')
    .reduce((s, r) => s + r.amount, 0)
  const totalWithdrawn = loadWithdrawals().reduce((s, w) => s + w.amount, 0)
  balance.value = Math.max(0, totalPaid + totalRecharged - totalWithdrawn)
}

// ---------------- 订阅 / 额度卡 ----------------

const proExpireAt = computed(() => num(extUser()['proExpireAt']))

const proTitle = computed(() => (isPro.value ? '专业版 · 已解锁全部功能' : '免费版'))

const proSub = computed(() => {
  if (isPro.value) {
    if (user.isLoggedIn && proExpireAt.value > 0) {
      return `订阅有效期至 ${formatDate(proExpireAt.value)}`
    }
    return '感谢支持，欢迎持续使用'
  }
  if (!user.isLoggedIn) return '登录后购买订阅，账号内长期有效'
  return `免费版可管理 ${FREE_CUSTOMER_LIMIT} 个客户、${FREE_PROJECT_LIMIT} 个进行中项目`
})

const overLimit = computed(
  () => !isPro.value && customerCount.value >= FREE_CUSTOMER_LIMIT
)

const barPercent = computed(() => {
  if (isPro.value) return '100%'
  const ratio = Math.min(1, Math.max(0, customerCount.value / FREE_CUSTOMER_LIMIT))
  return `${Math.round(ratio * 100)}%`
})

const subFootText = computed(() => {
  if (isPro.value) return '订阅权益已全部生效'
  return `客户额度 ${customerCount.value}/${FREE_CUSTOMER_LIMIT} · 项目额度 ${projectCount.value}/${FREE_PROJECT_LIMIT}`
})

// ---------------- 常用功能宫格 ----------------

interface FuncItem {
  /** icons.scss 中的图标类名（与 App 正本 Icons.* 一一对应） */
  icon: string
  color: string
  label: string
  route?: string
  toast?: string
}

const funcItems: FuncItem[] = [
  { icon: 'ic-wallet-primary', color: '#4A5AF0', label: '钱包', route: '/pages/wallet/wallet' },
  { icon: 'ic-qr-accent', color: '#16A085', label: '收款设置', route: '/pages/wallet/paycodes' },
  { icon: 'ic-chart-warn', color: '#E67E22', label: '收入统计', route: '/pages/income/stats' },
  { icon: 'ic-rule-purple', color: '#7C5CF0', label: '对账汇总', route: '/pages/income/reconciliation' },
  { icon: 'ic-gift-pink', color: '#E8437A', label: '推广活动', route: '/pages/wallet/invite' },
  { icon: 'ic-manage-success', color: '#27AE60', label: '数据管理', route: '/pages/data/export' },
  { icon: 'ic-cloud-blue', color: '#2F80ED', label: '数据存储', toast: '小程序数据自动云端同步' },
  { icon: 'ic-feedback-sub', color: '#8A93A6', label: '意见反馈', route: '/pages/feedback/feedback' }
]

function onFuncTap(item: FuncItem) {
  if (item.route) {
    uni.navigateTo({ url: item.route })
    return
  }
  if (item.toast) {
    uni.showToast({ title: item.toast, icon: 'none' })
    return
  }
  uni.showToast({ title: '后续版本开放', icon: 'none' })
}

// ---------------- 头像（本机保存） ----------------

function loadAvatar() {
  const saved = storage.getJson<string>(AVATAR_LOCAL_KEY)
  avatarPath.value = typeof saved === 'string' ? saved : ''
}

/** 展示优先级：本机自定义头像 > 账号头像 user.userInfo.avatar > 昵称/手机号首字 */
const remoteAvatar = computed(() => String(extUser()['avatar'] ?? ''))
const displayAvatar = computed(() => avatarPath.value || remoteAvatar.value)

function openAvatarSheet() {
  avatarSheetVisible.value = true
}

function closeAvatarSheet() {
  avatarSheetVisible.value = false
}

function saveAvatarPath(path: string) {
  avatarPath.value = path
  storage.setJson(AVATAR_LOCAL_KEY, path)
  uni.showToast({ title: '头像已更新', icon: 'none' })
}

/** 选图后压缩（平台不支持时原样返回） */
function compressImage(src: string): Promise<string> {
  const api = uni as unknown as {
    compressImage?: (opts: {
      src: string
      quality?: number
      success: (r: { tempFilePath: string }) => void
      fail: () => void
    }) => void
  }
  return new Promise((resolve) => {
    if (!api.compressImage) {
      resolve(src)
      return
    }
    try {
      api.compressImage({
        src,
        quality: 80,
        success: (r) => resolve(r.tempFilePath || src),
        fail: () => resolve(src)
      })
    } catch {
      resolve(src)
    }
  })
}

/** 转存为本地永久路径（H5 等环境失败时退回原路径） */
function persistPath(tempPath: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      const fs = uni.getFileSystemManager()
      fs.saveFile({
        tempFilePath: tempPath,
        success: (r) => resolve(r.savedFilePath),
        fail: () => resolve(tempPath)
      })
    } catch {
      resolve(tempPath)
    }
  })
}

function chooseAvatar() {
  avatarSheetVisible.value = false
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album'],
    success: (res) => {
      const f = res.tempFiles && res.tempFiles[0]
      const temp = f ? f.tempFilePath : ''
      if (!temp) {
        uni.showToast({ title: '选择头像失败，请重试', icon: 'none' })
        return
      }
      void compressImage(temp)
        .then((compressed) => persistPath(compressed))
        .then((saved) => saveAvatarPath(saved))
    },
    fail: () => {
      // 用户取消选择，静默
    }
  })
}

function resetAvatar() {
  avatarSheetVisible.value = false
  storage.remove(AVATAR_LOCAL_KEY)
  avatarPath.value = ''
  uni.showToast({ title: '已恢复默认头像', icon: 'none' })
}

// ---------------- 设置项 ----------------

function loadFeedbackReport() {
  const saved = storage.getJson<boolean>(FEEDBACK_REPORT_KEY)
  feedbackReport.value = saved === null ? true : !!saved
}

function onReportChange(e: Event) {
  const detail = (e as unknown as { detail?: { value?: boolean } }).detail
  feedbackReport.value = !!detail?.value
  storage.setJson(FEEDBACK_REPORT_KEY, feedbackReport.value)
}

function onCheckUpdate() {
  uni.showModal({
    title: '检查更新',
    content: `接单管家 v${version}（小程序版）`,
    showCancel: false
  })
}

function onPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function onAdmin() {
  uni.navigateTo({ url: '/pages/admin/admin' })
}

/** 到账监听状态（仅管理员）：对齐 App PayNoticeGuidePage */
function onPayNotice() {
  uni.navigateTo({ url: '/pages/wallet/payguide' })
}

function onAccountTap() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
  }
}

function openPro() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: '/pages/wallet/pro' })
}

function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后本地数据仍会保留，下次登录同一账号即可继续使用。',
    cancelText: '取消',
    confirmText: '退出',
    success: (res) => {
      if (!res.confirm) return
      user.logout()
    }
  })
}

onLoad(() => {
  const info = uni.getSystemInfoSync()
  statusBarHeight.value = info.statusBarHeight || 20
})

// 回到本页时刷新头像 / 本机偏好 / 订阅状态 / 概览数字
onShow(() => {
  loadAvatar()
  loadFeedbackReport()
  if (!user.isLoggedIn) {
    balance.value = 0
    return
  }
  void user.fetchMeData()
  void data.refresh()
  recomputeBalance()
})
</script>

<style lang="scss" scoped>
@import '../../styles/icons.scss';

.page {
  min-height: 100vh;
  background: #f6f7fb;
  padding-bottom: 60rpx;
}

/* ============ 顶部渐变个人卡片 ============ */
.profile {
  background: linear-gradient(135deg, #4a5af0 0%, #7c5cf0 100%);
  border-radius: 0 0 40rpx 40rpx;
  padding-left: 36rpx;
  padding-right: 36rpx;
  padding-bottom: 40rpx;
}

.profile-nav {
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.profile-title {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}

.profile-body {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}

.avatar-wrap {
  position: relative;
  width: 152rpx;
  height: 152rpx;
  margin-right: 28rpx;
  flex-shrink: 0;
}

.avatar-ring {
  width: 140rpx;
  height: 140rpx;
  border-radius: 50%;
  padding: 4rpx;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.55);
  overflow: hidden;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  display: block;
}

.avatar-fallback {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #6c7bf5;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-char {
  color: #fff;
  font-size: 52rpx;
  font-weight: 700;
}

.avatar-icon {
  font-size: 52rpx;
}

.avatar-edit {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.18);
}

.avatar-edit-icon {
  color: #4a5af0;
  font-size: 26rpx;
}

.profile-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.name-row {
  display: flex;
  align-items: center;
}

.nickname {
  color: #fff;
  font-size: 38rpx;
  font-weight: 700;
  max-width: 320rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.level-badge {
  margin-left: 16rpx;
  padding: 6rpx 16rpx;
  border-radius: 40rpx;
  background: rgba(255, 255, 255, 0.22);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.badge-icon {
  color: #fff;
  font-size: 20rpx;
  margin-right: 6rpx;
}

.badge-text {
  color: #fff;
  font-size: 22rpx;
  font-weight: 600;
}

.profile-sub {
  margin-top: 12rpx;
  color: rgba(255, 255, 255, 0.82);
  font-size: 24rpx;
}

.profile-id {
  margin-top: 6rpx;
  color: rgba(255, 255, 255, 0.62);
  font-size: 22rpx;
}

.metric-row {
  margin-top: 36rpx;
  display: flex;
  align-items: center;
}

.metric {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.metric-value {
  color: #fff;
  font-size: 36rpx;
  font-weight: 700;
}

.metric-label {
  margin-top: 8rpx;
  color: rgba(255, 255, 255, 0.75);
  font-size: 22rpx;
}

.metric-divider {
  width: 1rpx;
  height: 52rpx;
  background: rgba(255, 255, 255, 0.25);
}

/* 数据概览四列（App 正本为渐变卡内数值格，无入口、无角标） */

/* ============ 通用卡片（对齐 App CardTheme：白底 + 1px #ECEEF4 描边 + 圆角 14pt，无投影） ============ */
.card {
  background: #fff;
  border-radius: 28rpx;
  border: 2rpx solid #eceef4;
  margin: 12rpx 32rpx 0;
}

.nav-btn {
  margin-left: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8rpx 0 8rpx 16rpx;
}

/* ============ 订阅 / 额度卡 ============ */
.sub-card {
  padding: 32rpx;
}

.sub-head {
  display: flex;
  align-items: center;
}

.sub-head > .ic {
  margin-right: 24rpx;
}

.sub-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sub-title {
  font-size: 30rpx;
  font-weight: 700;
}

.sub-sub {
  margin-top: 8rpx;
  color: #8a93a6;
  font-size: 24rpx;
}

.sub-chip {
  padding: 12rpx 24rpx;
  border-radius: 40rpx;
  background: rgba(74, 90, 240, 0.1);
  flex-shrink: 0;
}

.sub-chip-text {
  color: #4a5af0;
  font-size: 26rpx;
  font-weight: 600;
}

.sub-bar {
  margin-top: 28rpx;
  height: 12rpx;
  border-radius: 8rpx;
  background: #eff2f8;
  overflow: hidden;
}

.sub-bar-inner {
  height: 100%;
  border-radius: 8rpx;
}

.sub-foot {
  margin-top: 16rpx;
  display: flex;
  align-items: center;
}

.sub-foot-text {
  flex: 1;
  color: #8a93a6;
  font-size: 22rpx;
}

/* ============ 常用功能宫格 ============ */
.fn-card {
  padding: 32rpx 16rpx 12rpx;
}

.fn-title {
  display: block;
  padding: 0 16rpx;
  color: #1b2233;
  font-size: 30rpx;
  font-weight: 700;
}

.fn-grid {
  margin-top: 20rpx;
  display: flex;
  flex-wrap: wrap;
}

.fn-item {
  width: 25%;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 0 20rpx;
}

.fn-icon-box {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.fn-icon {
  font-size: 40rpx;
}

.fn-label {
  margin-top: 14rpx;
  color: #1b2233;
  font-size: 24rpx;
}

/* ============ 设置列表 ============ */
.set-card {
  padding: 0 32rpx;
}

.set-row {
  display: flex;
  align-items: center;
  padding: 28rpx 0;
}

.set-icon {
  width: 48rpx;
  color: #4a5af0;
  font-size: 34rpx;
}

.set-title {
  flex: 1;
  min-width: 0;
  color: #1b2233;
  font-size: 30rpx;
}

.set-title.danger {
  color: #e74c3c;
  font-weight: 600;
}

.set-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.set-sub {
  margin-top: 4rpx;
  color: #8a93a6;
  font-size: 24rpx;
}

.set-trailing {
  color: #8a93a6;
  font-size: 24rpx;
  margin-right: 8rpx;
}

.set-switch {
  transform: scale(0.85);
}

.set-divider {
  height: 1rpx;
  background: #e3e7f0;
}

.chevron {
  color: #8a93a6;
  font-size: 36rpx;
}

.version {
  display: block;
  text-align: center;
  margin: 32rpx 0 40rpx;
  color: #8a93a6;
  font-size: 24rpx;
}

/* ============ 更换头像面板 ============ */
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 18, 26, 0.45);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  background: #fff;
  border-radius: 40rpx 40rpx 0 0;
  padding: 32rpx 32rpx 40rpx;
  box-sizing: border-box;
}

.sheet-title {
  display: block;
  text-align: center;
  color: #1b2233;
  font-size: 30rpx;
  font-weight: 700;
  margin-bottom: 16rpx;
}

.sheet-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
}

.sheet-row-icon {
  width: 56rpx;
  font-size: 34rpx;
}

.sheet-row-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.sheet-row-title {
  color: #1b2233;
  font-size: 30rpx;
}

.sheet-row-sub {
  margin-top: 4rpx;
  color: #8a93a6;
  font-size: 24rpx;
}

.sheet-cancel {
  margin-top: 16rpx;
  padding: 24rpx 0;
  text-align: center;
  border-radius: 40rpx;
  background: #f2f4fa;
}

.sheet-cancel-text {
  color: #8a93a6;
  font-size: 30rpx;
}
</style>
