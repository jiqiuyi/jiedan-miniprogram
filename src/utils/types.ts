/**
 * 业务数据模型
 * 字段与 App 端同步行对齐（App SQLite 列名，snake_case）
 * 每行可附带同步元字段：_ts（毫秒时间戳）、_deleted（墓碑标记）
 * 兼容旧行：均允许额外未知字段（[key: string]: unknown）
 */

export interface Customer {
  id: number
  name?: string
  contact?: string
  note?: string
  industry?: string
  source?: string
  location?: string
  last_contact_at?: number
  created_at?: number
  updated_at?: number
  /** 旧版兼容 */
  phone?: string
  [key: string]: unknown
}

export interface Project {
  id: number
  customer_id?: number
  title?: string
  /** 0 接单 / 1 制作中 / 2 待收尾款 / 3 完结（对齐 App ProjectStatus） */
  status?: number
  /** 约定总额，单位：分 */
  amount_total?: number
  due_date?: number
  remind_at?: number
  /** 进度 0-100 */
  progress?: number
  deliver_date?: number
  created_at?: number
  updated_at?: number
  [key: string]: unknown
}

export interface QuoteLine {
  itemName?: string
  /** 工时（小时，可小数） */
  hours?: number
  /** 工时单价，单位：分/小时 */
  hourRate?: number
  /** 材料费，单位：分 */
  materialFee?: number
  [key: string]: unknown
}

export interface Quote {
  id: number
  project_id?: number
  customer_id?: number
  title?: string
  /** 税率，百分比数值（如 6 表示 6%） */
  tax_rate?: number
  /** 明细行 JSON 字符串（lines: QuoteLine[]） */
  lines_json?: string
  /** 总额，单位：分 */
  total?: number
  created_at?: number
  /** simple | full */
  quote_type?: string
  note?: string
  /** 1 含税 / 0 不含税 */
  tax_include?: number
  /** 0 草稿 / 1 已发送 / 2 客户确认 / 3 已成交 / 4 已作废 */
  status?: number
  is_template?: number
  updated_at?: number
  image_path?: string
  [key: string]: unknown
}

export interface Payment {
  id: number
  project_id?: number
  amount?: number
  /** deposit 定金 / balance 尾款 / full 全额 / custom 自定义 */
  type?: string
  type_label?: string
  paid_at?: number
  note?: string
  reconciled?: number
  quote_id?: number
  created_at?: number
  updated_at?: number
  [key: string]: unknown
}

/** 同步表名与行类型映射 */
export type SyncTableName = 'customers' | 'projects' | 'quotes' | 'payments'

/** 通用可写行 */
export type DataRow = Record<string, unknown>
