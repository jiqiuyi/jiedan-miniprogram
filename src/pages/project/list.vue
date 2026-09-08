<template>
  <view class="page">
    <view class="search-box">
      <input
        v-model="keyword"
        class="search-input"
        placeholder="搜索项目名称 / 客户"
        confirm-type="search"
      />
    </view>

    <scroll-view class="tabs" scroll-x>
      <view
        v-for="t in tabs"
        :key="t.value"
        class="tab-chip"
        :class="{ active: statusTab === t.value }"
        @tap="statusTab = t.value"
      >
        {{ t.label }}
      </view>
    </scroll-view>

    <view v-if="data.loading && !filtered.length" class="empty">加载中...</view>
    <view v-else-if="!filtered.length" class="empty">暂无项目，点右下角新建</view>
    <view v-else class="list">
      <view v-for="p in filtered" :key="String(p.id)" class="card" @tap="goDetail(p.id)">
        <view class="card-main">
          <text class="card-title">{{ p.title || '未命名项目' }}</text>
          <text class="card-sub">{{ customerNameOf(p) }} · {{ statusTextOf(p) }}</text>
          <text class="card-amount">¥{{ formatAmount(p.amount_total) }}</text>
        </view>
        <view class="card-side">
          <view class="more" @tap.stop="showActions(p)">···</view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <view class="fab" @tap="goAdd">＋</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, projectStatusText } from '@/utils/format'
import type { Project, Customer } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const keyword = ref('')
const statusTab = ref(-1)
const tabs = [
  { value: -1, label: '全部' },
  { value: 0, label: '接单' },
  { value: 1, label: '制作中' },
  { value: 2, label: '待收尾款' },
  { value: 3, label: '完结' }
]

function customerNameOf(p: Project): string {
  const c = data.findById(data.customers as unknown as Customer[], Number(p.customer_id ?? 0))
  const name = (c as Customer | undefined)?.name
  return name || '未关联客户'
}

function statusTextOf(p: Project): string {
  return projectStatusText(p.status)
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return (data.projects as Project[]).filter((p) => {
    if (statusTab.value >= 0 && Number(p.status ?? 0) !== statusTab.value) return false
    if (!kw) return true
    return `${p.title || ''} ${customerNameOf(p)}`.toLowerCase().includes(kw)
  })
})

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
})

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(id)}` })
}

function goAdd() {
  uni.navigateTo({ url: '/pages/project/form' })
}

function showActions(p: Project) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/project/form?id=${p.id}` })
      } else if (res.tapIndex === 1) {
        confirmDelete(p)
      }
    }
  })
}

function confirmDelete(p: Project) {
  uni.showModal({
    title: '删除项目',
    content: `确定删除项目"${p.title || ''}"吗？\n其名下全部收款记录将一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      await data.removeProject(Number(p.id))
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
  padding-bottom: 40rpx;
}

.search-box {
  background: #f1f2f7;
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
}

.search-input {
  height: 76rpx;
  font-size: 28rpx;
  color: #1f2430;
}

.tabs {
  white-space: nowrap;
  margin-bottom: 20rpx;
}

.tab-chip {
  display: inline-block;
  padding: 10rpx 28rpx;
  margin-right: 12rpx;
  font-size: 26rpx;
  color: #6b7280;
  background: #fff;
  border-radius: 30rpx;

  &.active {
    color: #fff;
    background: #4a5af0;
    font-weight: 600;
  }
}

.empty {
  padding-top: 160rpx;
  text-align: center;
  color: #9ca3af;
  font-size: 28rpx;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-sub {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.card-amount {
  margin-top: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  color: #4a5af0;
}

.card-side {
  display: flex;
  align-items: center;
}

.more {
  padding: 8rpx 16rpx;
  color: #8a93a6;
  font-size: 32rpx;
  letter-spacing: 2rpx;
}

.chevron {
  font-size: 40rpx;
  color: #c4c9d4;
  margin-left: 4rpx;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 60rpx;
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: #4a5af0;
  color: #fff;
  font-size: 56rpx;
  line-height: 100rpx;
  text-align: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 90, 240, 0.4);
}
</style>
