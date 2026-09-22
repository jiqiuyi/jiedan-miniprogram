<template>
  <view class="page">
    <view class="toolbar">
      <view class="search-box">
        <view class="ic ic-20 ic-search-main search-icon"></view>
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索报价标题 / 客户"
          placeholder-style="color: #8A93A6"
          confirm-type="search"
        />
      </view>
      <view class="tpl-entry" @tap="openTemplateSheet">
        <view class="ic ic-20 ic-article-primary tpl-entry-icon"></view>
        <text class="tpl-entry-text">模板</text>
      </view>
    </view>

    <scroll-view scroll-x class="filter-bar" :show-scrollbar="false">
      <view class="filter-inner">
        <view
          v-for="f in STATUS_FILTERS"
          :key="String(f.value)"
          class="filter-chip"
          :class="{ active: statusFilter === f.value }"
          @tap="statusFilter = f.value"
        >{{ f.label }}</view>
      </view>
    </scroll-view>

    <view v-if="data.loading && !filtered.length" class="empty">加载中...</view>
    <view v-else-if="!filtered.length" class="empty">暂无报价，点右下角新建</view>
    <view v-else class="list">
      <view v-for="q in filtered" :key="String(q.id)" class="card" @tap="goDetail(q.id)">
        <view class="card-main">
          <view class="title-row">
            <!-- 类型标签（对齐 App 历史卡片首位标签） -->
            <view
              class="type-tag"
              :class="quoteIsSimple(q) ? 'type-tag-simple' : 'type-tag-detail'"
            >{{ quoteIsSimple(q) ? '简单报价' : '详细报价' }}</view>
            <view class="status-chip" :style="statusStyle(q)" @tap.stop="openStatusPicker(q)">
              <view class="ic ic-12 status-chip-icon" :class="statusIconClassOf(q)"></view>
              <text class="status-chip-text">{{ statusTextOf(q) }}</text>
            </view>
            <text class="card-title">{{ q.title || '未命名报价' }}</text>
          </view>
          <text class="card-sub">{{ customerNameOf(q) }} · {{ typeLabelOf(q) }}</text>
          <view class="amount-row">
            <text class="card-amount">¥{{ formatAmount(totalOf(q)) }}</text>
            <text class="card-date">{{ formatDate(createdOf(q)) }}</text>
          </view>
        </view>
        <view class="card-side">
          <view class="more" @tap.stop="showActions(q)">···</view>
          <text class="chevron">›</text>
        </view>
      </view>
    </view>

    <view class="fab" @tap="goAdd">
      <view class="ic ic-24 ic-add-white"></view>
    </view>
    <view v-if="tplVisible" class="tpl-mask" @tap="closeTemplateSheet" />

    <view v-if="tplVisible" class="tpl-sheet">
      <view class="tpl-head">
        <text class="tpl-head-title">报价模板</text>
        <view class="tpl-head-close" @tap="closeTemplateSheet">×</view>
      </view>
      <text class="tpl-head-sub">选择模板后自动填入，可修改后保存</text>

      <view v-if="!templates.length" class="tpl-empty">暂无模板，可在报价单「···」中另存为模板</view>
      <scroll-view v-else scroll-y class="tpl-scroll">
        <view v-for="t in templates" :key="String(t.id)" class="tpl-item" @tap="applyTemplate(t)">
          <text
            class="tpl-tag"
            :class="quoteIsSimple(t) ? 'tpl-tag-simple' : 'tpl-tag-detail'"
          >{{ quoteIsSimple(t) ? '简单' : '详细' }}</text>
          <view class="tpl-item-main">
            <text class="tpl-item-title">{{ t.title || '未命名报价' }}</text>
            <text class="tpl-item-amount">¥{{ formatAmount(totalOf(t)) }}</text>
          </view>
          <view class="tpl-item-del" @tap.stop="confirmDeleteTemplate(t)">删除</view>
        </view>
      </scroll-view>
    </view>

    <view v-if="detailVisible" class="dlg-mask" @tap="closeDetail" />
    <view v-if="detailVisible" class="dlg">
      <text class="dlg-title">报价单详情</text>
      <scroll-view scroll-y class="dlg-scroll">
        <text class="dlg-text" selectable>{{ detailText }}</text>
        <block v-if="detailImage">
          <text class="dlg-sub">参考图</text>
          <image
            class="dlg-image"
            :src="detailImage"
            mode="aspectFill"
            @tap="previewDetailImage"
          />
        </block>
      </scroll-view>
      <view class="dlg-actions">
        <view class="dlg-btn" @tap="closeDetail">关闭</view>
      </view>
    </view>

    <view v-if="statusPickerVisible" class="dlg-mask" @tap="closeStatusPicker" />
    <view v-if="statusPickerVisible" class="picker-sheet">
      <text class="picker-head">报价状态</text>
      <view
        v-for="s in STATUS_META"
        :key="String(s.value)"
        class="picker-item"
        @tap="chooseStatus(s.value)"
      >
        <text class="picker-icon" :style="{ color: s.color }">{{ s.icon }}</text>
        <text class="picker-label" :class="{ current: s.value === pickerStatus }">{{ s.label }}</text>
        <text v-if="s.value === pickerStatus" class="picker-check">✓</text>
      </view>
      <view class="picker-gap" />
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import { formatAmount, formatDate } from '@/utils/format'
import {
  quoteShareDataOf,
  shareQuoteWeb,
  type QuoteShareData
} from '@/utils/quote-share'
import type { Quote, Customer, Project, DataRow } from '@/utils/types'
import {
  DANGER,
  DEFAULT_HOUR_RATE,
  QUOTE_STATUS_META,
  alphaColor,
  businessQuotes,
  templateQuotes,
  quoteIsSimple,
  parseLines,
  quoteStatusMeta,
  quoteTextFor
} from '@/utils/quote-helper'

const data = useDataStore()
const user = useUserStore()

const keyword = ref('')

/** 模板弹层显隐 */
const tplVisible = ref(false)
/** 报价模板列表（is_template = 1） */
const templates = computed(() => templateQuotes(data.quotes as Quote[]))

/** 报价状态元数据（对齐 App QuoteStatus + _quoteStatusColor/_quoteStatusIcon） */
const STATUS_META = QUOTE_STATUS_META
/** 状态筛选项（-1 = 全部） */
const STATUS_FILTERS: Array<{ value: number; label: string }> = [
  { value: -1, label: '全部' },
  ...QUOTE_STATUS_META.map((s) => ({ value: s.value, label: s.label }))
]
/** 当前状态筛选值 */
const statusFilter = ref(-1)

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

function rowOf(q: Quote): DataRow {
  return q as DataRow
}

function totalOf(q: Quote): number {
  return num(rowOf(q)['total'])
}

function createdOf(q: Quote): number {
  return num(rowOf(q)['created_at'])
}

function statusOf(q: Quote): number {
  return num(rowOf(q)['status'])
}

function statusTextOf(q: Quote): string {
  return quoteStatusMeta(statusOf(q)).label
}

/** 状态图标类名（对齐 App _quoteStatusIcon：edit_note / send / thumb_up / check_circle / block） */
const STATUS_ICON_CLASS: Record<number, string> = {
  0: 'ic-editnote-sub',
  1: 'ic-send-accent',
  2: 'ic-thumbup-blue',
  3: 'ic-checkcircle-green',
  4: 'ic-block-danger'
}

function statusIconClassOf(q: Quote): string {
  return STATUS_ICON_CLASS[statusOf(q)] || STATUS_ICON_CLASS[0]
}

/** 状态徽章样式（对齐 App _quoteStatusChip：色字 + 12% 同色底） */
function statusStyle(q: Quote): Record<string, string> {
  const color = quoteStatusMeta(statusOf(q)).color
  return { color, backgroundColor: alphaColor(color, 0.12) }
}

/** 关联项目名称（对齐 App _projectTitle） */
function projectNameOf(q: Quote): string {
  const pid = num(rowOf(q)['project_id'])
  if (!pid) return ''
  const p = data.findById(data.projects as unknown as Project[], pid)
  return (p as Project | undefined)?.title || ''
}

function typeLabelOf(q: Quote): string {
  return String(rowOf(q)['quote_type'] ?? '') === 'full' ? '详细报价' : '报价单'
}

function customerNameOf(q: Quote): string {
  const c = data.findById(
    data.customers as unknown as Customer[],
    num(rowOf(q)['customer_id'])
  )
  return (c as Customer | undefined)?.name || '未关联客户'
}

const filtered = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  const st = statusFilter.value
  // 模板不进报价历史列表（对齐 App：getQuotes where is_template = 0）
  return businessQuotes(data.quotes as Quote[])
    .filter((q) => st < 0 || statusOf(q) === st)
    .filter((q) => {
      if (!kw) return true
      return `${q.title || ''} ${customerNameOf(q)}`.toLowerCase().includes(kw)
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
  uni.navigateTo({ url: `/pages/quote/detail?id=${String(id)}` })
}

function goAdd() {
  uni.navigateTo({ url: '/pages/quote/form' })
}

/** 卡片「···」更多操作（对齐 App 报价历史长按侧滑：网页分享 / 查看 / 复制 / 编辑 / 删除） */
function showActions(q: Quote) {
  uni.showActionSheet({
    itemList: ['网页分享', '查看报价单详情', '复制报价单文本', '编辑', '另存为报价模板', '删除'],
    success: (res) => {
      if (res.tapIndex === 0) shareWeb(q)
      else if (res.tapIndex === 1) openDetail(q)
      else if (res.tapIndex === 2) copyQuoteText(q)
      else if (res.tapIndex === 3) uni.navigateTo({ url: `/pages/quote/form?id=${q.id}` })
      else if (res.tapIndex === 4) saveAsTemplate(q)
      else if (res.tapIndex === 5) confirmDelete(q)
    }
  })
}

/* ================= 查看报价单详情（对齐 App _openDetail：文本 + 参考图） ================= */
const detailVisible = ref(false)
const detailText = ref('')
const detailImage = ref('')

function openDetail(q: Quote) {
  detailText.value = quoteTextFor(q)
  detailImage.value = String(rowOf(q)['image_path'] ?? '').trim()
  detailVisible.value = true
}

function closeDetail() {
  detailVisible.value = false
  detailText.value = ''
  detailImage.value = ''
}

/** 参考图点击放大（对齐 App 点击参考图查看大图） */
function previewDetailImage() {
  const path = detailImage.value
  if (!path) return
  uni.previewImage({ urls: [path], current: path })
}

/* ================= 复制报价单文本（对齐 App 复制侧滑动作） ================= */
function copyQuoteText(q: Quote) {
  uni.setClipboardData({
    data: quoteTextFor(q),
    success: () => uni.showToast({ title: '报价单文本已复制', icon: 'none' })
  })
}

/* ================= 网页分享（对齐 App _shareWeb：生成自包含 HTML 报价页） ================= */
/** 报价单网页渲染数据（客户 / 项目名称按 id 反查，实现见 @/utils/quote-share） */
function shareDataOf(q: Quote): QuoteShareData {
  return quoteShareDataOf(q, data.customers as Customer[], data.projects as Project[])
}

/** 网页分享：生成自包含 HTML 报价页并复制到剪贴板（小程序无系统分享面板，改为可粘贴的网页源码） */
function shareWeb(q: Quote) {
  shareQuoteWeb(shareDataOf(q))
}

/* ================= 报价状态快速切换（对齐 App _quoteStatusChip / _quoteStatusPicker） ================= */
const statusPickerVisible = ref(false)
const pickerQuoteId = ref(0)
const pickerStatus = ref(0)

function openStatusPicker(q: Quote) {
  pickerQuoteId.value = Number(q.id)
  pickerStatus.value = statusOf(q)
  statusPickerVisible.value = true
}

function closeStatusPicker() {
  statusPickerVisible.value = false
}

async function chooseStatus(v: number) {
  statusPickerVisible.value = false
  if (v === pickerStatus.value) return
  const ok = await data.updateQuote(pickerQuoteId.value, { status: v }, { silent: true })
  if (!ok) {
    uni.showToast({ title: '状态更新失败，请重试', icon: 'none' })
    return
  }
  uni.showToast({ title: `状态已更新为「${quoteStatusMeta(v).label}」`, icon: 'none' })
}

/** 另存为报价模板（对齐 App _saveAsTemplate：解绑客户/项目，仅保留明细/税率/备注等） */
function saveAsTemplate(q: Quote) {
  const row = rowOf(q)
  uni.showModal({
    title: '另存为报价模板',
    editable: true,
    placeholderText: '填写模板名称，之后可一键套用',
    content: `${q.title || '未命名报价'}（模板）`,
    confirmText: '保存模板',
    success: async (res) => {
      if (!res.confirm) return
      const name = String(res.content ?? '').trim()
      if (!name) {
        uni.showToast({ title: '模板名称不能为空', icon: 'none' })
        return
      }
      const now = Date.now()
      const payload: DataRow = {
        title: name,
        tax_rate: num(row['tax_rate']),
        lines_json: String(row['lines_json'] ?? '[]'),
        total: num(row['total']),
        quote_type: String(row['quote_type'] ?? 'simple'),
        tax_include: num(row['tax_include']),
        note: String(row['note'] ?? ''),
        status: 0,
        is_template: 1,
        image_path: '',
        customer_id: null,
        project_id: null,
        created_at: now,
        updated_at: now
      }
      const ok = await data.createQuote(payload, { silent: true })
      if (!ok) {
        uni.showToast({ title: '保存失败，请重试', icon: 'none' })
        return
      }
      uni.showToast({
        title: '已保存为报价模板，可在报价页右上角「模板」中套用',
        icon: 'none'
      })
    }
  })
}

function confirmDelete(q: Quote) {
  uni.showModal({
    title: '删除报价单',
    content: `确定删除报价单"${q.title || ''}"吗？删除后不可恢复。`,
    confirmColor: '#E74C3C',
    success: async (res) => {
      if (!res.confirm) return
      await data.removeQuote(Number(q.id))
    }
  })
}

/* ================= 报价模板弹层（对齐 App _openTemplateSheet） ================= */
function openTemplateSheet() {
  tplVisible.value = true
}

function closeTemplateSheet() {
  tplVisible.value = false
}

/** 套用模板：不覆盖任何历史，跳转报价表单为全新编辑态（对齐 App _applySimpleTemplate / _applyDetailTemplate） */
function applyTemplate(t: Quote) {
  const row = rowOf(t)
  const simple = quoteIsSimple(t)
  const lines = parseLines(t)
  const payload: DataRow = {
    title: String(row['title'] ?? ''),
    total: num(row['total']),
    tax_rate: num(row['tax_rate']),
    note: String(row['note'] ?? ''),
    quote_type: simple ? 'simple' : 'full',
    lines_json: simple
      ? '[]'
      : JSON.stringify(
          lines.length
            ? lines
            : [{ itemName: '设计服务', hours: 8, hourRate: DEFAULT_HOUR_RATE, materialFee: 0 }]
        )
  }
  try {
    uni.setStorageSync('quote_tpl_apply', JSON.stringify(payload))
  } catch {
    // 忽略存储失败
  }
  tplVisible.value = false
  uni.navigateTo({ url: '/pages/quote/form?tpl=1' })
}

/** 删除模板（二次确认，删除后不可恢复） */
function confirmDeleteTemplate(t: Quote) {
  const name = String(rowOf(t)['title'] ?? '')
  uni.showModal({
    title: '删除模板',
    content: `确定删除模板「${name}」吗？删除后不可恢复。`,
    confirmText: '删除',
    confirmColor: DANGER,
    success: async (res) => {
      if (!res.confirm) return
      const ok = await data.removeQuote(Number(t.id))
      if (!ok) {
        uni.showToast({ title: '删除失败，请重试', icon: 'none' })
        return
      }
      uni.showToast({ title: '模板已删除', icon: 'none' })
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

/* ---- 工具栏（搜索框对齐 App TextField + 模板入口对齐 AppBar 模板图标） ---- */
.toolbar {
  display: flex;
  align-items: center;
  padding: 16rpx 32rpx 0;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 20rpx 28rpx;
  border-radius: 20rpx;
  background: rgba(138, 147, 166, 0.05);
}

.search-icon {
  margin-right: 16rpx;
}

.tpl-entry {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 0 22rpx;
  height: 80rpx;
  border-radius: 20rpx;
  background: rgba(74, 90, 240, 0.1);
}

.tpl-entry-icon {
  margin-right: 8rpx;
}

.tpl-entry-text {
  font-size: 26rpx;
  font-weight: 600;
  color: #4a5af0;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 40rpx;
  font-size: 28rpx;
  color: #1b2233;
}

/* ---- 状态筛选条（对齐 App ChoiceChip：未选描边 / 选中 12% 主色底 + 主色字） ---- */
.filter-bar {
  height: 92rpx;
  margin-top: 8rpx;
  white-space: nowrap;
}

.filter-inner {
  display: inline-flex;
  align-items: flex-start;
  padding: 12rpx 32rpx 0;
}

.filter-chip {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64rpx;
  margin-right: 12rpx;
  padding: 0 30rpx;
  border-radius: 40rpx;
  border: 2rpx solid #c7c5d0;
  background: transparent;
  font-size: 26rpx;
  line-height: 1;
  color: #8a93a6;
}

.filter-chip.active {
  background: rgba(74, 90, 240, 0.12);
  border-color: rgba(74, 90, 240, 0.12);
  color: #4a5af0;
  font-weight: 600;
}

.empty {
  padding-top: 160rpx;
  text-align: center;
  color: #8a93a6;
  font-size: 28rpx;
}

.list {
  padding-bottom: 180rpx;
}

/* ---- 报价卡片（对齐 App 历史卡片：卡片圆角 14 / 描边 / 内距 LTRB(14,12,14,12) / 外距 4+12） ---- */
.card {
  display: flex;
  align-items: center;
  margin: 8rpx 24rpx;
  padding: 24rpx 28rpx;
  background: #fff;
  border-radius: 28rpx;
  border: 2rpx solid #eceef4;
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
  gap: 12rpx;
}

/* 类型标签（对齐 App：简单报价 主色 10% 底 / 详细报价 收入色 10% 底） */
.type-tag {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
}

.type-tag-simple {
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.1);
}

.type-tag-detail {
  color: #16a085;
  background: rgba(22, 160, 133, 0.1);
}

.card-title {
  flex: 1;
  min-width: 0;
  font-size: 32rpx;
  font-weight: 600;
  color: #1b1b21;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 状态标签（对齐 App _quoteStatusChip：12% 同色底 + 圆角 xs + 图标 12） */
.status-chip {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
}

.status-chip-icon {
  flex-shrink: 0;
  margin-right: 6rpx;
}

.status-chip-text {
  font-size: 22rpx;
  font-weight: 600;
}

.card-sub {
  margin-top: 8rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.amount-row {
  margin-top: 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-amount {
  font-size: 34rpx;
  font-weight: 700;
  color: #1b1b21;
}

.card-date {
  font-size: 24rpx;
  color: #8a93a6;
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

/* ---- FAB（对齐 App FloatingActionButton：品牌蓝底白图标） ---- */
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

/* ================= 报价模板弹层（对齐 App DraggableScrollableSheet） ================= */
.tpl-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.35);
  z-index: 90;
}

.tpl-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  height: 60%;
  background: #fff;
  border-top-left-radius: 28rpx;
  border-top-right-radius: 28rpx;
  z-index: 91;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tpl-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 28rpx 0;
}

.tpl-head-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
}

.tpl-head-close {
  font-size: 44rpx;
  line-height: 44rpx;
  color: #8a93a6;
  padding: 0 8rpx;
}

.tpl-head-sub {
  padding: 8rpx 28rpx 16rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.tpl-empty {
  padding: 80rpx 28rpx;
  text-align: center;
  font-size: 26rpx;
  color: #9ca3af;
}

.tpl-scroll {
  flex: 1;
  height: 0;
}

.tpl-item {
  display: flex;
  align-items: center;
  margin: 8rpx 24rpx;
  padding: 22rpx 24rpx;
  background: #fff;
  border-radius: 16rpx;
  box-shadow: 0 2rpx 10rpx rgba(27, 34, 51, 0.06);
}

.tpl-tag {
  flex-shrink: 0;
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 600;
  margin-right: 20rpx;
}

.tpl-tag-simple {
  color: #4a5af0;
  background: rgba(74, 90, 240, 0.1);
}

.tpl-tag-detail {
  color: #16a085;
  background: rgba(22, 160, 133, 0.1);
}

.tpl-item-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.tpl-item-title {
  font-size: 28rpx;
  color: #1b2233;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.tpl-item-amount {
  margin-top: 6rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.tpl-item-del {
  flex-shrink: 0;
  margin-left: 16rpx;
  padding: 8rpx 16rpx;
  font-size: 26rpx;
  color: #e74c3c;
}

/* ================= 报价单详情弹层（对齐 App 报价单详情对话框：文本 + 参考图） ================= */
.dlg-mask {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 90;
}

.dlg {
  position: fixed;
  left: 48rpx;
  right: 48rpx;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  padding: 28rpx;
  background: #fff;
  border-radius: 24rpx;
  display: flex;
  flex-direction: column;
}

.dlg-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1b2233;
}

.dlg-scroll {
  max-height: 720rpx;
  margin-top: 18rpx;
}

.dlg-text {
  font-size: 26rpx;
  line-height: 1.7;
  color: #1b2233;
  white-space: pre-wrap;
  word-break: break-all;
}

.dlg-sub {
  display: block;
  margin: 20rpx 0 12rpx;
  font-size: 24rpx;
  color: #8a93a6;
}

.dlg-image {
  width: 100%;
  height: 360rpx;
  border-radius: 12rpx;
  background: #f1f2f7;
}

.dlg-actions {
  margin-top: 20rpx;
  display: flex;
  justify-content: flex-end;
}

.dlg-btn {
  padding: 12rpx 36rpx;
  border-radius: 999rpx;
  background: rgba(74, 90, 240, 0.1);
  color: #4a5af0;
  font-size: 26rpx;
  font-weight: 600;
}

/* ================= 报价状态选择器（对齐 App _quoteStatusPicker） ================= */
.picker-sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 100;
  padding: 28rpx 28rpx 0;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
}

.picker-head {
  display: block;
  margin-bottom: 12rpx;
  font-size: 30rpx;
  font-weight: 700;
  color: #1b2233;
}

.picker-item {
  display: flex;
  align-items: center;
  padding: 24rpx 4rpx;
  border-bottom: 1rpx solid #e3e7f0;
}

.picker-icon {
  width: 44rpx;
  font-size: 28rpx;
}

.picker-label {
  flex: 1;
  font-size: 28rpx;
  color: #1b2233;
}

.picker-label.current {
  font-weight: 700;
}

.picker-check {
  font-size: 28rpx;
  font-weight: 700;
  color: #4a5af0;
}

.picker-gap {
  height: 40rpx;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
