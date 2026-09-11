<template>
  <view class="login-page">
    <view class="center-wrap">
      <view class="hero">
        <view class="logo">接单管家</view>
        <view class="slogan">报价、客户、项目，一屏管清</view>
      </view>

      <view class="form-card">
      <view class="field no-mb">
        <text class="label">手机号</text>
        <input
          class="input"
          type="number"
          :maxlength="11"
          v-model="phone"
          placeholder="请输入 11 位手机号"
          placeholder-class="ph"
        />
      </view>

      <view class="field">
        <text class="label">邀请码</text>
        <input
          class="input"
          type="text"
          :maxlength="20"
          v-model="inviteCode"
          placeholder="选填，好友邀请码"
          placeholder-class="ph"
        />
      </view>
      <text v-if="inviteCode" class="invite-tip">检测到邀请码 {{ inviteCode }}，首次注册将自动绑定邀请人（绑定后不可修改）</text>

      <view
        class="btn-primary"
        :class="canSubmit ? 'btn-active' : 'btn-disabled'"
        :hover-class="canSubmit ? 'btn-hover' : 'none'"
        @tap="onLogin"
      >
        <text>{{ store.loggingIn ? '登录中…' : '手机号登录' }}</text>
      </view>

      </view>
    </view>

    <view class="agreement">
      <text>登录即代表同意《用户协议》与《隐私政策》</text>
    </view>

    <view class="bottom-line"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import {
  captureInviteFromOptions,
  getPendingInviteCode,
  clearPendingInviteCode,
  parseInviteCode
} from '@/utils/invite-code'

const store = useUserStore()
const phone = ref('')
const inviteCode = ref('')

const canSubmit = computed(() => /^1\d{10}$/.test(phone.value))

// 模块 A：从落地页 / 分享链接（options.ic）或本机暂存中预填邀请码，手填可覆盖
onLoad((options) => {
  captureInviteFromOptions(options as unknown as Record<string, unknown>)
  const saved = getPendingInviteCode()
  if (saved) inviteCode.value = saved
})

async function onLogin() {
  if (!canSubmit.value) return
  // 邀请码仅首次注册时由服务端绑定，自邀 / 重复绑定由服务端拦截
  const code = parseInviteCode(inviteCode.value) || inviteCode.value.trim().toUpperCase()
  const r = await store.login(phone.value, '', '小程序用户', code)
  if (r) {
    if (code) clearPendingInviteCode()
    uni.showToast({ title: '登录成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #447cfd 0%, #2054e0 33%, #f5f6fa 33.1%);
  padding: 0 48rpx;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  position: relative;
}

.center-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding-top: 252rpx;
}

.hero {
  text-align: center;
  color: #fff;
}

.logo {
  font-size: 56rpx;
  font-weight: 700;
  letter-spacing: 4rpx;
}

.slogan {
  margin-top: 20rpx;
  font-size: 28rpx;
  opacity: 0.85;
}

.form-card {
  margin-top: 94rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx 40rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.08);
}

.field {
  display: flex;
  align-items: center;
  border-bottom: 2rpx solid #eef0f4;
  padding-bottom: 24rpx;
  margin-bottom: 48rpx;
}

.field.no-mb {
  margin-bottom: 24rpx;
}

.invite-tip {
  display: block;
  margin: -24rpx 0 32rpx;
  font-size: 22rpx;
  color: #2e9e5b;
  line-height: 1.6;
}

.label {
  font-size: 30rpx;
  color: #1f2430;
  margin-right: 32rpx;
  font-weight: 500;
}

.input {
  flex: 1;
  height: 80rpx;
  font-size: 30rpx;
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 0 24rpx;
  box-sizing: border-box;
}

.ph {
  color: #9ca3af;
  font-size: 28rpx;
}

.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 92rpx;
  background: #e8ebf0;
  color: #5b6472;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  transition: background-color 0.2s, color 0.2s;
}

.btn-active {
  background: #2b6bff;
  color: #fff;
}

.btn-hover {
  opacity: 0.9;
}

.tips {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  font-size: 24rpx;
  color: #9ca3af;
  text-align: center;
}

.agreement {
  margin-top: 24rpx;
  padding-bottom: 48rpx;
  text-align: center;
  font-size: 24rpx;
  color: #9ca3af;
}

.bottom-line {
  position: absolute;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 6rpx;
  background: #0d99ff;
}
</style>
