<template>
  <view class="page">
    <!-- 无权限（等价 App 侧 role != admin 不可见；小程序经 URL 可达，故在此兜底提示） -->
    <view v-if="denied" class="card empty-card">
      <text class="empty-icon">🔒</text>
      <text class="empty-title">仅管理员可访问</text>
      <text class="empty-text">当前账号无权限进入管理后台。若你确实需要管理功能，请使用管理员账号登录后再试。</text>
      <view class="primary-btn" @tap="goBack">返回</view>
    </view>

    <template v-else>
      <view class="head-row">
        <text class="page-title">管理后台</text>
        <text class="refresh-link" @tap="ensureLoad(activeTab)">刷新</text>
      </view>

      <!-- Tab：待确认 / 抽查 / 返现 / 待打款 / 收款配置 / 服务状态 / 操作日志 -->
      <scroll-view class="tab-bar" scroll-x :show-scrollbar="false">
        <view class="tab-inner">
          <view
            v-for="(t, i) in tabs"
            :key="t.key"
            class="tab-item"
            :class="{ active: activeTab === i }"
            @tap="switchTab(i)"
          >
            {{ t.label }}
          </view>
        </view>
      </scroll-view>

      <!-- ==================== 待确认 ==================== -->
      <view v-if="activeTab === 0" class="list-wrap">
        <view v-if="confirming.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else-if="confirming.error" class="card empty-mini">
          <text class="empty-text">{{ confirming.error }}</text>
        </view>
        <view v-else-if="confirming.list.length === 0" class="card empty-mini">
          <text class="empty-text">暂无待确认订单</text>
        </view>
        <view v-else class="list">
          <view v-for="(o, i) in confirming.list" :key="i" class="card list-card">
            <view class="row-head">
              <text class="order-no">订单号 {{ o.orderNo || '-' }}</text>
              <text class="status-tag st-pending">待核实</text>
            </view>
            <view class="row-line">
              <text class="kv-value">金额 ¥{{ formatYuan(o.amount) }} · 用户#{{ o.userId }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 抽查 ==================== -->
      <view v-else-if="activeTab === 1" class="list-wrap">
        <view v-if="spotcheck.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else-if="spotcheck.error" class="card empty-mini">
          <text class="empty-text">{{ spotcheck.error }}</text>
        </view>
        <view v-else-if="spotcheck.list.length === 0" class="card empty-mini">
          <text class="empty-text">暂无抽查单</text>
        </view>
        <view v-else class="list">
          <view v-for="(s, i) in spotcheck.list" :key="i" class="card list-card">
            <view class="row-head">
              <text class="order-no">抽查 #{{ s.id }} · {{ spotOrderAmount(s) }}</text>
            </view>
            <view class="row-line">
              <text class="kv-value">{{ s.reason || '' }}</text>
            </view>
            <view class="row-line">
              <text class="kv-value">上报金额 {{ fmt(s.reportedAmount) }} · 时间 {{ fmt(s.reportedAt) }}</text>
            </view>
            <view class="audit-row">
              <view class="audit-btn approve" @tap="review(s, 'approve')">通过</view>
              <view class="audit-btn reject" @tap="review(s, 'reject')">驳回</view>
            </view>
          </view>
        </view>
      </view>

      <!-- ==================== 返现 ==================== -->
      <view v-else-if="activeTab === 2" class="list-wrap">
        <view v-if="rebate.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <template v-else>
          <view class="card info-card">
            <text class="info-line">累计返现 ¥{{ formatYuan(rebate.totalRebate) }} · 待打款 ¥{{ formatYuan(rebate.totalPayout) }}</text>
          </view>
          <view v-if="rebate.list.length > 0" class="list">
            <view v-for="(d, i) in rebate.list" :key="i" class="card list-card">
              <view class="row-head">
                <text class="order-no">返现 ¥{{ formatYuan(d.rebate) }}</text>
              </view>
              <view class="row-line">
                <text class="kv-value">来自 {{ d.fromNickname || d.fromPhone || '-' }}</text>
              </view>
            </view>
          </view>
        </template>
      </view>

      <!-- ==================== 待打款 ==================== -->
      <view v-else-if="activeTab === 3" class="list-wrap">
        <view v-if="payout.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else-if="payout.list.length === 0" class="card empty-mini">
          <text class="empty-text">暂无可打款返现</text>
        </view>
        <template v-else>
          <view class="card info-card">
            <text class="info-line">待打款合计 ¥{{ formatYuan(payout.total) }}</text>
          </view>
          <view class="list">
            <view v-for="(p, i) in payout.list" :key="i" class="card list-card">
              <view class="row-head">
                <text class="order-no">{{ p.nickname || p.phone || '-' }} · ¥{{ formatYuan(p.rebate) }}</text>
              </view>
              <view class="row-line">
                <text class="kv-value">可提现 ¥{{ formatYuan(p.available) }}</text>
              </view>
            </view>
          </view>
          <view class="foot-note">返现由推广方可随时在钱包提现，此处仅作汇总参考。</view>
        </template>
      </view>

      <!-- ==================== 收款配置 ==================== -->
      <view v-else-if="activeTab === 4" class="list-wrap">
        <view v-if="qrcode.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else class="card form-card">
          <text class="tip-text">收款方式链接（App 端点一下直接拉起对应支付）：</text>
          <text class="field-label">微信收款链接</text>
          <input
            v-model="qrcode.wechat"
            class="field-input"
            placeholder="如 weixin://... 或小程序码链接"
            placeholder-class="ph"
          />
          <text class="field-label">支付宝收款链接</text>
          <input
            v-model="qrcode.alipay"
            class="field-input"
            placeholder="如 alipays://... 或收款页 https://..."
            placeholder-class="ph"
          />
          <text class="tip-sub">留空表示未配置该渠道；未配置的渠道在 App 端会提示联系商家。</text>
          <view class="primary-btn full" @tap="saveQrcode">
            {{ qrcode.saving ? '保存中…' : '保存配置' }}
          </view>
          <view class="outline-btn" @tap="copyQrcode">复制收款码链接</view>
        </view>
      </view>

      <!-- ==================== 服务状态 ==================== -->
      <view v-else-if="activeTab === 5" class="list-wrap">
        <view v-if="listener.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else class="card">
          <view v-for="(it, i) in listenerItems" :key="i" class="kv-row">
            <text class="kv-row-label">{{ it.label }}</text>
            <text class="kv-row-value">{{ it.value }}</text>
          </view>
        </view>
      </view>

      <!-- ==================== 操作日志 ==================== -->
      <view v-else class="list-wrap">
        <view v-if="logs.loading" class="card loading-card">
          <text class="loading-text">加载中…</text>
        </view>
        <view v-else-if="logs.list.length === 0" class="card empty-mini">
          <text class="empty-text">暂无操作日志</text>
        </view>
        <view v-else class="list">
          <view v-for="(l, i) in logs.list" :key="i" class="card list-card">
            <view class="row-head">
              <text class="order-no">{{ l.action || '' }} · 操作人#{{ l.adminId }}</text>
            </view>
            <view class="row-line">
              <text class="kv-value">{{ l.detail || '' }}</text>
            </view>
            <view class="row-line">
              <text class="kv-value dim">{{ logTime(l.at) }}</text>
            </view>
          </view>
        </view>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
/**
 * 管理后台（仅管理员可访问），7 个 Tab 与 App 正本 admin_page.dart 逐项对齐：
 * 待确认 / 抽查 / 返现 / 待打款 / 收款配置 / 服务状态 / 操作日志。
 * 交互等价：SnackBar→uni.showToast、AppEmpty→空态卡片、下拉刷新→切页/刷新按钮重新拉取。
 * 金额字段统一走 formatYuan（元），在此不做金额单位改动。
 */
import { computed, reactive, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { formatYuan, formatDateTime } from '@/utils/format'
import {
  fetchAdminOrders,
  fetchAdminSpotchecks,
  fetchAdminRebates,
  fetchAdminPayouts,
  reviewAdminSpotcheck,
  fetchAdminQrcode,
  saveAdminQrcode,
  fetchAdminListener,
  fetchAdminLogs,
  type AdminOrder,
  type AdminSpotcheck,
  type AdminRebateDetail,
  type AdminPayoutRow,
  type AdminLog
} from '@/api/admin'

const denied = ref(false)
const activeTab = ref(0)

const tabs = [
  { key: 'confirming', label: '待确认' },
  { key: 'spotcheck', label: '抽查' },
  { key: 'rebate', label: '返现' },
  { key: 'payout', label: '待打款' },
  { key: 'qrcode', label: '收款配置' },
  { key: 'listener', label: '服务状态' },
  { key: 'log', label: '操作日志' }
]

const confirming = reactive({ loading: false, error: '', list: [] as AdminOrder[] })
const spotcheck = reactive({ loading: false, error: '', list: [] as AdminSpotcheck[] })
const rebate = reactive({
  loading: false,
  list: [] as AdminRebateDetail[],
  totalRebate: 0,
  totalPayout: 0
})
const payout = reactive({ loading: false, list: [] as AdminPayoutRow[], total: 0 })
const qrcode = reactive({ loading: false, saving: false, wechat: '', alipay: '' })
const listener = reactive({ loading: false, data: {} as Record<string, unknown> })
const logs = reactive({ loading: false, list: [] as AdminLog[] })

/** 401/403 视为无权限，整体切换为「仅管理员可访问」 */
function handleDenied(res: { ok: boolean; statusCode: number }): boolean {
  if (!res.ok && (res.statusCode === 401 || res.statusCode === 403)) {
    denied.value = true
    confirming.loading = false
    spotcheck.loading = false
    rebate.loading = false
    payout.loading = false
    qrcode.loading = false
    listener.loading = false
    logs.loading = false
    return true
  }
  return false
}

function toast(msg: string) {
  uni.showToast({ title: msg, icon: 'none' })
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

/** 与正本 _fmt 一致：时间戳（>1e12）按时间展示，其余按金额展示，空值 '-' */
function fmt(v: unknown): string {
  if (v === null || v === undefined || v === '') return '-'
  if (typeof v === 'number') {
    return v > 1e12 ? formatDateTime(v) : formatYuan(v)
  }
  const n = Number(v)
  if (typeof v === 'string' && Number.isFinite(n) && n > 1e12) return formatDateTime(n)
  return String(v)
}

/** 抽查单标题里的订单金额（正本：order.amount，为空时 '-'） */
function spotOrderAmount(s: AdminSpotcheck): string {
  const order = s.order
  const v = order ? order['amount'] : null
  if (v === null || v === undefined || v === '') return '-'
  return `¥${formatYuan(v as number | string)}`
}

/** 操作日志时间（正本 _time：毫秒时间戳 → YYYY-MM-DD HH:mm） */
function logTime(v: unknown): string {
  if (typeof v !== 'number') return '-'
  return formatDateTime(v)
}

const listenerItems = computed(() => {
  const d = listener.data
  return [
    { label: '今日上报', value: String(d['todayReports'] ?? 0) },
    { label: '今日匹配成功', value: String(d['todayMatched'] ?? 0) },
    { label: '今日进入抽查', value: String(d['todaySpotcheck'] ?? 0) },
    { label: '收码配置', value: d['qrcodeConfigured'] === true ? '已配置' : '未配置' },
    { label: '累计上报', value: String(d['totalReports'] ?? 0) }
  ]
})

async function loadConfirming() {
  confirming.loading = true
  confirming.error = ''
  try {
    const res = await fetchAdminOrders('confirming')
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      confirming.list = res.data.orders || []
    } else {
      confirming.list = []
      confirming.error = res.error || '数据加载失败'
    }
  } catch {
    confirming.list = []
    confirming.error = '网络异常，请稍后重试'
  } finally {
    confirming.loading = false
  }
}

async function loadSpotcheck() {
  spotcheck.loading = true
  spotcheck.error = ''
  try {
    const res = await fetchAdminSpotchecks()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      spotcheck.list = res.data.spotchecks || []
    } else {
      spotcheck.list = []
      spotcheck.error = res.error || '数据加载失败'
    }
  } catch {
    spotcheck.list = []
    spotcheck.error = '网络异常，请稍后重试'
  } finally {
    spotcheck.loading = false
  }
}

async function loadRebate() {
  rebate.loading = true
  try {
    const res = await fetchAdminRebates()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      rebate.list = res.data.details || []
      rebate.totalRebate = num(res.data.totals?.totalRebate)
      rebate.totalPayout = num(res.data.totals?.totalPayout)
    } else {
      rebate.list = []
      rebate.totalRebate = 0
      rebate.totalPayout = 0
      toast(res.error || '数据加载失败')
    }
  } catch {
    rebate.list = []
    rebate.totalRebate = 0
    rebate.totalPayout = 0
    toast('网络异常，请稍后重试')
  } finally {
    rebate.loading = false
  }
}

async function loadPayout() {
  payout.loading = true
  try {
    const res = await fetchAdminPayouts()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      payout.list = res.data.payouts || []
      payout.total = num(res.data.totalRebate)
    } else {
      payout.list = []
      payout.total = 0
      toast(res.error || '数据加载失败')
    }
  } catch {
    payout.list = []
    payout.total = 0
    toast('网络异常，请稍后重试')
  } finally {
    payout.loading = false
  }
}

async function loadQrcode() {
  qrcode.loading = true
  try {
    const res = await fetchAdminQrcode()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      qrcode.wechat = (res.data.wechat ?? '').toString()
      qrcode.alipay = (res.data.alipay ?? '').toString()
    } else {
      toast(res.error || '数据加载失败')
    }
  } catch {
    toast('网络异常，请稍后重试')
  } finally {
    qrcode.loading = false
  }
}

async function loadListener() {
  listener.loading = true
  try {
    const res = await fetchAdminListener()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      listener.data = res.data as Record<string, unknown>
    } else {
      listener.data = { error: res.error || '数据加载失败' }
    }
  } catch {
    listener.data = { error: '网络异常，请稍后重试' }
  } finally {
    listener.loading = false
  }
}

async function loadLogs() {
  logs.loading = true
  try {
    const res = await fetchAdminLogs()
    if (handleDenied(res)) return
    if (res.ok && res.data) {
      logs.list = res.data.logs || []
    } else {
      logs.list = []
      toast(res.error || '数据加载失败')
    }
  } catch {
    logs.list = []
    toast('网络异常，请稍后重试')
  } finally {
    logs.loading = false
  }
}

/** 各 Tab 进入时按需拉取（等价 App 各 Tab 的 initState 加载） */
function ensureLoad(i: number) {
  if (denied.value) return
  if (i === 0) loadConfirming()
  else if (i === 1) loadSpotcheck()
  else if (i === 2) loadRebate()
  else if (i === 3) loadPayout()
  else if (i === 4) loadQrcode()
  else if (i === 5) loadListener()
  else loadLogs()
}

function switchTab(i: number) {
  activeTab.value = i
  ensureLoad(i)
}

async function review(item: AdminSpotcheck, action: 'approve' | 'reject') {
  try {
    const res = await reviewAdminSpotcheck(Number(item.id), action)
    if (handleDenied(res)) return
    if (!res.ok) {
      toast(res.error || '操作失败')
      return
    }
    toast(action === 'approve' ? '已通过' : '已驳回')
    loadSpotcheck()
  } catch {
    toast('网络异常，请稍后重试')
  }
}

async function saveQrcode() {
  if (qrcode.saving) return
  qrcode.saving = true
  try {
    const res = await saveAdminQrcode(qrcode.wechat.trim(), qrcode.alipay.trim())
    if (handleDenied(res)) return
    if (!res.ok) {
      toast(res.error || '保存失败')
      return
    }
    toast('收款方式已更新')
  } catch {
    toast('网络异常，请稍后重试')
  } finally {
    qrcode.saving = false
  }
}

function copyQrcode() {
  const link = qrcode.wechat.trim() || qrcode.alipay.trim()
  if (!link) return
  uni.setClipboardData({
    data: link,
    success: () => toast('已复制到剪贴板')
  })
}

function goBack() {
  uni.navigateBack({
    fail: () => uni.switchTab({ url: '/pages/mine/mine' })
  })
}

onShow(() => {
  ensureLoad(activeTab.value)
})
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

.empty-card {
  margin-top: 90rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 44rpx;
  text-align: center;
}

.empty-icon {
  font-size: 88rpx;
}

.empty-title {
  margin-top: 24rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #1f2430;
}

.empty-text {
  margin-top: 18rpx;
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.empty-mini {
  padding: 50rpx 30rpx;
  text-align: center;
}

.primary-btn {
  margin-top: 32rpx;
  padding: 20rpx 72rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
}

.primary-btn.full {
  display: block;
}

.outline-btn {
  margin-top: 18rpx;
  padding: 18rpx 0;
  border-radius: 44rpx;
  border: 1rpx solid #4a5af0;
  color: #4a5af0;
  font-size: 28rpx;
  font-weight: 600;
  text-align: center;
}

.loading-card {
  margin-top: 60rpx;
  padding: 60rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #8a93a6;
}

.head-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin: 4rpx 8rpx 16rpx;
}

.page-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.refresh-link {
  font-size: 24rpx;
  color: #4a5af0;
  padding: 8rpx 12rpx;
}

.tab-bar {
  margin: 0 0 16rpx;
  background: #eceef6;
  border-radius: 18rpx;
  white-space: nowrap;
}

.tab-inner {
  display: inline-flex;
  padding: 6rpx;
}

.tab-item {
  padding: 14rpx 24rpx;
  font-size: 26rpx;
  color: #5a6273;
  border-radius: 14rpx;
  flex-shrink: 0;
}

.tab-item.active {
  background: #fff;
  color: #1f2430;
  font-weight: 700;
  box-shadow: 0 2rpx 8rpx rgba(31, 36, 48, 0.06);
}

.list-wrap {
  display: flex;
  flex-direction: column;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.list-card {
  display: flex;
  flex-direction: column;
}

.row-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  row-gap: 8rpx;
}

.order-no {
  font-size: 26rpx;
  font-weight: 700;
  color: #1f2430;
  word-break: break-all;
  margin-right: 12rpx;
}

.status-tag {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.status-tag.st-pending {
  color: #b25a00;
  background: #fff1e0;
}

.row-line {
  margin-top: 10rpx;
  display: flex;
  font-size: 25rpx;
}

.kv-value {
  color: #3a4150;
  word-break: break-all;
}

.kv-value.dim {
  color: #8a93a6;
  font-size: 23rpx;
}

.audit-row {
  margin-top: 16rpx;
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
}

.audit-btn {
  padding: 10rpx 32rpx;
  border-radius: 30rpx;
  font-size: 25rpx;
  border: 1rpx solid #dfe2ea;
}

.audit-btn.approve {
  color: #07c160;
  border-color: #07c160;
}

.audit-btn.reject {
  color: #c33b3b;
  border-color: #c33b3b;
}

.info-card {
  margin-bottom: 16rpx;
}

.info-line {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}

.foot-note {
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.form-card {
  display: flex;
  flex-direction: column;
}

.tip-text {
  font-size: 24rpx;
  color: #8a93a6;
}

.tip-sub {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.field-label {
  margin-top: 24rpx;
  margin-bottom: 10rpx;
  font-size: 24rpx;
  color: #5a6273;
}

.field-input {
  height: 80rpx;
  padding: 0 22rpx;
  font-size: 26rpx;
  color: #1f2430;
  background: #f6f7fb;
  border: 1rpx solid #e3e6ef;
  border-radius: 14rpx;
  box-sizing: border-box;
}

.ph {
  color: #b6bcc9;
  font-size: 24rpx;
}

.kv-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 22rpx 4rpx;
  border-bottom: 1rpx solid #f0f1f5;
}

.kv-row:last-child {
  border-bottom: none;
}

.kv-row-label {
  font-size: 26rpx;
  color: #5a6273;
}

.kv-row-value {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
}
</style>
