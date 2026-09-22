/**
 * 客户标签工具（对齐 App 第19批 标签系统）
 * - 预设标签池种子：与 App database.dart _seedTags 完全一致（6 个标签 + 各自默认色）
 * - 色板：与 App _createTagDialog / _TagManagePage palette 一致
 * - 色值口径：App 存 ARGB int（Flutter Material Color.value），小程序无 Color(int)，
 *   统一用 tagColorCss 转成 '#RRGGBB' 再交给 CSS / alphaColor 使用。
 */

/** 默认标签色（对齐 App Tag 默认值 0xFF4C9AFF） */
export const DEFAULT_TAG_COLOR = 0xff4c9aff

/** 标签色板（对齐 App 标签新建/编辑弹层的 8 色） */
export const TAG_PALETTE: number[] = [
  0xffe53935,
  0xfffb8c00,
  0xfffdd835,
  0xff43a047,
  0xff00897b,
  0xff1e88e5,
  0xff8e24aa,
  0xff546e7a
]

/** 预设标签池种子（对齐 App _seedTags；name 唯一，重复写入需按名称去重） */
export const TAG_SEED: Array<{ name: string; color: number }> = [
  { name: '重要客户', color: 0xffe53935 },
  { name: '回头客', color: 0xfffb8c00 },
  { name: '潜在客户', color: 0xff1e88e5 },
  { name: '已成交', color: 0xff43a047 },
  { name: '难沟通', color: 0xff8e24aa },
  { name: '待跟进', color: 0xff00897b }
]

/** 标签名称长度上限（对齐 App maxLength: 8） */
export const TAG_NAME_MAX = 8

/** ARGB / RGB 整型色值 → '#RRGGBB'（非法值回落品牌蓝） */
export function tagColorCss(color: unknown): string {
  const n = Math.trunc(Number(color))
  if (!Number.isFinite(n) || n <= 0) return '#4C9AFF'
  const rgb = n > 0xffffff ? n & 0xffffff : n
  return `#${rgb.toString(16).padStart(6, '0').toUpperCase()}`
}
