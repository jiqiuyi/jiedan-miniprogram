<template>
  <view class="page">
    <!-- 说明条（对齐 App _TagManagePage 顶部 info banner） -->
    <view class="banner">
      <text class="banner-text">
        标签维度汇总：每行显示该标签下的客户数与该批客户累计收款，仅做轻量统计，不联动对账流水。
      </text>
    </view>

    <view v-if="!loading && !summaries.length" class="empty">
      <text class="empty-title">还没有标签</text>
      <text class="empty-hint">点右下角 + 新建一个标签</text>
    </view>

    <view v-else class="list">
      <view v-for="s in summaries" :key="String(s.id)" class="card">
        <view class="dot" :style="{ backgroundColor: tagColorCss(s.color) }" />
        <view class="card-main">
          <text class="card-title">{{ s.name }}</text>
          <text class="card-sub">{{ s.count }} 位客户 · 累计收款 ¥{{ formatAmount(s.paidTotal) }}</text>
        </view>
        <view class="card-side">
          <text class="op" @tap="openEditor(s)">编辑</text>
          <text class="op danger" @tap="confirmRemove(s)">删除</text>
        </view>
      </view>
    </view>

    <view class="fab" @tap="openCreate">＋</view>

    <!-- 新建 / 编辑标签弹层（对齐 App _openEditor：名称 ≤8 字 + 色板） -->
    <view v-if="showEditor" class="sheet-mask" @tap="closeEditor">
      <view class="sheet" @tap.stop>
        <text class="sheet-title">{{ editingId ? '编辑标签' : '新建标签' }}</text>
        <view class="field">
          <text class="field-label">标签名称</text>
          <input
            v-model="draftName"
            class="field-input"
            type="text"
            :maxlength="TAG_NAME_MAX"
            placeholder="如：VIP 客户"
            placeholder-class="ph"
          />
        </view>
        <view class="palette">
          <view
            v-for="c in TAG_PALETTE"
            :key="String(c)"
            class="swatch"
            :class="{ 'is-on': draftColor === c }"
            :style="{ backgroundColor: tagColorCss(c) }"
            @tap="draftColor = c"
          >
            <text v-if="draftColor === c" class="swatch-check">✓</text>
          </view>
        </view>
        <view class="sheet-actions">
          <view class="btn ghost" @tap="closeEditor">取消</view>
          <view class="btn solid" :class="{ 'is-disabled': !canSave }" @tap="saveEditor">保存</view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount } from '@/utils/format'
import { num } from '@/utils/quote-helper'
import { DEFAULT_TAG_COLOR, TAG_NAME_MAX, TAG_PALETTE, tagColorCss } from '@/utils/tag-helper'
import type { CustomerTag, Payment, Project, Tag } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const loading = ref(true)
const showEditor = ref(false)
/** 正在编辑的标签 id（0 表示新建） */
const editingId = ref(0)
const draftName = ref('')
const draftColor = ref<number>(TAG_PALETTE[0] || DEFAULT_TAG_COLOR)

interface TagSummary {
  id: number
  name: string
  color: number
  count: number
  paidTotal: number
}

/** 客户 id → 累计收款（分）：payments join projects 按客户聚合（对齐 customerPaidTotals） */
const paidByCustomer = computed<Record<string, number>>(() => {
  const customerOf: Record<string, number> = {}
  ;(data.projects as Project[]).forEach((p) => {
    const pid = num(p.id)
    const cid = num(p.customer_id)
    if (pid && cid) customerOf[String(pid)] = cid
  })
  const map: Record<string, number> = {}
  ;(data.payments as Payment[]).forEach((pay) => {
    const cid = customerOf[String(num(pay.project_id))]
    if (!cid) return
    const key = String(cid)
    map[key] = (map[key] || 0) + num(pay.amount)
  })
  return map
})

/** 标签 id → 客户 id 去重集合 */
const customersByTag = computed<Record<string, number[]>>(() => {
  const map: Record<string, number[]> = {}
  ;(data.customerTags as CustomerTag[]).forEach((r) => {
    const tid = num(r.tag_id)
    const cid = num(r.customer_id)
    if (!tid || !cid) return
    const key = String(tid)
    if (!map[key]) map[key] = []
    if (!map[key].includes(cid)) map[key].push(cid)
  })
  return map
})

/** 标签维度汇总（对齐 App tagSummaries：全部标签 + 客户数 + 该批客户累计收款） */
const summaries = computed<TagSummary[]>(() =>
  (data.tags as Tag[]).map((t) => {
    const ids = customersByTag.value[String(num(t.id))] || []
    const paidTotal = ids.reduce((sum, cid) => sum + (paidByCustomer.value[String(cid)] || 0), 0)
    return {
      id: num(t.id),
      name: String(t.name || ''),
      color: num(t.color) || DEFAULT_TAG_COLOR,
      count: ids.length,
      paidTotal
    }
  })
)

const canSave = computed(() => draftName.value.trim().length > 0)

onShow(async () => {
  if (!user.isLoggedIn) {
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  loading.value = false
})

function openCreate() {
  editingId.value = 0
  draftName.value = ''
  draftColor.value = TAG_PALETTE[0] || DEFAULT_TAG_COLOR
  showEditor.value = true
}

function openEditor(s: TagSummary) {
  editingId.value = s.id
  draftName.value = s.name
  draftColor.value = s.color
  showEditor.value = true
}

function closeEditor() {
  showEditor.value = false
}

function saveEditor() {
  const name = draftName.value.trim()
  if (!name) {
    uni.showToast({ title: '请输入标签名称', icon: 'none' })
    return
  }
  const duplicated = (data.tags as Tag[]).some(
    (t) => String(t.name) === name && num(t.id) !== editingId.value
  )
  if (duplicated) {
    uni.showToast({ title: '标签已存在', icon: 'none' })
    return
  }
  if (editingId.value) {
    data.updateTag(editingId.value, { name, color: draftColor.value })
  } else {
    data.createTag(name, draftColor.value)
  }
  showEditor.value = false
  uni.showToast({ title: '已保存', icon: 'success' })
}

function confirmRemove(s: TagSummary) {
  uni.showModal({
    title: '删除标签',
    content: `确定删除标签「${s.name}」吗？\n该标签与全部客户的关联将一并移除。`,
    confirmColor: '#E74C3C',
    success: (res) => {
      if (!res.confirm) return
      const ok = data.removeTag(s.id)
      uni.showToast({ title: ok ? '已删除' : '删除失败', icon: ok ? 'success' : 'none' })
    }
  })
}
</script>

<style lang="scss" scoped>
.page {
  padding: 0 0 160rpx;
}

.banner {
  background: rgba(74, 90, 240, 0.06);
  padding: 24rpx;
}

.banner-text {
  font-size: 24rpx;
  color: #8a93a6;
  line-height: 1.5;
}

.empty {
  padding-top: 140rpx;
  text-align: center;
}

.empty-title {
  display: block;
  font-size: 30rpx;
  color: #8a93a6;
}

.empty-hint {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #b6bccb;
}

.list {
  padding: 16rpx 24rpx;
}

.card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 16rpx rgba(31, 36, 48, 0.05);
}

.dot {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  margin-right: 20rpx;
  flex-shrink: 0;
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

.card-side {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}

.op {
  font-size: 26rpx;
  color: #4a5af0;
  padding: 0 12rpx;
}

.op.danger {
  color: #e74c3c;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: 80rpx;
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: #4a5af0;
  color: #fff;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(74, 90, 240, 0.35);
  z-index: 60;
}

/* ---- 新建 / 编辑弹层 ---- */
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
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 28rpx 28rpx calc(28rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.sheet-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1f2430;
}

.field {
  margin-top: 20rpx;
}

.field-label {
  display: block;
  font-size: 24rpx;
  color: #8a93a6;
}

.field-input {
  margin-top: 10rpx;
  height: 76rpx;
  padding: 0 20rpx;
  border-radius: 12rpx;
  background: #f6f7fb;
  font-size: 28rpx;
}

.ph {
  color: #b6bccb;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  margin-top: 24rpx;
}

.swatch {
  width: 68rpx;
  height: 68rpx;
  border-radius: 50%;
  margin: 0 20rpx 16rpx 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid transparent;
}

.swatch.is-on {
  border-color: rgba(0, 0, 0, 0.35);
}

.swatch-check {
  font-size: 28rpx;
  color: #fff;
}

.sheet-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 12rpx;
}

.btn {
  padding: 16rpx 48rpx;
  border-radius: 36rpx;
  font-size: 28rpx;
  text-align: center;
  margin-left: 20rpx;
}

.btn.ghost {
  border: 1rpx solid rgba(31, 36, 48, 0.2);
  color: #5b6274;
}

.btn.solid {
  background: #4a5af0;
  color: #fff;
}

.btn.solid.is-disabled {
  opacity: 0.4;
}
</style>
