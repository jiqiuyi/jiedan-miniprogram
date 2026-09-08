<template>
  <view class="page">
    <!-- 未登录 -->
    <view v-if="!user.isLoggedIn" class="card empty-card">
      <text class="empty-icon">📤</text>
      <text class="empty-text">登录后即可查看并导出本人账号下的全部数据</text>
      <view class="primary-btn" @tap="goLogin">去登录</view>
    </view>

    <template v-else>
      <!-- 我的数据导出 -->
      <view class="card block-card">
        <view class="block-head">
          <text class="block-title">我的数据</text>
          <text class="block-tag">本人账号</text>
        </view>
        <text class="block-desc">
          从云端拉取当前账号下的客户、项目、报价、收款、里程碑、合同等全部业务数据，以文本方式展示，可一键复制保存到本地或发给文件传输助手。
        </text>
        <view class="primary-btn wide" :class="{ disabled: exportingMy }" @tap="loadMy">
          {{ exportingMy ? '拉取中…' : myData ? '重新拉取' : '拉取我的数据' }}
        </view>

        <view v-if="myData" class="json-area">
          <view class="json-head">
            <text class="json-title">数据预览</text>
            <text v-if="myTruncated" class="json-truncate">内容较长，仅预览前 5000 字符</text>
            <text class="json-meta">{{ myRows }} 行数据</text>
          </view>
          <scroll-view scroll-y class="json-scroll">
            <text class="json-text">{{ myPreview }}</text>
          </scroll-view>
          <view class="btn-row">
            <view class="ghost-btn" hover-class="btn-hover" @tap="copyText(myData)">
              复制全部
            </view>
          </view>
        </view>
        <text v-if="myError" class="err-text">{{ myError }}</text>
      </view>

      <!-- 全量备份（管理员） -->
      <view class="card block-card">
        <view class="block-head">
          <text class="block-title">全量备份</text>
          <text class="block-tag warn">仅限管理员</text>
        </view>
        <text class="block-desc">
          管理员可拉取全体用户的经营快照，用于归档备份。备份内容含其他用户的数据，请妥善保管，切勿外泄。
        </text>
        <view class="primary-btn wide ghost-style" :class="{ disabled: exportingAdmin }" @tap="loadAdmin">
          {{ exportingAdmin ? '拉取中…' : adminData ? '重新拉取' : '拉取全量备份' }}
        </view>
        <view v-if="adminData" class="json-area">
          <view class="json-head">
            <text class="json-title">备份预览</text>
            <text class="json-meta">{{ adminPreview.length }} 字符</text>
          </view>
          <scroll-view scroll-y class="json-scroll short">
            <text class="json-text">{{ adminPreview }}</text>
          </scroll-view>
          <view class="btn-row">
            <view class="ghost-btn" hover-class="btn-hover" @tap="copyText(adminData)">复制备份</view>
          </view>
        </view>
        <text v-else-if="adminError" class="err-text">{{ adminError }}</text>
        <text v-else class="block-tip">普通账号访问将提示无权限，不影响上方「我的数据」导出。</text>
      </view>

      <text class="foot-tip">导出数据仅用于备份与迁移参考，请妥善保管；小程序内不会将你的数据用于任何其他用途。</text>
    </template>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'
import { fetchMySyncData, fetchExportAll } from '@/api/export'

type Row = Record<string, unknown>

const user = useUserStore()

const exportingMy = ref(false)
const exportingAdmin = ref(false)
const myData = ref('')
const myError = ref('')
const adminData = ref('')
const adminError = ref('')

onShow(() => {
  if (!user.isLoggedIn) return
  user.fetchMeData()
})

function goLogin() {
  uni.navigateTo({ url: '/pages/login/login' })
}

function countRows(tables: unknown): number {
  if (!tables || typeof tables !== 'object') return 0
  let n = 0
  Object.values(tables as Row).forEach((v) => {
    if (Array.isArray(v)) n += v.length
  })
  return n
}

async function loadMy() {
  if (exportingMy.value) return
  exportingMy.value = true
  myError.value = ''
  try {
    const res = await fetchMySyncData()
    if (!res.ok || !res.data) {
      myError.value = res.error || '拉取失败，请稍后重试'
      return
    }
    const d = res.data
    const payload = {
      exportedAt: new Date().toISOString(),
      uid: d.uid,
      serverTs: d.serverTs,
      tables: d.tables || {}
    }
    myRows.value = countRows(d.tables)
    myData.value = JSON.stringify(payload, null, 2)
  } catch {
    myError.value = '网络异常，请稍后重试'
  } finally {
    exportingMy.value = false
  }
}

async function loadAdmin() {
  if (exportingAdmin.value) return
  exportingAdmin.value = true
  adminError.value = ''
  try {
    const res = await fetchExportAll()
    if (!res.ok || !res.data) {
      adminError.value = res.error || '拉取失败'
      return
    }
    adminData.value = JSON.stringify(res.data, null, 2)
  } catch {
    adminError.value = '网络异常，请稍后重试'
  } finally {
    exportingAdmin.value = false
  }
}

const myRows = ref(0)

const myPreview = computed(() => {
  if (!myData.value) return ''
  return myData.value.slice(0, 5000)
})

const myTruncated = computed(() => myData.value.length > 5000)

const adminPreview = computed(() => {
  if (!adminData.value) return ''
  const s = adminData.value
  return s.length > 20000 ? `${s.slice(0, 20000)}\n…（已截断，请点击复制获取完整备份）` : s
})

function copyText(text: string) {
  if (!text) {
    uni.showToast({ title: '暂无可复制内容', icon: 'none' })
    return
  }
  const max = 400000
  const target = text.length > max ? text.slice(0, max) : text
  uni.setClipboardData({
    data: target,
    success: () => {
      uni.showToast({
        title: text.length > max ? `内容过长，已复制前 ${max} 字符` : '已复制',
        icon: 'none'
      })
    },
    fail: () => {
      uni.showToast({ title: '复制失败，请重试', icon: 'none' })
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

.empty-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #8a93a6;
  line-height: 1.6;
}

.block-card {
  margin-bottom: 18rpx;
  display: flex;
  flex-direction: column;
}

.block-head {
  display: flex;
  align-items: center;
}

.block-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1f2430;
}

.block-tag {
  margin-left: 12rpx;
  font-size: 20rpx;
  padding: 4rpx 14rpx;
  border-radius: 20rpx;
  color: #4a5af0;
  background: #edefff;
}

.block-tag.warn {
  color: #b25a00;
  background: #fff1e0;
}

.block-desc {
  margin-top: 12rpx;
  font-size: 25rpx;
  line-height: 1.65;
  color: #5a6273;
}

.block-tip {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #b6bcc9;
}

.primary-btn {
  margin-top: 22rpx;
  text-align: center;
  padding: 22rpx 0;
  border-radius: 18rpx;
  background: linear-gradient(135deg, #4a5af0 0%, #7b6cf6 100%);
  color: #fff;
  font-size: 29rpx;
  font-weight: 600;
}

.primary-btn.disabled {
  opacity: 0.6;
}

.ghost-style {
  background: linear-gradient(135deg, #5a6273 0%, #8a93a6 100%);
}

.json-area {
  margin-top: 20rpx;
  border: 1rpx solid #e3e6ef;
  border-radius: 16rpx;
  overflow: hidden;
}

.json-head {
  display: flex;
  align-items: center;
  background: #f7f8fb;
  padding: 14rpx 18rpx;
}

.json-title {
  font-size: 24rpx;
  font-weight: 600;
  color: #1f2430;
}

.json-truncate {
  margin-left: 12rpx;
  font-size: 20rpx;
  color: #b25a00;
}

.json-meta {
  margin-left: auto;
  font-size: 20rpx;
  color: #8a93a6;
}

.json-scroll {
  max-height: 440rpx;
  background: #fbfcff;
}

.json-scroll.short {
  max-height: 300rpx;
}

.json-text {
  display: block;
  padding: 16rpx 18rpx;
  font-family: 'Courier New', Consolas, monospace;
  font-size: 20rpx;
  line-height: 1.6;
  color: #3a4150;
  word-break: break-all;
  white-space: pre-wrap;
}

.btn-row {
  display: flex;
  justify-content: flex-end;
  gap: 16rpx;
  padding: 12rpx 16rpx;
  border-top: 1rpx solid #f0f1f5;
}

.ghost-btn {
  padding: 14rpx 40rpx;
  border-radius: 16rpx;
  border: 2rpx solid #4a5af0;
  color: #4a5af0;
  font-size: 26rpx;
  font-weight: 600;
}

.btn-hover {
  opacity: 0.7;
}

.err-text {
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #c33b3b;
}

.foot-tip {
  display: block;
  margin-top: 6rpx;
  text-align: center;
  font-size: 22rpx;
  color: #b6bcc9;
  line-height: 1.6;
}
</style>
