<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">📮</text>
      <text class="empty-text">登录后即可在线提交反馈，并随时查看处理进度与回复</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 提交反馈 -->
      <view class="card form-card">
        <view class="form-label">反馈类型</view>
        <view class="chip-row">
          <view
            v-for="t in typeOptions"
            :key="t.value"
            class="chip"
            :class="{ active: typeValue === t.value }"
            @tap="typeValue = t.value"
          >
            {{ t.label }}
          </view>
        </view>

        <view class="form-label">反馈内容</view>
        <textarea
          v-model="content"
          class="content-input"
          placeholder="请描述你遇到的问题或建议：在哪个页面、做了什么操作、出现什么现象，越具体越便于我们排查"
          placeholder-class="ph"
          :maxlength="500"
        />
        <view class="count-tip">{{ content.length }}/500</view>

        <view class="form-label">联系方式（选填）</view>
        <input
          v-model="contact"
          class="field-input"
          placeholder="手机号 / 微信号，方便我们回复你"
          placeholder-class="ph"
          :maxlength="100"
        />

        <view class="submit-btn" :class="{ disabled: submitting }" @tap="submit">
          {{ submitting ? '正在提交…' : '提交反馈' }}
        </view>
        <text class="form-tip">在线提交后开发者会尽快查看并回复 · 内容仅用于处理你的反馈</text>
      </view>

      <!-- 我的反馈 -->
      <view class="section-head">
        <text class="section-title">我的反馈</text>
        <text class="refresh-link" @tap="loadMine(true)">刷新</text>
      </view>
      <view v-if="mineLoading" class="card loading-card">
        <text class="loading-text">加载中…</text>
      </view>
      <view v-else-if="mineList.length === 0" class="card empty-mini">
        <text class="empty-text">还没有提交过反馈，提交后这里会实时显示处理进度</text>
      </view>
      <view v-else class="fb-list">
        <view v-for="item in mineList" :key="item.id" class="card fb-card">
          <view class="fb-head">
            <text class="fb-type" :class="'t-' + item.type">{{ typeLabel(item.type) }}</text>
            <text class="fb-status" :class="'s-' + (item.status || 'pending')">{{ statusLabel(item.status) }}</text>
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
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { formatDateTime } from '@/utils/format'
import {
  submitFeedback,
  fetchMyFeedbacks,
  type FeedbackItem,
  type FeedbackTypeKey
} from '@/api/feedback'

const user = useUserStore()

const typeOptions: { value: FeedbackTypeKey; label: string }[] = [
  { value: 'bug', label: 'Bug 反馈' },
  { value: 'suggestion', label: '更新建议' },
  { value: 'other', label: '其他' }
]

const typeValue = ref<FeedbackTypeKey>('suggestion')
const content = ref('')
const contact = ref('')
const submitting = ref(false)

const mineList = ref<FeedbackItem[]>([])
const mineLoading = ref(false)
let mineLoaded = false

onShow(() => {
  if (user.isLoggedIn && !mineLoaded) {
    loadMine(false)
    mineLoaded = true
  }
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function typeLabel(t: unknown): string {
  const s = String(t ?? '')
  if (s === 'bug') return 'Bug 反馈'
  if (s === 'other') return '其他'
  return '更新建议'
}

function statusLabel(s: unknown): string {
  const m: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    ignored: '已忽略'
  }
  return m[String(s ?? 'pending')] || '待处理'
}

async function submit() {
  if (submitting.value) return
  const c = content.value.trim()
  if (!c) {
    uni.showToast({ title: '请先填写反馈内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const res = await submitFeedback({
      type: typeValue.value,
      content: c,
      contact: contact.value.trim()
    })
    if (!res.ok || !res.data) {
      uni.showModal({
        title: '提交失败',
        content: res.error || '网络异常，请稍后重试',
        showCancel: false,
        confirmText: '知道了'
      })
      return
    }
    const id = res.data.feedbackId
    content.value = ''
    contact.value = ''
    await loadMine(false)
    uni.showModal({
      title: '反馈已收到',
      content: `你的反馈（#${id}）已成功提交，我们会尽快查看并回复。`,
      showCancel: false,
      confirmText: '知道了'
    })
  } catch {
    uni.showModal({
      title: '提交失败',
      content: '网络异常，请稍后重试',
      showCancel: false,
      confirmText: '知道了'
    })
  } finally {
    submitting.value = false
  }
}

async function loadMine(manual: boolean) {
  if (!user.isLoggedIn) return
  mineLoading.value = true
  try {
    const res = await fetchMyFeedbacks()
    if (res.ok && res.data) {
      mineList.value = res.data.feedbacks || []
    } else if (manual) {
      uni.showToast({ title: res.error || '刷新失败', icon: 'none' })
    }
  } catch {
    if (manual) uni.showToast({ title: '刷新失败，请稍后重试', icon: 'none' })
  } finally {
    mineLoading.value = false
  }
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

.empty-card {
  margin-top: 80rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 60rpx 40rpx;
}

.empty-icon {
  font-size: 88rpx;
}

.empty-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #8a93a6;
  text-align: center;
  line-height: 1.6;
}

.primary-btn {
  margin-top: 32rpx;
  padding: 20rpx 72rpx;
  border-radius: 44rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
}

.form-card {
  display: flex;
  flex-direction: column;
}

.form-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
  margin: 18rpx 0 12rpx;
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
  min-height: 220rpx;
  box-sizing: border-box;
  background: #f7f8fb;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #1f2430;
  line-height: 1.6;
}

.field-input {
  width: 100%;
  box-sizing: border-box;
  height: 84rpx;
  background: #f7f8fb;
  border-radius: 16rpx;
  padding: 0 20rpx;
  font-size: 28rpx;
  color: #1f2430;
}

.ph {
  color: #b6bcc9;
}

.count-tip {
  align-self: flex-end;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #b6bcc9;
}

.submit-btn {
  margin-top: 26rpx;
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
  margin-top: 16rpx;
  font-size: 22rpx;
  color: #8a93a6;
  text-align: center;
}

.section-head {
  margin: 34rpx 8rpx 14rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
}

.refresh-link {
  font-size: 24rpx;
  color: #4a5af0;
  padding: 8rpx 12rpx;
}

.loading-card {
  padding: 40rpx;
  text-align: center;
}

.loading-text {
  font-size: 26rpx;
  color: #8a93a6;
}

.empty-mini {
  padding: 60rpx 30rpx;
}

.fb-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.fb-card {
  display: flex;
  flex-direction: column;
}

.fb-head {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  row-gap: 8rpx;
}

.fb-type {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #4a5af0;
  background: #edefff;
}

.fb-status {
  margin-left: 12rpx;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.fb-status.s-pending {
  color: #8a6d1a;
  background: #fdf6e3;
}

.fb-status.s-processing {
  color: #b25a00;
  background: #fff1e0;
}

.fb-status.s-resolved {
  color: #0e8a3e;
  background: #e4f7ec;
}

.fb-status.s-ignored {
  color: #8a93a6;
  background: #f0f1f5;
}

.fb-time {
  margin-left: auto;
  font-size: 22rpx;
  color: #b6bcc9;
}

.fb-content {
  margin-top: 16rpx;
  font-size: 28rpx;
  line-height: 1.6;
  color: #1f2430;
  word-break: break-all;
}

.fb-contact {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.fb-reply {
  margin-top: 16rpx;
  padding: 18rpx;
  border-radius: 12rpx;
  background: #e4f7ec;
  border: 1rpx solid rgba(14, 138, 62, 0.25);
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
  margin-left: 12rpx;
  font-size: 22rpx;
  color: #7fa891;
}

.fb-reply-text {
  display: block;
  margin-top: 8rpx;
  font-size: 26rpx;
  line-height: 1.6;
  color: #1f2430;
}
</style>
