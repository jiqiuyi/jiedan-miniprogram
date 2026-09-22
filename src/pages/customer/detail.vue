<template>
  <view class="page">
    <template v-if="customer">
      <!-- 头部：客户名 + 操作（App 用 AppBar 标题，小程序保留编辑/删除入口） -->
      <view class="head card">
        <view class="head-main">
          <text class="head-name">{{ customer.name || '未命名客户' }}</text>
          <text class="head-sub">{{ subtitle }}</text>
        </view>
        <view class="head-actions">
          <text class="action" @tap="goEdit">编辑</text>
          <text class="action danger" @tap="confirmDelete">删除</text>
        </view>
      </view>

      <!-- 档案字段（对齐 App 详情页 _infoRow：行业/客户来源/所在地/联系方式/最近联系/备注） -->
      <view class="card info-card">
        <view v-for="row in infoRows" :key="row.label" class="info-row">
          <text class="info-label">{{ row.label }}</text>
          <text class="info-value">{{ row.value }}</text>
        </view>
      </view>

      <!-- 标签卡（对齐 App _buildTagCard） -->
      <view class="card tag-card">
        <view class="tag-card-head">
          <text class="tag-card-title">标签</text>
          <text class="tag-manage" @tap="openTagSheet">管理</text>
        </view>
        <text v-if="!tags.length" class="tag-empty">未打标签</text>
        <view v-else class="tag-wrap">
          <view v-for="t in tags" :key="String(t.id)" class="tag-chip" :style="tagChipStyle(t)">
            <view class="tag-dot" :style="{ backgroundColor: tagColorCss(t.color) }" />
            <text class="tag-text" :style="{ color: tagColorCss(t.color) }">{{ t.name }}</text>
          </view>
        </view>
      </view>

      <!-- 统计卡（对齐 App _statCard：项目数 / 累计收款） -->
      <view class="stat-row">
        <view class="card stat-card">
          <text class="stat-title">项目数</text>
          <text class="stat-value primary">{{ projectsOf.length }}</text>
        </view>
        <view class="card stat-card">
          <text class="stat-title">累计收款</text>
          <text class="stat-value green">¥{{ formatAmount(paidTotal) }}</text>
        </view>
      </view>

      <!-- 名下项目（对齐 App：标题 + 约定金额 + 状态标签；点击进入项目详情） -->
      <view class="section-head">
        <text class="section-title">名下项目（{{ projectsOf.length }}）</text>
      </view>
      <view v-if="!projectsOf.length" class="empty card">暂无项目</view>
      <view v-else class="list">
        <view v-for="p in projectsOf" :key="String(p.id)" class="card project" @tap="goProject(p.id)">
          <view class="card-main">
            <text class="card-title">{{ p.title || '未命名项目' }}</text>
            <text class="card-sub">约定金额 ¥{{ formatAmount(p.amount_total) }}</text>
          </view>
          <text class="status-chip">{{ projectStatusText(p.status) }}</text>
        </view>
      </view>

      <!-- 标签管理弹层（对齐 App _editTags：多选即时保存 + 新建标签） -->
      <view v-if="showTagSheet" class="sheet-mask" @tap="closeTagSheet">
        <view class="sheet" @tap.stop>
          <view class="sheet-head">
            <text class="sheet-title">标签管理</text>
            <text class="sheet-count">已选 {{ selectedTagIds.length }}</text>
          </view>
          <text class="sheet-sub">选择标签为「{{ customer.name || '未命名客户' }}」打标，可多选</text>
          <scroll-view scroll-y class="sheet-body">
            <view class="tag-wrap">
              <view
                v-for="t in data.tags"
                :key="String(t.id)"
                class="tag-pick"
                :style="pickStyle(t)"
                @tap="toggleTag(t)"
              >
                <text v-if="isSelected(t)" class="tag-check">✓</text>
                <text class="tag-pick-text">{{ t.name }}</text>
              </view>
              <view class="tag-pick new" @tap="toggleNewTag">
                <text class="tag-pick-text">＋ 新建标签</text>
              </view>
              <view class="tag-pick manage" @tap="goTags">
                <text class="tag-pick-text">标签池管理</text>
              </view>
            </view>

            <view v-if="showNewTag" class="new-tag">
              <input
                v-model="newTagName"
                class="new-tag-input"
                type="text"
                :maxlength="TAG_NAME_MAX"
                placeholder="标签名称（最多 8 字）"
                placeholder-class="ph"
              />
              <view class="palette">
                <view
                  v-for="c in TAG_PALETTE"
                  :key="String(c)"
                  class="swatch"
                  :class="{ 'is-on': newTagColor === c }"
                  :style="{ backgroundColor: tagColorCss(c) }"
                  @tap="newTagColor = c"
                />
              </view>
              <view class="new-tag-actions">
                <view class="btn ghost" @tap="cancelNewTag">取消</view>
                <view class="btn solid" @tap="submitNewTag">创建</view>
              </view>
            </view>
          </scroll-view>
          <view class="btn solid sheet-done" @tap="closeTagSheet">完成</view>
        </view>
      </view>
    </template>
    <view v-else-if="!loading" class="empty card">客户不存在或已删除</view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate, projectStatusText } from '@/utils/format'
import { alphaColor, num } from '@/utils/quote-helper'
import { DEFAULT_TAG_COLOR, TAG_NAME_MAX, TAG_PALETTE, tagColorCss } from '@/utils/tag-helper'
import type { Customer, DataRow, Payment, Project, Tag } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const customerId = ref(0)
const loading = ref(true)
const customer = ref<Customer | null>(null)

/** 标签管理弹层状态（对齐 App _editTags 的 sel 集合） */
const showTagSheet = ref(false)
const selectedTagIds = ref<number[]>([])
const showNewTag = ref(false)
const newTagName = ref('')
const newTagColor = ref<number>(TAG_PALETTE[4] || DEFAULT_TAG_COLOR)

const subtitle = computed(() => {
  const c = customer.value
  if (!c) return ''
  const parts: string[] = []
  if (c.contact) parts.push(`联系人 ${c.contact}`)
  if (c.industry) parts.push(c.industry)
  if (c.location) parts.push(c.location)
  return parts.join(' · ') || '暂无补充信息'
})

const projectsOf = computed(
  () => (data.projects as Project[]).filter((p) => Number(p.customer_id) === customerId.value) || []
)

/** 客户累计收款（对齐 App customerPaidTotal：名下项目收款求和，单位：分） */
const paidTotal = computed(() => {
  const ids = projectsOf.value.map((p) => Number(p.id))
  return (data.payments as Payment[])
    .filter((pay) => ids.includes(Number(pay.project_id)))
    .reduce((sum, pay) => sum + Number(pay.amount ?? 0), 0)
})

/** 档案字段行（对齐 App build 中的 _infoRow 顺序，空值显示 —） */
const infoRows = computed<Array<{ label: string; value: string }>>(() => {
  const c = customer.value as (Customer & DataRow) | null
  if (!c) return []
  const last = num(c['last_contact_at'])
  return [
    { label: '行业', value: text(c.industry) },
    { label: '客户来源', value: text(c.source) },
    { label: '所在地', value: text(c.location) },
    { label: '联系方式', value: text(c.contact) },
    { label: '最近联系', value: last > 0 ? formatDate(last) : '未记录' },
    { label: '备注', value: text(c.note) }
  ]
})

/** 当前客户已打标签（对齐 App _tags） */
const tags = computed(() => data.tagsOfCustomer(customerId.value))

function text(v: unknown): string {
  const s = String(v ?? '').trim()
  return s || '—'
}

/** 卡片标签 chip 样式（对齐 App _TagChip：14% 同色底 + 同色字） */
function tagChipStyle(t: Tag): Record<string, string> {
  return { backgroundColor: alphaColor(tagColorCss(t.color), 0.14) }
}

function isSelected(t: Tag): boolean {
  return selectedTagIds.value.includes(num(t.id))
}

/** FilterChip 样式（对齐 App：选中 18% 同色底 + 40% 边框 + 加粗） */
function pickStyle(t: Tag): Record<string, string> {
  const css = tagColorCss(t.color)
  const on = isSelected(t)
  return {
    color: css,
    backgroundColor: on ? alphaColor(css, 0.18) : 'transparent',
    borderColor: alphaColor(css, 0.4),
    fontWeight: on ? '600' : '400'
  }
}

async function load() {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  customer.value =
    ((data.customers as Customer[]).find((r) => Number(r.id) === customerId.value) as Customer) ||
    null
  // 从标签池返回后同步弹层选中态（标签可能已被改名/删除）
  if (showTagSheet.value) selectedTagIds.value = tags.value.map((t) => num(t.id))
  loading.value = false
}

onLoad((q) => {
  customerId.value = Number(q?.id ?? 0)
})

onShow(() => {
  load()
})

function goEdit() {
  uni.navigateTo({ url: `/pages/customer/form?id=${customerId.value}` })
}

function goProject(id: unknown) {
  uni.navigateTo({ url: `/pages/project/detail?id=${String(id)}` })
}

/** 标签池管理（对齐 App _openTagManagePage，返回后 onShow 会刷新标签） */
function goTags() {
  uni.navigateTo({ url: '/pages/customer/tags' })
}

function confirmDelete() {
  const c = customer.value
  if (!c) return
  uni.showModal({
    title: '删除客户',
    content: `确定删除客户"${c.name || ''}"吗？\n其名下全部项目与收款记录将一并删除，不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeCustomer(customerId.value)
      if (ok) {
        uni.showToast({ title: '已删除', icon: 'success' })
        setTimeout(() => uni.navigateBack(), 400)
      }
    }
  })
}

/* ================= 标签管理（对齐 App _editTags） ================= */

function openTagSheet() {
  selectedTagIds.value = tags.value.map((t) => num(t.id))
  showNewTag.value = false
  newTagName.value = ''
  newTagColor.value = TAG_PALETTE[4] || DEFAULT_TAG_COLOR
  showTagSheet.value = true
}

function closeTagSheet() {
  showTagSheet.value = false
}

/** 即时落库（对齐 App commit：setCustomerTags 先清后插） */
function commit() {
  data.setCustomerTags(customerId.value, selectedTagIds.value)
}

function toggleTag(t: Tag) {
  const id = num(t.id)
  selectedTagIds.value = selectedTagIds.value.includes(id)
    ? selectedTagIds.value.filter((v) => v !== id)
    : [...selectedTagIds.value, id]
  commit()
}

function toggleNewTag() {
  showNewTag.value = !showNewTag.value
}

function cancelNewTag() {
  showNewTag.value = false
  newTagName.value = ''
}

function submitNewTag() {
  const name = newTagName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入标签名称', icon: 'none' })
    return
  }
  if ((data.tags as Tag[]).some((t) => String(t.name) === name)) {
    uni.showToast({ title: '标签已存在', icon: 'none' })
    return
  }
  const id = data.createTag(name, newTagColor.value)
  selectedTagIds.value = [...selectedTagIds.value, num(id)]
  commit()
  cancelNewTag()
  uni.showToast({ title: '已创建', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.head {
  display: flex;
  align-items: flex-start;
}

.head-main {
  flex: 1;
  min-width: 0;
}

.head-name {
  font-size: 36rpx;
  font-weight: 700;
  color: #1f2430;
}

.head-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.head-actions {
  display: flex;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.action {
  font-size: 26rpx;
  color: #4a5af0;
  padding: 0 12rpx;
}

.action.danger {
  color: #e74c3c;
}

.info-card {
  padding: 22rpx 28rpx;
}

.info-row {
  display: flex;
  align-items: flex-start;
  padding: 10rpx 0;
}

.info-label {
  width: 140rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: #8a93a6;
}

.info-value {
  flex: 1;
  min-width: 0;
  font-size: 26rpx;
  color: #1f2430;
  word-break: break-all;
}

.tag-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tag-card-title {
  font-size: 28rpx;
  font-weight: 700;
  color: #1f2430;
}

.tag-manage {
  font-size: 26rpx;
  color: #4a5af0;
  padding: 0 6rpx;
}

.tag-empty {
  display: block;
  margin-top: 12rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.tag-wrap {
  display: flex;
  flex-wrap: wrap;
  margin-top: 12rpx;
}

.tag-chip {
  display: flex;
  align-items: center;
  padding: 6rpx 16rpx;
  border-radius: 24rpx;
  margin: 0 12rpx 12rpx 0;
}

.tag-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.tag-text {
  font-size: 22rpx;
}

.stat-row {
  display: flex;
  gap: 16rpx;
}

.stat-card {
  flex: 1;
  min-width: 0;
}

.stat-title {
  font-size: 24rpx;
  color: #8a93a6;
}

.stat-value {
  display: block;
  margin-top: 8rpx;
  font-size: 34rpx;
  font-weight: 700;
}

.stat-value.primary {
  color: #4a5af0;
}

.stat-value.green {
  color: #2eaa5e;
}

.section-head {
  margin: 28rpx 4rpx 16rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.empty {
  color: #9ca3af;
  text-align: center;
  font-size: 28rpx;
  padding-top: 60rpx;
  padding-bottom: 60rpx;
}

.project {
  display: flex;
  align-items: center;
}

.card-main {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #1f2430;
}

.card-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.status-chip {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 6rpx 18rpx;
  border-radius: 22rpx;
  font-size: 22rpx;
  font-weight: 600;
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.1);
}

/* ---- 标签管理弹层 ---- */
.sheet-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(15, 18, 28, 0.45);
  z-index: 90;
  display: flex;
  align-items: flex-end;
}

.sheet {
  width: 100%;
  max-height: 76vh;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.sheet-count {
  font-size: 26rpx;
  color: #8a93a6;
}

.sheet-sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.sheet-body {
  max-height: 46vh;
  margin-top: 16rpx;
}

.tag-pick {
  display: flex;
  align-items: center;
  padding: 10rpx 22rpx;
  border-radius: 40rpx;
  border: 1rpx solid transparent;
  margin: 0 16rpx 16rpx 0;
}

.tag-pick-text {
  font-size: 26rpx;
}

.tag-pick.new {
  color: #4a5af0;
  border-color: rgba(74, 90, 240, 0.4);
}

.tag-pick.manage {
  color: #5b6274;
  border-color: rgba(31, 36, 48, 0.2);
}

.tag-check {
  font-size: 24rpx;
  margin-right: 8rpx;
}

.new-tag {
  margin-top: 8rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  background: #f6f7fb;
}

.new-tag-input {
  height: 72rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: #fff;
  font-size: 26rpx;
}

.ph {
  color: #b6bccb;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  margin-top: 16rpx;
}

.swatch {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  margin: 0 16rpx 12rpx 0;
  border: 4rpx solid transparent;
}

.swatch.is-on {
  border-color: #1f2430;
}

.new-tag-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8rpx;
}

.btn {
  padding: 12rpx 40rpx;
  border-radius: 32rpx;
  font-size: 26rpx;
  text-align: center;
  margin-left: 16rpx;
}

.btn.ghost {
  border: 1rpx solid rgba(31, 36, 48, 0.2);
  color: #5b6274;
}

.btn.solid {
  background: #4a5af0;
  color: #fff;
}

.sheet-done {
  margin: 20rpx 0 0;
}
</style>
