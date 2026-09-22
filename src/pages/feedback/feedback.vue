<template>
  <view class="page">
    <!-- 提交表单（对齐 App feedback_page.dart：反馈类型 / 反馈内容 / 联系方式 / 提交） -->
    <view class="form">
      <view class="label">反馈类型</view>
      <view class="chip-row">
        <view
          v-for="t in TYPE_OPTIONS"
          :key="t.value"
          class="chip"
          :class="{ active: typeValue === t.value }"
          @tap="typeValue = t.value"
        >
          {{ t.label }}
        </view>
      </view>

      <view class="label">反馈内容</view>
      <textarea
        v-model="content"
        class="content-input"
        :maxlength="500"
        :placeholder="contentPlaceholder"
        placeholder-class="ph"
      />
      <view class="count-tip">{{ content.length }}/500</view>

      <view class="label">联系方式（选填）</view>
      <input
        v-model="contact"
        class="field-input"
        placeholder="手机号 / 微信 / 邮箱，方便开发者回复你"
        placeholder-class="ph"
        :maxlength="100"
      />

      <view class="submit-btn" :class="{ disabled: submitting }" @tap="submit">
        {{ submitting ? '提交中…' : '提交反馈' }}
      </view>
      <text class="form-tip">在线提交后开发者实时收到 · 数据仅用于处理你的反馈</text>
    </view>

    <!-- 我的反馈列表（对齐 App MyFeedbackPage：本地反馈箱 + 服务器作者回复合并） -->
    <view class="section-head">
      <text class="section-title">我的反馈</text>
      <text class="refresh-link" @tap="onSyncTap">同步回复</text>
    </view>
    <view v-if="list.length === 0" class="empty-box">
      <text class="empty-text">还没有提交过反馈，下拉可刷新</text>
    </view>
    <view v-else class="fb-list">
      <view v-for="item in list" :key="item.localId" class="fb-card">
        <view class="fb-head">
          <text class="fb-type">{{ typeLabel(item.type) }}</text>
          <text v-if="!item.synced" class="fb-unsynced">未同步</text>
          <text class="fb-time">{{ formatDateTime(item.createdAt) }}</text>
        </view>
        <text class="fb-content">{{ item.content }}</text>
        <text v-if="item.contact" class="fb-contact">联系：{{ item.contact }}</text>
        <view v-if="item.reply" class="fb-reply">
          <view class="fb-reply-head">
            <text class="fb-reply-label">作者回复</text>
            <text v-if="item.repliedAt" class="fb-reply-time">{{ formatDateTime(item.repliedAt) }}</text>
          </view>
          <text class="fb-reply-text">{{ item.reply }}</text>
        </view>
      </view>
    </view>
    <view v-if="syncError" class="offline-tip">当前为本地数据（离线），下拉可重新同步作者回复</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDateTime } from '@/utils/format'
import { storage } from '@/utils/storage'
import {
  CLIENT_BUILD,
  CLIENT_VERSION,
  FEEDBACK_REPORT_KEY,
  LOCAL_FEEDBACK_KEY
} from '@/utils/config'
import {
  submitFeedback,
  fetchMyFeedbacks,
  type FeedbackTypeKey
} from '@/api/feedback'

/** 本机反馈箱记录（对齐 App feedbacks 表语义：本地留档 + 服务器 id / 作者回复合并） */
interface LocalFeedback {
  localId: string
  serverId: number | null
  type: FeedbackTypeKey
  content: string
  contact: string
  createdAt: number
  reply: string
  repliedAt: number | null
  synced: boolean
}

const TYPE_OPTIONS: { value: FeedbackTypeKey; label: string }[] = [
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'suggestion', label: '更新建议' },
  { value: 'other', label: '其他' }
]

const user = useUserStore()
const typeValue = ref<FeedbackTypeKey>('suggestion')
const content = ref('')
const contact = ref('')
const submitting = ref(false)
const list = ref<LocalFeedback[]>([])
const syncError = ref('')

const contentPlaceholder = computed(() =>
  typeValue.value === 'bug'
    ? '请描述遇到的问题：在哪个页面、做了什么操作、出现什么现象'
    : '请描述你的建议：希望新增什么功能、如何改进体验'
)

// ---------------- 本机反馈箱 ----------------

function loadLocal(): LocalFeedback[] {
  const rows = storage.getJson<LocalFeedback[]>(LOCAL_FEEDBACK_KEY) || []
  // 按提交时间倒序（对齐 App getFeedbacks 的 created_at DESC）
  return rows.slice().sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
}

function saveLocal(rows: LocalFeedback[]) {
  storage.setJson(LOCAL_FEEDBACK_KEY, rows)
}

function newLocalId(): string {
  return `fb_${Date.now()}_${Math.floor(Math.random() * 100000)}`
}

function addLocal(row: Omit<LocalFeedback, 'localId'>) {
  const rows = storage.getJson<LocalFeedback[]>(LOCAL_FEEDBACK_KEY) || []
  rows.push({ ...row, localId: newLocalId() })
  saveLocal(rows)
}

function typeLabel(t: FeedbackTypeKey): string {
  const hit = TYPE_OPTIONS.find((o) => o.value === t)
  return hit ? hit.label : '其他'
}

// ---------------- 提交 ----------------

/** 4 项非敏感设备信息（对齐 App DeviceInfoReporter：开关关闭或读取失败时为空串） */
function collectDevicePayload() {
  const empty = {
    deviceModel: '',
    osVersion: '',
    appVersion: '',
    buildNumber: ''
  }
  const saved = storage.getJson<boolean>(FEEDBACK_REPORT_KEY)
  if (saved === false) return empty
  try {
    const info = uni.getSystemInfoSync()
    const model = `${info.brand || ''} ${info.model || ''}`.trim()
    return {
      deviceModel: model,
      osVersion: info.system || '',
      appVersion: CLIENT_VERSION,
      buildNumber: CLIENT_BUILD
    }
  } catch {
    return empty
  }
}

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

async function submit() {
  if (submitting.value) return
  const c = content.value.trim()
  if (!c) {
    uni.showToast({ title: '请先填写反馈内容', icon: 'none' })
    return
  }
  if (!user.isLoggedIn) {
    uni.showModal({
      title: '需要先登录',
      content: '在线反馈需要登录账号后才能提交（便于我们跟踪与回复）。是否前往登录？',
      cancelText: '取消',
      confirmText: '去登录',
      success: (res) => {
        if (res.confirm) goLogin()
      }
    })
    return
  }

  submitting.value = true
  let feedbackId = 0
  let errMsg = ''
  try {
    const res = await submitFeedback({
      type: typeValue.value,
      content: c,
      contact: contact.value.trim(),
      ...collectDevicePayload()
    })
    if (res.ok && res.data) {
      feedbackId = Number(res.data.feedbackId || 0)
    } else {
      errMsg = res.error || '网络异常'
    }
  } catch {
    errMsg = '网络异常'
  }

  // 无论在线提交成功与否，都先在本机反馈箱留档：
  // - 成功：记录服务器 id 以便后续合并作者回复；
  // - 失败：标记为「未同步」，列表提示，下拉刷新可重试同步。
  const ok = !errMsg
  addLocal({
    serverId: ok && feedbackId ? feedbackId : null,
    type: typeValue.value,
    content: c,
    contact: contact.value.trim(),
    createdAt: Date.now(),
    reply: '',
    repliedAt: null,
    synced: ok
  })
  list.value = loadLocal()
  submitting.value = false

  if (!ok) {
    uni.showModal({
      title: '提交失败',
      content: `提交失败，已暂存到本地：${errMsg} 下拉「我的反馈」可重试同步`,
      showCancel: false,
      confirmText: '知道了'
    })
    return
  }

  content.value = ''
  contact.value = ''
  uni.showModal({
    title: '反馈已收到',
    content: `你的反馈（#${feedbackId}）已实时提交到服务器，我们已收到，会尽快查看并回复。`,
    showCancel: false,
    confirmText: '完成'
  })
}

// ---------------- 服务器合并 ----------------

async function syncFromServer() {
  if (!user.isLoggedIn) {
    syncError.value = '云同步回复需登录后使用'
    return
  }
  let err = ''
  try {
    const res = await fetchMyFeedbacks()
    if (res.ok && res.data) {
      const rows = storage.getJson<LocalFeedback[]>(LOCAL_FEEDBACK_KEY) || []
      const items = res.data.feedbacks || []
      items.forEach((it) => {
        const serverId = Number(it.id)
        const typeName = String(it.type || 'suggestion')
        const typeHit = TYPE_OPTIONS.find((o) => o.value === typeName)
        const hit = rows.find((r) => r.serverId === serverId)
        const patch = {
          type: (typeHit ? typeHit.value : 'other') as FeedbackTypeKey,
          content: String(it.content || ''),
          contact: String(it.contact || ''),
          createdAt: Number(it.createdAt || Date.now()),
          reply: String(it.reply || ''),
          repliedAt: it.repliedAt ? Number(it.repliedAt) : null,
          synced: true
        }
        if (hit) {
          Object.assign(hit, patch)
        } else {
          rows.push({ localId: newLocalId(), serverId, ...patch })
        }
      })
      saveLocal(rows)
    } else {
      err = res.error || '同步失败'
    }
  } catch {
    err = '网络异常'
  }
  list.value = loadLocal()
  syncError.value = err
}

function onSyncTap() {
  if (!user.isLoggedIn) {
    uni.showToast({ title: '云同步回复需登录后使用', icon: 'none' })
    return
  }
  void syncFromServer()
}

onShow(() => {
  list.value = loadLocal()
  if (user.isLoggedIn) void syncFromServer()
})

onPullDownRefresh(async () => {
  await syncFromServer()
  uni.stopPullDownRefresh()
})
</script>

<style lang="scss" scoped>
/* 版式对齐 App 正本：表单字段 14pt → 28rpx，提示文案 12pt → 24rpx */
.page {
  padding: 32rpx;
  padding-bottom: 60rpx;
  background: #f6f7fb;
  min-height: 100vh;
  box-sizing: border-box;
}

.label {
  font-size: 28rpx;
  font-weight: 600;
  color: #1f2430;
  margin: 30rpx 0 16rpx;
}

.chip-row {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.chip {
  padding: 12rpx 30rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #5a6273;
  background: #f2f4fa;
}

.chip.active {
  color: #4a5af0;
  background: #edefff;
  font-weight: 600;
}

.content-input {
  width: 100%;
  min-height: 240rpx;
  box-sizing: border-box;
  background: #fff;
  border: 1rpx solid #e3e6ef;
  border-radius: 12rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #1f2430;
  line-height: 1.6;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 84rpx;
  background: #fff;
  border: 1rpx solid #e3e6ef;
  border-radius: 12rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1f2430;
}

.ph {
  color: #b6bcc9;
}

.count-tip {
  margin-top: 8rpx;
  text-align: right;
  font-size: 22rpx;
  color: #b6bcc9;
}

.submit-btn {
  margin-top: 40rpx;
  text-align: center;
  padding: 26rpx 0;
  border-radius: 20rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
}

.submit-btn.disabled {
  opacity: 0.6;
}

.form-tip {
  display: block;
  margin-top: 24rpx;
  text-align: center;
  font-size: 24rpx;
  color: #8a93a6;
}

.section-head {
  margin: 44rpx 0 16rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.refresh-link {
  font-size: 26rpx;
  color: #4a5af0;
  padding: 8rpx 0 8rpx 20rpx;
}

.empty-box {
  padding: 70rpx 30rpx;
  text-align: center;
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.empty-text {
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.fb-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.fb-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.fb-head {
  display: flex;
  align-items: center;
}

.fb-type {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #4a5af0;
  background: #edefff;
}

.fb-unsynced {
  margin-left: 16rpx;
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #b25a00;
  background: #fff1e0;
}

.fb-time {
  margin-left: auto;
  font-size: 22rpx;
  color: #b6bcc9;
}

.fb-content {
  display: block;
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.5;
  color: #1f2430;
  word-break: break-all;
}

.fb-contact {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.fb-reply {
  margin-top: 20rpx;
  padding: 20rpx;
  border-radius: 8rpx;
  background: rgba(14, 138, 62, 0.09);
  border: 1rpx solid rgba(14, 138, 62, 0.35);
}

.fb-reply-head {
  display: flex;
  align-items: center;
}

.fb-reply-label {
  font-size: 24rpx;
  font-weight: 700;
  color: #0e8a3e;
}

.fb-reply-time {
  margin-left: 16rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.fb-reply-text {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  line-height: 1.5;
  color: #1f2430;
}

.offline-tip {
  margin-top: 20rpx;
  padding: 0 8rpx;
  font-size: 24rpx;
  color: #b25a00;
}
</style>
