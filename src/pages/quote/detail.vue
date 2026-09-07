<template>
  <view class="page">
    <view v-if="loading" class="empty">加载中...</view>

    <block v-else-if="quote">
      <view class="quote-head">
        <view class="head-title">{{ quote.title || '未命名报价' }}</view>
        <view class="head-amount">
          <text class="amount-symbol">¥</text>
          <text class="amount-num">{{ formatAmount(quote.total) }}</text>
        </view>
        <view class="head-sub">共 {{ lineItems.length }} 项 · {{ taxText }}</view>
      </view>

      <view class="card info-card">
        <view class="info-row">
          <text class="info-label">客户</text>
          <text class="info-value">{{ customerName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">关联项目</text>
          <text class="info-value">{{ projectName }}</text>
        </view>
        <view class="info-row">
          <text class="info-label">创建时间</text>
          <text class="info-value">{{ formatDateTime(quote.create_time) }}</text>
        </view>
        <view class="info-row" v-if="quote.remark">
          <text class="info-label">备注</text>
          <text class="info-value">{{ quote.remark }}</text>
        </view>
      </view>

      <view class="card items-card" v-if="lineItems.length">
        <view class="card-title">报价明细</view>
        <view v-for="(item, i) in lineItems" :key="i" class="item-row">
          <view class="item-info">
            <text class="item-name">{{ item.name || item.title || `条目 ${i + 1}` }}</text>
            <text class="item-desc">{{ item.spec || item.desc || '' }}</text>
          </view>
          <view class="item-right">
            <text class="item-price">¥{{ formatAmount(item.price ?? item.amount) }}</text>
            <text class="item-qty" v-if="item.qty">×{{ item.qty }}</text>
          </view>
        </view>
      </view>

      <button class="share-btn" open-type="share">分享给客户</button>
    </block>

    <view v-else class="empty">报价不存在或已被删除</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad, onShow, onShareAppMessage } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDateTime } from '@/utils/format'
import type { QuoteItem } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()
const id = ref<number>(0)
const loading = ref(true)

const quote = computed(() => data.findById(data.quotes, id.value))
const customer = computed(() =>
  quote.value?.customer_id != null
    ? data.findById(data.customers, quote.value.customer_id)
    : undefined
)
const project = computed(() =>
  quote.value?.project_id != null
    ? data.findById(data.projects, quote.value.project_id)
    : undefined
)

const customerName = computed(() => customer.value?.name || '未关联客户')
const projectName = computed(() => project.value?.title || '未关联项目')
const taxText = computed(() => (Number(quote.value?.tax_rate ?? 0) > 0 ? '含税' : '不含税'))

// 明细行：优先 items 字段；否则回退单行（用报价单本身信息兜底）
const lineItems = computed<QuoteItem[]>(() => {
  const items = quote.value?.items
  if (Array.isArray(items) && items.length) return items
  if (quote.value) {
    return [{ name: quote.value.title || '报价项', price: quote.value.total }]
  }
  return []
})

onLoad((opt) => {
  id.value = Number(opt?.id || 0)
})

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  loading.value = false
})

// 分享回调：展示报价摘要，客户打开走单独分享落地页
onShareAppMessage(() => {
  const q = quote.value
  return {
    title: `${q?.title || '报价单'} - ${formatAmount(q?.total)}`,
    path: `/pages/quote/detail?id=${id.value}&share=1`,
    imageUrl: '/static/share-default.png'
  }
})
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.empty {
  padding-top: 200rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
}

.quote-head {
  background: linear-gradient(135deg, #2b6bff, #5b8dff);
  border-radius: 24rpx;
  padding: 40rpx;
  color: #fff;
  margin-bottom: 24rpx;
}

.head-title {
  font-size: 36rpx;
  font-weight: 700;
}

.head-amount {
  margin-top: 20rpx;
  display: flex;
  align-items: baseline;
}

.amount-symbol {
  font-size: 32rpx;
}

.amount-num {
  font-size: 60rpx;
  font-weight: 700;
}

.head-sub {
  margin-top: 12rpx;
  font-size: 24rpx;
  opacity: 0.85;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
  margin-bottom: 24rpx;
}

.info-row {
  display: flex;
  padding: 16rpx 0;
  border-bottom: 2rpx solid #f5f6fa;

  &:last-child {
    border-bottom: none;
  }
}

.info-label {
  width: 160rpx;
  font-size: 26rpx;
  color: #6b7280;
}

.info-value {
  flex: 1;
  font-size: 26rpx;
  color: #1f2430;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.item-row {
  display: flex;
  justify-content: space-between;
  padding: 18rpx 0;
  border-bottom: 2rpx solid #f5f6fa;

  &:last-child {
    border-bottom: none;
  }
}

.item-name {
  font-size: 28rpx;
  color: #1f2430;
}

.item-desc {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.item-right {
  text-align: right;
}

.item-price {
  font-size: 28rpx;
  color: #1f2430;
  font-weight: 600;
}

.item-qty {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #9ca3af;
}

.share-btn {
  margin-top: 12rpx;
  height: 92rpx;
  line-height: 92rpx;
  background: #2b6bff;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
}
</style>
