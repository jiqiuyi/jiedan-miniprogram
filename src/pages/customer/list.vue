<template>
  <view class="page">
    <!-- AppBar 右上角「标签池」动作位（小程序无自定义导航栏，落在内容顶部右对齐） -->
    <view class="top-actions">
      <view class="icon-btn" @tap="goTags">
        <view class="ic ic-24 ic-sell-main"></view>
      </view>
    </view>

    <!-- 搜索（对齐 App TextField：textSub 5% 填充 + AppRadius.sm 圆角 + 无边框 + 前缀搜索图标） -->
    <view class="search-wrap">
      <view class="search-box">
        <view class="ic ic-20 ic-search-main search-icon"></view>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索客户名称 / 联系方式 / 备注"
          placeholder-style="color: #8A93A6"
          confirm-type="search"
        />
      </view>
    </view>

    <!-- 标签筛选条（对齐 App _buildTagFilterBar：全部 + 标签池横向 chips） -->
    <view class="tag-bar">
      <scroll-view class="tag-scroll" scroll-x :show-scrollbar="false">
        <view class="tag-bar-inner">
          <view
            class="filter-chip filter-chip-all"
            :class="{ 'is-all-selected': selectedTagId === null }"
            @tap="selectTag(null)"
          >
            <!-- 对齐 App ChoiceChip 选中态的对勾（选中色为品牌蓝 → 白色对勾） -->
            <view
              v-if="selectedTagId === null"
              class="ic ic-18 ic-check-white filter-check"
            />
            <text>{{ allChipLabel }}</text>
          </view>
          <view
            v-for="t in sortedTags"
            :key="String(t.id)"
            class="filter-chip"
            :style="filterChipStyle(t)"
            @tap="selectTag(nid(t.id))"
          >{{ t.name || '' }}</view>
        </view>
      </scroll-view>
    </view>

    <view v-if="data.loading && !customers.length" class="empty-center">
      <text class="empty-text">加载中...</text>
    </view>
    <!-- 空态（对齐 App _Empty → AppEmpty：图标 + 主文案 + 补充说明） -->
    <view v-else-if="!customers.length" class="empty-center">
      <view class="empty-icon ic ic-40 ic-people-sub"></view>
      <text class="empty-title">还没有客户</text>
      <text class="empty-hint">点右下角 + 新建一个吧</text>
    </view>
    <view v-else-if="!filtered.length" class="empty-center">
      <text class="empty-text">没有匹配的客户</text>
    </view>
    <view v-else class="list">
      <!-- 每项 4px 外距 + Card margin 0（对齐 App Padding(all:4) + Card(margin: zero)） -->
      <view v-for="c in filtered" :key="String(c.id)" class="item">
        <view class="card" @tap="goDetail(c.id)">
          <view class="avatar">{{ avatarText(c) }}</view>
          <view class="card-main">
            <view class="title-row">
              <text class="card-title">{{ c.name || '未命名客户' }}</text>
              <view v-if="c.industry" class="industry-chip">{{ c.industry }}</view>
              <view
                v-for="t in cardTags(c)"
                :key="String(t.id)"
                class="tag-chip"
                :style="tagChipStyle(t)"
              >
                <view class="tag-dot" :style="{ backgroundColor: tagColorCss(t.color) }" />
                <text class="tag-text" :style="{ color: tagColorCss(t.color) }">{{ t.name }}</text>
              </view>
              <text v-if="remainTagCount(c) > 0" class="tag-more">+{{ remainTagCount(c) }}</text>
            </view>
            <text class="card-sub">{{ subtitleOf(c) }}</text>
          </view>
          <!-- Flutter Slidable 等价：··· 唤起 编辑 / 删除 ActionSheet -->
          <view class="more" @tap.stop="showActions(c)">···</view>
        </view>
      </view>
    </view>

    <view class="fab" @tap="goAdd">
      <view class="ic ic-24 ic-add-white"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatDate } from '@/utils/format'
import { alphaColor, num } from '@/utils/quote-helper'
import { tagColorCss } from '@/utils/tag-helper'
import { FREE_CUSTOMER_LIMIT } from '@/utils/config'
import type { Customer, Tag, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const keyword = ref('')
/** 当前筛选标签 id（null = 全部），对齐 App _selectedTagId */
const selectedTagId = ref<number | null>(null)

function nid(v: unknown): number {
  return num(v)
}

/** 标签池（对齐 App getTags：created_at 升序，筛选条顺序一致） */
const sortedTags = computed(() =>
  [...(data.tags as Tag[])].sort(
    (a, b) => num((a as DataRow).created_at) - num((b as DataRow).created_at)
  )
)

/** 客户 → 标签映射（对齐 App tagsByCustomers，列表批量展示不做逐行查询） */
const tagMap = computed<Record<string, Tag[]>>(() => data.tagsByCustomer())

/** 单客户标签（对齐 App getCustomerTags：标签 created_at 升序） */
function tagsOf(c: Customer): Tag[] {
  const list = tagMap.value[String(nid((c as DataRow).id))] || []
  return [...list].sort(
    (a, b) => num((a as DataRow).created_at) - num((b as DataRow).created_at)
  )
}

/** 卡片标签 chip：最多 2 个，超出折叠为 +n（对齐 App _buildCardTagChips） */
function cardTags(c: Customer): Tag[] {
  return tagsOf(c).slice(0, 2)
}

function remainTagCount(c: Customer): number {
  const total = tagsOf(c).length
  return total > 2 ? total - 2 : 0
}

/** 全部客户：对齐 App getCustomers 的 created_at 倒序 */
const customers = computed(() =>
  [...(data.customers as Customer[])].sort(
    (a, b) => num((b as DataRow).created_at) - num((a as DataRow).created_at)
  )
)

/** 搜索 + 标签筛选（对齐 App _filtered：名称 / 联系方式 / 备注 三字段 + 标签命中） */
const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const tagId = selectedTagId.value
  let list = customers.value
  if (kw) {
    list = list.filter((c) => {
      const name = String(c.name || '').toLowerCase()
      const contact = String(c.contact || '').toLowerCase()
      const note = String(c.note || '').toLowerCase()
      return name.includes(kw) || contact.includes(kw) || note.includes(kw)
    })
  }
  if (tagId !== null) {
    list = list.filter((c) => tagsOf(c).some((t) => nid(t.id) === tagId))
  }
  return list
})

/** 全部 chip 文案（对齐 App：已按标签筛选时显示「全部标签」） */
const allChipLabel = computed(() => (selectedTagId.value === null ? '全部' : '全部标签'))

function selectTag(id: number | null) {
  selectedTagId.value = id
}

/** 标签筛选 chip 样式（对齐 App ChoiceChip：选中 18% 同色底 + 同色字，边框始终 40% 同色） */
function filterChipStyle(t: Tag): Record<string, string> {
  const css = tagColorCss(t.color)
  const active = selectedTagId.value === nid(t.id)
  return {
    color: active ? css : '#8A93A6',
    backgroundColor: active ? alphaColor(css, 0.18) : 'transparent',
    borderColor: alphaColor(css, 0.4)
  }
}

/** 卡片标签 chip 样式（对齐 App _TagChip：14% 同色底 + 同色字） */
function tagChipStyle(t: Tag): Record<string, string> {
  return { backgroundColor: alphaColor(tagColorCss(t.color), 0.14) }
}

/** 副标题（对齐 App 列表 subtitle：联系方式 · 所在地 · 最近联系 · 备注，空项剔除） */
function subtitleOf(c: Customer): string {
  const parts: string[] = []
  if (c.contact) parts.push(String(c.contact))
  if (c.location) parts.push(String(c.location))
  const last = num((c as DataRow)['last_contact_at'])
  if (last > 0) parts.push(`最近联系 ${formatDate(last)}`)
  if (c.note) parts.push(String(c.note))
  return parts.join(' · ')
}

function avatarText(c: Customer): string {
  return String(c.name || '客').charAt(0)
}

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
})

function goDetail(id: unknown) {
  uni.navigateTo({ url: `/pages/customer/detail?id=${String(id)}` })
}

/** 标签池管理（对齐 App _openTagManagePage） */
function goTags() {
  uni.navigateTo({ url: '/pages/customer/tags' })
}

/** 免费版额度校验 + 专业版引导（对齐 App _openPaywall(title, desc)） */
function openPaywall(title: string, desc: string) {
  uni.showModal({
    title,
    content: desc,
    confirmText: '去开通',
    cancelText: '暂不',
    success: (res) => {
      if (res.confirm) uni.navigateTo({ url: '/pages/wallet/pro' })
    }
  })
}

function goAdd() {
  // 仅新建校验额度，编辑不校验（对齐 App _addOrEdit：c == null 才判断）
  if (!user.isPro && customers.value.length >= FREE_CUSTOMER_LIMIT) {
    openPaywall(
      `免费版最多管理 ${FREE_CUSTOMER_LIMIT} 个客户`,
      '解锁后无限客户，畅用一个客户的也够了，但多个客户更重要'
    )
    return
  }
  uni.navigateTo({ url: '/pages/customer/form' })
}

function showActions(c: Customer) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) {
        uni.navigateTo({ url: `/pages/customer/form?id=${c.id}` })
      } else if (res.tapIndex === 1) {
        confirmDelete(c)
      }
    }
  })
}

function confirmDelete(c: Customer) {
  uni.showModal({
    title: '删除客户',
    content: `确定删除客户「${c.name || ''}」吗？\n其名下全部项目及收款记录将被一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      await data.removeCustomer(Number(c.id))
    }
  })
}
</script>

<style lang="scss" scoped>
@import '../../styles/icons.scss';

.page {
  min-height: 100vh;
  background: #f6f7fb;
}

/* ---- AppBar 动作位 ---- */
.top-actions {
  display: flex;
  justify-content: flex-end;
  padding: 4rpx 8rpx 0;
}

.icon-btn {
  width: 96rpx;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---- 搜索框（对齐 App Padding.fromLTRB(16, 8, 16, 0)） ---- */
.search-wrap {
  padding: 16rpx 32rpx 0;
}

.search-box {
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(138, 147, 166, 0.05);
}

.search-icon {
  margin-right: 16rpx;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40rpx;
  font-size: 28rpx;
  color: #1b2233;
}

/* ---- 标签筛选条（对齐 App：42 高、左右 16、chip 右距 6、上距 6） ---- */
.tag-bar {
  height: 84rpx;
  margin-top: 8rpx;
}

.tag-scroll {
  width: 100%;
  white-space: nowrap;
}

.tag-bar-inner {
  display: flex;
  align-items: flex-start;
  width: max-content;
  padding: 12rpx 32rpx 0;
}

.filter-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  padding: 0 30rpx;
  margin-right: 12rpx;
  border-radius: 40rpx;
  border: 2rpx solid #c7c5d0;
  background: transparent;
  color: #8a93a6;
  font-size: 24rpx;
  font-weight: 600;
  line-height: 1;
  text-align: center;
}

.filter-check {
  flex-shrink: 0;
  margin-right: 10rpx;
}

.filter-chip-all.is-all-selected {
  background: #4a5af0;
  border-color: #4a5af0;
  color: #fff;
}

/* ---- 空态 ---- */
.empty-center {
  min-height: 60vh;
  padding: 0 64rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  margin-top: 24rpx;
  font-size: 28rpx;
  color: #8a93a6;
}

.empty-hint {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: rgba(138, 147, 166, 0.8);
}

.empty-text {
  font-size: 28rpx;
  color: #8a93a6;
}

/* ---- 列表卡片 ---- */
.list {
  padding: 16rpx 0 160rpx;
}

.item {
  padding: 8rpx;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 28rpx;
  border: 2rpx solid #eceef4;
  padding: 28rpx 32rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 40rpx;
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
  font-size: 28rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 32rpx;
  flex-shrink: 0;
}

.card-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.title-row {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  overflow: hidden;
}

.card-title {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  line-height: 48rpx;
  font-weight: 600;
  color: #1b1b21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.industry-chip {
  margin-left: 12rpx;
  padding: 4rpx 12rpx;
  border-radius: 16rpx;
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
  font-size: 22rpx;
  font-weight: 600;
  flex-shrink: 0;
}

.tag-chip {
  margin-left: 12rpx;
  padding: 6rpx 16rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.tag-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 7rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.tag-text {
  font-size: 22rpx;
  font-weight: 600;
}

.tag-more {
  margin-left: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #8a93a6;
  flex-shrink: 0;
}

.card-sub {
  margin-top: 0;
  min-height: 40rpx;
  line-height: 40rpx;
  font-size: 28rpx;
  color: #46464f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.more {
  flex-shrink: 0;
  padding: 8rpx 8rpx 8rpx 20rpx;
  color: #8a93a6;
  font-size: 32rpx;
  letter-spacing: 2rpx;
}

/* ---- FAB（对齐 App FloatingActionButton：56 尺寸、16 圆角、品牌蓝底白图标） ---- */
.fab {
  position: fixed;
  right: 32rpx;
  bottom: 32rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 32rpx;
  background: #4a5af0;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.22);
  z-index: 90;
}
</style>
