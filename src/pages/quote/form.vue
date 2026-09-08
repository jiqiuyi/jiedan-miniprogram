<template>
  <view class="page">
    <view v-if="editId && isFullQuote" class="tip">该报价单为详细报价，仅调整标头信息，原报价明细将保留。</view>

    <view class="card">
      <view class="cell">
        <text class="label">报价标题</text>
        <input v-model="title" class="field" placeholder="必填，如：官网设计报价" />
      </view>

      <view class="cell">
        <text class="label">所属客户</text>
        <picker class="picker" :range="customerNames" :value="customerIdx" @change="onCustomerChange">
          <view class="picker-value" :class="{ placeholder: customerIdx === 0 }">
            {{ customerNames[customerIdx] }}
          </view>
        </picker>
      </view>

      <view class="cell">
        <text class="label">关联项目</text>
        <picker class="picker" :range="projectNames" :value="projectIdx" @change="onProjectChange">
          <view class="picker-value" :class="{ placeholder: projectIdx === 0 }">
            {{ projectNames[projectIdx] }}
          </view>
        </picker>
      </view>

      <view class="cell">
        <text class="label">总金额（元）</text>
        <input v-model="totalYuan" class="field" type="digit" placeholder="0.00" />
      </view>

      <view class="cell">
        <text class="label">税率（%）</text>
        <input v-model="taxRate" class="field" type="digit" placeholder="0" />
        <text class="unit">%</text>
      </view>

      <view class="cell">
        <text class="label">状态</text>
        <picker class="picker" :range="statusNames" :value="statusIdx" @change="onStatusChange">
          <view class="picker-value">{{ statusNames[statusIdx] }}</view>
        </picker>
      </view>

      <view class="cell col">
        <text class="label">备注</text>
        <textarea v-model="note" class="textarea" placeholder="补充说明（选填）" :maxlength="500" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @tap="onSave">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import type { Quote, Customer, Project, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const editId = ref(0)
const title = ref('')
const totalYuan = ref('')
const taxRate = ref('')
const note = ref('')
const statusIdx = ref(0)
const customerIdx = ref(0)
const projectIdx = ref(0)
const saving = ref(false)
const isFullQuote = ref(false)

const statusNames = ['草稿', '已发送', '客户确认', '已成交', '已作废']

const customers = computed(() => data.customers as Customer[])
const customerNames = computed(() => ['不关联客户', ...customers.value.map((c) => c.name || '未命名')])

const projects = computed(() => data.projects as Project[])
const projectNames = computed(() => ['不关联项目', ...projects.value.map((p) => p.title || '未命名')])

function centsToInput(cents: number | undefined): string {
  const n = Number(cents ?? 0)
  const v = Math.round(n) / 100
  return Number.isNaN(v) ? '' : String(v)
}

function num(v: unknown): number {
  const n = Number(v ?? 0)
  return Number.isFinite(n) ? n : 0
}

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  if (!query?.id) return
  editId.value = Number(query.id)
  const q = (data.quotes as Quote[]).find((r) => Number(r.id) === editId.value)
  if (!q) {
    uni.showToast({ title: '报价单不存在', icon: 'none' })
    return
  }
  const row = q as DataRow
  title.value = q.title || ''
  totalYuan.value = centsToInput(num(row['total']))
  taxRate.value = String(num(row['tax_rate']))
  note.value = q.note || ''
  statusIdx.value = Math.max(0, Math.min(4, num(row['status'])))
  isFullQuote.value = String(row['quote_type'] ?? '') === 'full'
  const ci = customers.value.findIndex((c) => Number(c.id) === num(row['customer_id']))
  customerIdx.value = ci >= 0 ? ci + 1 : 0
  const pi = projects.value.findIndex((p) => Number(p.id) === num(row['project_id']))
  projectIdx.value = pi >= 0 ? pi + 1 : 0
})

function onCustomerChange(e: { detail: { value: number | string } }) {
  customerIdx.value = Number(e.detail.value)
}

function onProjectChange(e: { detail: { value: number | string } }) {
  projectIdx.value = Number(e.detail.value)
}

function onStatusChange(e: { detail: { value: number | string } }) {
  statusIdx.value = Number(e.detail.value)
}

async function onSave() {
  const t = title.value.trim()
  if (!t) {
    uni.showToast({ title: '请填写报价标题', icon: 'none' })
    return
  }
  // 编辑详细报价时保留原明细，避免覆盖
  let linesJson = '[]'
  if (editId.value) {
    const old = (data.quotes as Quote[]).find((r) => Number(r.id) === editId.value) as DataRow | undefined
    linesJson = String(old?.['lines_json'] ?? '[]')
  }
  const payload: DataRow = {
    title: t,
    customer_id: customerIdx.value > 0 ? customers.value[customerIdx.value - 1].id : null,
    project_id: projectIdx.value > 0 ? projects.value[projectIdx.value - 1].id : null,
    quote_type: isFullQuote.value ? 'full' : 'simple',
    tax_include: 1,
    tax_rate: Math.max(0, Number(taxRate.value) || 0),
    total: Math.round((Number(totalYuan.value) || 0) * 100),
    status: statusIdx.value,
    lines_json: linesJson,
    note: note.value.trim() || null
  }
  saving.value = true
  try {
    const ok = editId.value
      ? await data.updateQuote(editId.value, payload)
      : await data.createQuote(payload)
    if (ok) uni.navigateBack()
  } finally {
    saving.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  padding: 24rpx;
}

.tip {
  background: #fff7e8;
  color: #b7791f;
  border-radius: 16rpx;
  padding: 18rpx 24rpx;
  margin-bottom: 16rpx;
  font-size: 24rpx;
}

.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 0 28rpx;
}

.cell {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f0f1f5;

  &:last-child {
    border-bottom: none;
  }

  &.col {
    flex-direction: column;
    align-items: stretch;
  }
}

.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #1f2430;
  flex-shrink: 0;
}

.cell.col .label {
  width: auto;
  margin-bottom: 12rpx;
}

.field {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.unit {
  margin-left: 8rpx;
  font-size: 26rpx;
  color: #8a93a6;
}

.picker {
  flex: 1;
}

.picker-value {
  font-size: 28rpx;
  color: #1f2430;
}

.picker-value.placeholder {
  color: #b6bcc9;
}

.textarea {
  width: 100%;
  min-height: 140rpx;
  font-size: 28rpx;
  color: #1f2430;
  background: #f8f9fc;
  border-radius: 12rpx;
  padding: 16rpx;
  box-sizing: border-box;
}

.save-btn {
  margin-top: 40rpx;
  background: #4a5af0;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
