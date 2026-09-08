<template>
  <view class="login-page">
    <view class="center-wrap">
      <view class="hero">
        <view class="logo">接单管家</view>
        <view class="slogan">报价、客户、项目，一屏管清</view>
      </view>

      <view class="form-card">
      <view class="field">
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
import { useUserStore } from '@/store/user'

const store = useUserStore()
const phone = ref('')

const canSubmit = computed(() => /^1\d{10}$/.test(phone.value))

async function onLogin() {
  if (!canSubmit.value) return
  const r = await store.login(phone.value, '', '小程序用户')
  if (r) {
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
