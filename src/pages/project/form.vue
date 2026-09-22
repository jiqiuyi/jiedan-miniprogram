<template>
  <view class="page">
    <view class="card">
      <!-- 项目名称 *（对齐 App projects_page.dart _addProject / _editProject 弹层首字段） -->
      <view class="cell">
        <text class="label">项目名称 *</text>
        <input
          v-model="title"
          class="field"
          placeholder="如：品牌官网改版"
          :maxlength="40"
          confirm-type="done"
        />
      </view>

      <!-- 所属客户（对齐 App DropdownButtonFormField：仅可从既有客户中选择，默认选第一个） -->
      <view class="cell">
        <text class="label">所属客户</text>
        <picker
          class="picker-box"
          :range="customerNames"
          :value="customerIdx"
          :disabled="!customerNames.length"
          @change="onCustomerChange"
        >
          <view class="picker-row">
            <text class="picker-text" :class="{ 'is-placeholder': customerPlaceholder }">
              {{ customerLabel }}
            </text>
            <text class="chevron">›</text>
          </view>
        </picker>
      </view>

      <!-- 约定总额（元）（对齐 App：moneyInputFormatters，仅数字 / 单小数点 / 最多两位小数） -->
      <view class="cell">
        <text class="label">约定总额（元）</text>
        <input
          v-model="amountYuan"
          class="field"
          type="digit"
          placeholder="0.00"
          @blur="onAmountBlur"
        />
      </view>
    </view>

    <view class="actions">
      <button class="btn btn-ghost" :disabled="saving" @tap="onCancel">取消</button>
      <button
        class="btn btn-primary"
        :class="{ 'is-disabled': !canSave }"
        :disabled="saving"
        :loading="saving"
        @tap="onSave"
      >{{ editId ? '保存' : '创建' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useDataStore } from '@/store/data'
import { useUserStore } from '@/store/user'
import type { Customer, DataRow, Project } from '@/utils/types'

const data = useDataStore()
const user = useUserStore()

const editId = ref(0)
const title = ref('')
const amountYuan = ref('')
const customerIdx = ref(0)
/** 编辑态：项目所属客户已不在本地客户列表（客户已删且项目为脏数据），未改动选择时保留原关联 */
const orphanCustomerId = ref(0)
const customerTouched = ref(false)
const saving = ref(false)

const customers = computed(() => data.customers as Customer[])
const customerNames = computed(() => customers.value.map((c) => String(c.name || '未命名客户')))

const customerLabel = computed(() => {
  if (orphanCustomerId.value && !customerTouched.value) return '原客户已删除'
  const c = customers.value[customerIdx.value]
  return c ? String(c.name || '未命名客户') : '暂无客户'
})

const customerPlaceholder = computed(
  () => !customers.value.length && !orphanCustomerId.value
)

/** 保存可用（对齐 App：项目名称 trim 为空时 FilledButton 置灰不可点） */
const canSave = computed(() => title.value.trim().length > 0)

/**
 * 金额输入规范化（对齐 App MoneyInputFormatter）：
 * 只保留数字与小数点；多个小数点只留第一个；小数位最多两位；孤立小数点补零（".5" → "0.5"）。
 */
function normalizeMoney(raw: string): string {
  let text = String(raw ?? '').replace(/[^0-9.]/g, '')
  const dot = text.indexOf('.')
  if (dot >= 0) {
    const intPart = text.slice(0, dot)
    let fracPart = text.slice(dot + 1).replace(/\./g, '')
    if (fracPart.length > 2) fracPart = fracPart.slice(0, 2)
    if (!intPart && !fracPart) text = ''
    else if (!intPart) text = `0.${fracPart}`
    else text = `${intPart}.${fracPart}`
  }
  return text
}

/** 元字符串 → 分（对齐 App Money.parseYuanToFen：非法或 <= 0 一律返回 0） */
function toFen(text: string): number {
  const v = Number(normalizeMoney(text).trim())
  if (!Number.isFinite(v) || v <= 0) return 0
  return Math.round(v * 100)
}

function onAmountBlur() {
  amountYuan.value = normalizeMoney(amountYuan.value)
}

onLoad(async (query) => {
  if (!user.isLoggedIn) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  editId.value = Number(query?.id || 0)
  uni.setNavigationBarTitle({ title: editId.value ? '编辑项目' : '新建项目' })
  await data.refresh()

  if (!editId.value) {
    // 对齐 App _addProject：无任何客户时不允许新建项目
    if (!customers.value.length) {
      uni.showToast({ title: '请先在「客户」页新建一个客户', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 800)
      return
    }
    customerIdx.value = 0
    return
  }

  const p = (data.projects as Project[]).find((r) => Number(r.id) === editId.value)
  if (!p) {
    uni.showToast({ title: '项目不存在', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 800)
    return
  }
  title.value = String(p.title || '')
  const total = Number(p.amount_total || 0)
  // 对齐 App _editProject：amountTotal > 0 时按两位小数回填，否则留空
  amountYuan.value = total > 0 ? (total / 100).toFixed(2) : ''
  const ci = customers.value.findIndex((c) => Number(c.id) === Number(p.customer_id))
  if (ci >= 0) {
    customerIdx.value = ci
  } else {
    orphanCustomerId.value = Number(p.customer_id || 0)
    customerIdx.value = 0
  }
})

function onCustomerChange(e: { detail: { value: number | string } }) {
  customerIdx.value = Number(e.detail.value)
  customerTouched.value = true
}

/** 最终落库的客户 id（未改动且原客户缺失时保留原关联，避免编辑时静默改客户） */
function resolveCustomerId(): number {
  if (orphanCustomerId.value && !customerTouched.value) return orphanCustomerId.value
  const c = customers.value[customerIdx.value]
  return c ? Number(c.id) : 0
}

function onCancel() {
  uni.navigateBack()
}

async function onSave() {
  const t = title.value.trim()
  if (!t) {
    uni.showToast({ title: '请填写项目名称', icon: 'none' })
    return
  }
  const cid = resolveCustomerId()
  if (cid <= 0) {
    uni.showToast({ title: '请先在「客户」页新建一个客户', icon: 'none' })
    return
  }
  const payload: DataRow = {
    customer_id: cid,
    title: t,
    amount_total: toFen(amountYuan.value)
  }
  // 对齐 App：新建项目初始状态为「接单」（ProjectStatus.accepted = 0）；
  // 编辑不改动 status / progress / deliver_date / due_date / remind_at（App _editProject 同样只改三字段）
  if (!editId.value) payload.status = 0

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
  width: 200rpx;
  font-size: 28rpx;
  color: #1f2430;
  flex-shrink: 0;
}

.field {
  flex: 1;
  font-size: 28rpx;
  color: #1f2430;
}

.picker-box {
  flex: 1;
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.picker-text {
  font-size: 28rpx;
  color: #1f2430;

  &.is-placeholder {
    color: #b6bcc9;
  }
}

.chevron {
  font-size: 32rpx;
  color: #c4c9d4;
  margin-left: 12rpx;
}

.actions {
  display: flex;
  align-items: center;
  margin-top: 40rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  line-height: 88rpx;
  border-radius: 44rpx;
  font-size: 30rpx;
  font-weight: 600;
  margin: 0;
}

.btn-ghost {
  background: rgba(74, 90, 240, 0.12);
  color: #4a5af0;
  margin-right: 20rpx;
}

.btn-primary {
  background: #4a5af0;
  color: #fff;
}

.btn-primary.is-disabled {
  opacity: 0.5;
}
</style>
