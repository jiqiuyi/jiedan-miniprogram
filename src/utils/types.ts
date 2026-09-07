/**
 * 业务数据模型（与后端 data.json / sync 协议字段对齐）
 */

export interface Customer {
  id: number
  name?: string
  company?: string
  contact?: string
  phone?: string
  address?: string
  remark?: string
  create_time?: number
  [key: string]: unknown
}

export interface Project {
  id: number
  title?: string
  customer_id?: number
  amount_total?: number
  status?: number
  start_time?: number
  deadline?: number
  remark?: string
  create_time?: number
  [key: string]: unknown
}

export interface QuoteItem {
  id?: number
  name?: string
  title?: string
  spec?: string
  desc?: string
  price?: number
  amount?: number
  qty?: number
  [key: string]: unknown
}

export interface Quote {
  id: number
  title?: string
  customer_id?: number
  project_id?: number
  total?: number
  tax_rate?: number
  remark?: string
  items?: QuoteItem[]
  create_time?: number
  [key: string]: unknown
}

export interface Payment {
  id: number
  amount?: number
  method?: string
  status?: number
  create_time?: number
  [key: string]: unknown
}
