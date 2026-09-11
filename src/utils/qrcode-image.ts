/**
 * 收款码图片工具（返现提现专用）
 * - 选择相册图片 → 压缩为 data:image/...;base64（单张解码后严格 ≤200KB）
 * - 与本地钱包（localWallet 收款码，仅存本机路径）严格分离，互不复用
 * 备注：压缩优先使用 uni.compressImage（微信小程序端输出 jpg，质量可控）；
 *      原图已达标则直接使用，避免不必要的画质损失。
 */

/** 单张收款码 base64 解码后的字节上限（与服务端校验保持一致） */
export const QR_MAX_BYTES = 200 * 1024

/** 计算 base64 字符串解码后的字节数（兼容带 data: 前缀） */
export function base64Bytes(b64: string): number {
  const s = b64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '')
  const pad = s.endsWith('==') ? 2 : s.endsWith('=') ? 1 : 0
  return Math.max(0, Math.floor((s.length * 3) / 4) - pad)
}

function mimeOf(path: string): string {
  const lower = path.toLowerCase()
  if (lower.indexOf('.png') >= 0) return 'png'
  if (lower.indexOf('.webp') >= 0) return 'webp'
  return 'jpeg'
}

/** 从相册选择一张图片，返回临时文件路径 */
export function chooseQrcodeImage(): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0]
        if (f) resolve(f.tempFilePath)
        else reject(new Error('未选择图片'))
      },
      fail: () => reject(new Error('cancel'))
    })
  })
}

function readFileBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      uni.getFileSystemManager().readFile({
        filePath: path,
        encoding: 'base64',
        success: (res: { data: string | ArrayBuffer }) => {
          if (typeof res.data === 'string') resolve(res.data)
          else reject(new Error('读取图片失败'))
        },
        fail: () => reject(new Error('读取图片失败'))
      })
    } catch {
      reject(new Error('读取图片失败'))
    }
  })
}

function getImageInfo(path: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    uni.getImageInfo({
      src: path,
      success: (res) => resolve({ width: res.width, height: res.height }),
      fail: () => resolve({ width: 0, height: 0 })
    })
  })
}

function compress(
  src: string,
  quality: number,
  opts: { compressedWidth?: number; compressedHeight?: number }
): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.compressImage({
      src,
      quality,
      compressedWidth: opts.compressedWidth,
      compressedHeight: opts.compressedHeight,
      success: (res) => resolve(res.tempFilePath),
      fail: () => reject(new Error('图片压缩失败'))
    })
  })
}

/**
 * 选择图片并返回 ≤200KB 的 data url。
 * 用户取消选择时抛出 Error('cancel')，由调用方静默处理。
 */
export async function pickQrcodeDataUrl(): Promise<string> {
  const src = await chooseQrcodeImage()
  const raw = await readFileBase64(src)
  if (base64Bytes(raw) <= QR_MAX_BYTES) {
    return `data:image/${mimeOf(src)};base64,${raw}`
  }
  const info = await getImageInfo(src)
  const longEdge = Math.max(info.width, info.height)
  const landscape = info.width >= info.height
  const sizes = [900, 720, 560, 440, 340]
  const qualities = [80, 65, 50, 35, 25]
  for (const size of sizes) {
    // 原图比目标尺寸还小则不再放大，直接沿用原边长
    const edge = longEdge > 0 ? Math.min(size, longEdge) : size
    for (const q of qualities) {
      try {
        const out = await compress(
          src,
          q,
          landscape ? { compressedWidth: edge } : { compressedHeight: edge }
        )
        const b64 = await readFileBase64(out)
        if (base64Bytes(b64) <= QR_MAX_BYTES) {
          return `data:image/jpeg;base64,${b64}`
        }
      } catch {
        // 单次压缩失败继续尝试更低的参数
      }
    }
  }
  throw new Error('图片过大，请裁剪后重试')
}
