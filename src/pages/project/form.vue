<template>
  <view class="page">
    <view class="card">
      <view class="cell">
        <text class="label">项目名称</text>
        <input v-model="title" class="field" placeholder="必填，如：品牌官网设计" />
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
        <text class="label">约定金额（元）</text>
        <input v-model="amountYuan" class="field" type="digit" placeholder="0.00" />
      </view>

      <view class="cell">
        <text class="label">项目状态</text>
        <picker class="picker" :range="statusNames" :value="statusIdx" @change="onStatusChange">
          <view class="picker-value">{{ statusNames[statusIdx] }}</view>
        </picker>
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
import type { Customer, Project, DataRow } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const editId = ref(0)
const title = ref('')
const amountYuan = ref('')
const statusIdx = ref(0)
const customerIdx = ref(0)
const saving = ref(false)

const statusNames = ['接单', '制作中', '待收尾款', '完结']

const customers = computed(() => data.customers as Customer[])
const customerNames = computed(() => ['不关联客户', ...customers.value.map((c) => c.name || '未命名')])

function centsToInput(cents: number | undefined): string {
  const n = Number(cents ?? 0)
  const v = Math.round(n) / 100
  return Number.isNaN(v) ? '' : String(v)
}

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await data.refresh()
  if (!query?.id) return
  editId.value = Number(query.id)
  const p = (data.projects as Project[]).find((r) => Number(r.id) === editId.value)
  if (!p) {
    uni.showToast({ title: '项目不存在', icon: 'none' })
    return
  }
  title.value = p.title || ''
  amountYuan.value = centsToInput(p.amount_total)
  statusIdx.value = Math.max(0, Math.min(3, Number(p.status ?? 0)))
  const ci = customers.value.findIndex((c) => Number(c.id) === Number(p.customer_id))
  customerIdx.value = ci >= 0 ? ci + 1 : 0
})

function onCustomerChange(e: { detail: { value: number | string } }) {
  customerIdx.value = Number(e.detail.value)
}

function onStatusChange(e: { detail: { value: number | string } }) {
  statusIdx.value = Number(e.detail.value)
}

async function onSave() {
  const t = title.value.trim()
  if (!t) {
    uni.showToast({ title: '请填写项目名称', icon: 'none' })
    return
  }
  const payload: DataRow = {
    title: t,
    customer_id: customerIdx.value > 0 ? customers.value[customerIdx.value - 1].id : null,
    amount_total: Math.round((Number(amountYuan.value) || 0) * 100),
    status: statusIdx.value
  }
  saving.value = true
  try {
    const ok = editId.value
      ? await data.updateProject(editId.value, payload)
      : await data.createProject(payload)
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
}

.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #1f2430;
  flex-shrink: 0;
}

.field {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
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

.save-btn {
  margin-top: 40rpx;
  background: #4a5af0;
  color: #fff;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
}
</style>
