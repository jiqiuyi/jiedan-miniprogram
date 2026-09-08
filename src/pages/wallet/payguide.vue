<template>
  <view class="page">
    <view class="guide-card">
      <view class="guide-icon">📲</view>
      <view class="guide-title">付款到账核对</view>
      <text class="guide-desc">
        开启后，当您向收款码完成付款，系统可以在后台自动识别到账信息，更快地为您核实并开通专业版，无需每次等待人工确认。
      </text>
      <text class="guide-desc">
        由于不同支付平台对隐私与通知策略不同，自动识别可能无法覆盖全部场景；若未自动识别到账，请在「收入记录」中手动登记收款，系统核对金额一致后，同样会为您开通。
      </text>
      <view class="guide-note">
        当前版本暂未开放自动识别开关，到账核对请以「收入记录」登记为准；自动识别能力将在后续版本逐步接入。
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
// 付款到账核对说明页（纯文案引导，无操作）
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 60rpx;
}

.guide-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 48rpx 36rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.guide-icon {
  font-size: 72rpx;
  margin-bottom: 20rpx;
}

.guide-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #1f2430;
  margin-bottom: 24rpx;
}

.guide-desc {
  font-size: 26rpx;
  line-height: 1.7;
  color: #4c5566;
  margin-bottom: 18rpx;
  text-align: justify;
}

.guide-note {
  width: 100%;
  margin-top: 12rpx;
  background: #f2f4fa;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  font-size: 24rpx;
  line-height: 1.6;
  color: #8a93a6;
}
</style>
