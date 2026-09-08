<template>
  <view class="page">
    <view class="head-tip">
      收款时向客户出示收款码，客户扫码即可付款。图片保存在本机缓存，云端存储将在后续版本接入。
    </view>

    <!-- 微信收款码 -->
    <view class="card code-card">
      <view class="code-head">
        <view class="code-badge wx">微</view>
        <view class="code-main">
          <text class="code-title">微信收款码</text>
          <text class="code-sub">客户扫码后用微信付款</text>
        </view>
        <view v-if="wxPath" class="code-action" hover-class="action-hover" @tap="removeCode('wechat')">移除</view>
      </view>
      <view class="code-body">
        <image v-if="wxPath" class="code-img" :src="wxPath" mode="aspectFit" @tap="preview('wechat')" />
        <view v-else class="code-empty" hover-class="empty-hover" @tap="chooseCode('wechat')">
          <text class="empty-plus">＋</text>
          <text class="empty-text">从相册选择收款码截图</text>
        </view>
      </view>
      <view v-if="wxPath" class="code-repick" @tap="chooseCode('wechat')">更换图片</view>
    </view>

    <!-- 支付宝收款码 -->
    <view class="card code-card">
      <view class="code-head">
        <view class="code-badge ali">支</view>
        <view class="code-main">
          <text class="code-title">支付宝收款码</text>
          <text class="code-sub">客户扫码后用支付宝付款</text>
        </view>
        <view v-if="aliPath" class="code-action" hover-class="action-hover" @tap="removeCode('alipay')">移除</view>
      </view>
      <view class="code-body">
        <image v-if="aliPath" class="code-img" :src="aliPath" mode="aspectFit" @tap="preview('alipay')" />
        <view v-else class="code-empty" hover-class="empty-hover" @tap="chooseCode('alipay')">
          <text class="empty-plus">＋</text>
          <text class="empty-text">从相册选择收款码截图</text>
        </view>
      </view>
      <view v-if="aliPath" class="code-repick" @tap="chooseCode('alipay')">更换图片</view>
    </view>

    <view class="usage card">
      <text class="usage-title">使用说明</text>
      <text class="usage-text">
        1. 先在微信 / 支付宝 App 里打开「收款码」，截图保存到相册；
        2. 点上方卡片从相册选择该截图，即可完成配置；
        3. 收款时向客户出示对应收款码，客户扫码付款即可；
        4. 收款到账后可在「收入记录」中核对登记。
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getPayCodePath, setPayCodePath, type PayCodeKind } from '@/utils/localWallet'

const wxPath = ref('')
const aliPath = ref('')

function refresh() {
  wxPath.value = getPayCodePath('wechat')
  aliPath.value = getPayCodePath('alipay')
}

onShow(() => {
  refresh()
})

function chooseFromAlbum(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0]
        if (f) resolve(f.tempFilePath)
        else reject(new Error('未选择图片'))
      },
      fail: () => reject(new Error('取消选择'))
    })
  })
}

/** 将临时文件转存为本地缓存文件；失败时退回原路径（H5 等环境） */
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

async function chooseCode(kind: PayCodeKind) {
  try {
    const temp = await chooseFromAlbum()
    const saved = await persistPath(temp)
    setPayCodePath(kind, saved)
    refresh()
    uni.showToast({
      title: kind === 'wechat' ? '微信收款码已更新' : '支付宝收款码已更新',
      icon: 'success'
    })
  } catch {
    // 用户取消选择，静默
  }
}

function removeCode(kind: PayCodeKind) {
  const name = kind === 'wechat' ? '微信' : '支付宝'
  uni.showModal({
    title: '移除收款码',
    content: `确定移除已配置的${name}收款码吗？`,
    confirmColor: '#e74c3c',
    success: (res) => {
      if (!res.confirm) return
      setPayCodePath(kind, '')
      refresh()
      uni.showToast({ title: `${name}收款码已移除`, icon: 'none' })
    }
  })
}

function preview(kind: PayCodeKind) {
  const path = kind === 'wechat' ? wxPath.value : aliPath.value
  if (!path) return
  uni.previewImage({ urls: [path], current: path })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.head-tip {
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.6;
  padding: 0 8rpx 16rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.code-card {
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.code-head {
  display: flex;
  align-items: center;
}

.code-badge {
  width: 76rpx;
  height: 76rpx;
  border-radius: 20rpx;
  margin-right: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34rpx;
  font-weight: 600;
  color: #fff;
}

.code-badge.wx {
  background: #07c160;
}

.code-badge.ali {
  background: #1677ff;
}

.code-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.code-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.code-sub {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8a93a6;
}

.code-action {
  font-size: 24rpx;
  color: #e74c3c;
  padding: 8rpx 20rpx;
  border: 1rpx solid rgba(231, 76, 60, 0.4);
  border-radius: 26rpx;
}

.action-hover {
  opacity: 0.6;
}

.code-body {
  margin-top: 24rpx;
  display: flex;
  justify-content: center;
}

.code-img {
  width: 360rpx;
  height: 360rpx;
  border-radius: 16rpx;
  background: #f7f8fb;
}

.code-empty {
  width: 100%;
  height: 240rpx;
  border: 2rpx dashed #d7dbe6;
  border-radius: 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-hover {
  background: #f7f8fb;
}

.empty-plus {
  font-size: 60rpx;
  color: #b6bcc9;
  line-height: 1;
}

.empty-text {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.code-repick {
  margin-top: 16rpx;
  text-align: center;
  font-size: 24rpx;
  color: #4a5af0;
  padding: 12rpx 0 2rpx;
}

.usage {
  padding: 28rpx 28rpx 30rpx;
  display: flex;
  flex-direction: column;
}

.usage-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 14rpx;
}

.usage-text {
  font-size: 24rpx;
  line-height: 1.8;
  color: #4c5566;
  white-space: pre-line;
}
</style>
