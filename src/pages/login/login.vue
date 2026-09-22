<template>
  <view class="login-page">
    <view class="center-wrap">
      <view class="hero">
        <view class="logo">接单管家</view>
        <view class="slogan">报价、客户、项目，一屏管清</view>
      </view>

      <view class="form-card">
      <view class="mode-tabs">
        <view
          class="mode-tab"
          :class="mode === 'login' ? 'mode-on' : ''"
          @tap="switchMode('login')"
        >
          <text>登录</text>
        </view>
        <view
          class="mode-tab"
          :class="mode === 'register' ? 'mode-on' : ''"
          @tap="switchMode('register')"
        >
          <text>注册</text>
        </view>
      </view>

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

      <view class="field" :class="mode === 'login' ? 'no-mb' : ''">
        <text class="label">密码</text>
        <input
          class="input"
          type="text"
          password
          :maxlength="72"
          v-model="password"
          placeholder="请输入密码"
          placeholder-class="ph"
        />
      </view>

      <view v-if="mode === 'register'" class="field">
        <text class="label">昵称</text>
        <input
          class="input"
          type="text"
          :maxlength="30"
          v-model="nickname"
          placeholder="必填，2-30 个字符"
          placeholder-class="ph"
        />
      </view>

      <view v-if="mode === 'register'" class="field">
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
      <text v-if="mode === 'register' && inviteCode" class="invite-tip">检测到邀请码 {{ inviteCode }}，首次注册将自动绑定邀请人（绑定后不可修改）</text>
      <text v-else-if="mode === 'login' && inviteCode" class="invite-tip">检测到待绑定邀请码 {{ inviteCode }}，切到注册将自动填入</text>

      <view
        class="btn-primary"
        :class="canSubmit ? 'btn-active' : 'btn-disabled'"
        :hover-class="canSubmit ? 'btn-hover' : 'none'"
        @tap="onSubmit"
      >
        <text>{{ submitText }}</text>
      </view>

      <view class="mode-switch" @tap="switchMode(mode === 'login' ? 'register' : 'login')">
        <text>{{ mode === 'login' ? '还没有账号？立即注册' : '已有账号？返回登录' }}</text>
      </view>

      </view>
    </view>

    <view class="agreement">
      <text>登录或注册即代表同意《用户协议》与《隐私政策》</text>
    </view>

    <view class="bottom-line"></view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import {
  captureInviteFromOptions,
  captureClipboardInviteCode,
  getPendingInviteCode,
  clearPendingInviteCode,
  parseInviteCode
} from '@/utils/invite-code'

const store = useUserStore()

/** 当前模式：login = 登录 / register = 注册（同一页切换） */
const mode = ref<'login' | 'register'>('login')

const phone = ref('')
const password = ref('')
const nickname = ref('')
const inviteCode = ref('')

const phoneOk = computed(() => /^1\d{10}$/.test(phone.value))

/** 登录：手机号 + 密码非空；注册：额外要求密码 ≥6 位、昵称必填 */
const canSubmit = computed(() => {
  if (!phoneOk.value || !password.value) return false
  if (mode.value === 'register') {
    return password.value.length >= 6 && nickname.value.trim().length > 0
  }
  return true
})

const submitText = computed(() => {
  if (store.loggingIn) return mode.value === 'login' ? '登录中…' : '注册中…'
  return mode.value === 'login' ? '登录' : '注册并登录'
})

// 模块 A：从落地页 / 分享链接（options.ic）或本机暂存中预填邀请码，手填可覆盖
onLoad((options) => {
  captureInviteFromOptions(options as unknown as Record<string, unknown>)
  prefillPendingInvite()
})

/** 未登录且本机无暂存邀请码时，从剪贴板识别并暂存（等价 App captureClipboardInviteCode） */
async function captureFromClipboard() {
  if (store.isLoggedIn) return
  const code = await captureClipboardInviteCode()
  if (!code) return
  prefillPendingInvite()
}

onShow(() => {
  captureFromClipboard()
})

/** 按本机暂存预填邀请码并切到注册（用户已手填时不覆盖） */
function prefillPendingInvite() {
  const saved = getPendingInviteCode()
  if (!saved) return
  if (!inviteCode.value.trim()) inviteCode.value = saved
  // 携带好友邀请码进入时，默认切到注册模式
  mode.value = 'register'
}

function switchMode(next: 'login' | 'register') {
  if (store.loggingIn) return
  mode.value = next
}

/** 提交前本地校验（口径与后端 _checkPhone / _checkPassword / _checkText 一致） */
function firstError(): string {
  if (!phoneOk.value) return '请输入 11 位手机号'
  if (!password.value) return '密码不能为空'
  if (password.value.length > 72) return '密码长度不能超过 72 个字符'
  if (mode.value === 'register') {
    if (password.value.length < 6) return '密码至少 6 位'
    if (!nickname.value.trim()) return '昵称不能为空'
    if (nickname.value.trim().length > 30) return '昵称长度不能超过 30 个字符'
    if (inviteCode.value.trim().length > 20) return '邀请码长度不能超过 20 个字符'
  }
  return ''
}

async function onSubmit() {
  if (!canSubmit.value || store.loggingIn) return
  const err = firstError()
  if (err) {
    uni.showToast({ title: err, icon: 'none' })
    return
  }

  if (mode.value === 'login') {
    // 登录：手机号 + 密码（与接单管家 App 同一账号体系）
    const r = await store.login(phone.value, password.value)
    if (r) {
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/index/index' })
      }, 500)
    }
    return
  }

  // 注册：邀请码仅首次注册时由服务端绑定，自邀 / 重复绑定由服务端拦截
  const code = parseInviteCode(inviteCode.value) || inviteCode.value.trim().toUpperCase()
  const r = await store.register(
    phone.value,
    password.value,
    nickname.value.trim(),
    code
  )
  if (r) {
    // 注册成功后清除暂存邀请码；若用户清空过邀请码（视为拒绝绑定）同样清除
    clearPendingInviteCode()
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/index/index' })
    }, 500)
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #447cfd 0%, #2054e0 33%, #f6f7fb 33.1%);
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

.mode-tabs {
  display: flex;
  align-items: center;
  margin-bottom: 48rpx;
}

.mode-tab {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  color: #5b6472;
  padding-bottom: 20rpx;
  border-bottom: 4rpx solid transparent;

  &.mode-on {
    color: #2b6bff;
    font-weight: 600;
    border-bottom-color: #2b6bff;
  }
}

.mode-switch {
  margin-top: 32rpx;
  text-align: center;
  font-size: 26rpx;
  color: #2b6bff;
}

/* ---- 输入框（对齐 App theme.dart inputDecorationTheme：白底 + #E4E7EF 描边 + 圆角） ---- */
.field {
  display: flex;
  align-items: center;
  height: 96rpx;
  background: #ffffff;
  border: 2rpx solid #e4e7ef;
  border-radius: 20rpx;
  padding: 0 28rpx;
  margin-bottom: 28rpx;
  box-sizing: border-box;
}

/* 字段间距统一，不随登录/注册模式变化 */
.field.no-mb {
  margin-bottom: 28rpx;
}

.invite-tip {
  display: block;
  margin: -12rpx 0 28rpx;
  font-size: 22rpx;
  color: #2e9e5b;
  line-height: 1.6;
}

/* 固定宽度：保证「手机号」3 字与「密码」2 字标签下，各输入框左边缘严格对齐 */
.label {
  width: 140rpx;
  flex-shrink: 0;
  font-size: 30rpx;
  color: #1f2430;
  font-weight: 500;
}

.input {
  flex: 1;
  height: 96rpx;
  font-size: 30rpx;
  background: transparent;
  padding: 0;
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
