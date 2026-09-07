/**
 * 全局配置（9/15 备案通过后，只需改这里 + 微信后台合法域名）
 * @see DEV.md 部署说明
 */

// 开发期指向本地测试后端；9/15 后改为正式域名（如 https://api.example.com）
export const BASE_URL: string = 'http://127.0.0.1:8090'

// 登录态存储 key
export const TOKEN_KEY = 'jiedan_token'
export const USER_KEY = 'jiedan_user'

// 同步拉取的缓存 key
export const SYNC_CACHE_KEY = 'jiedan_sync_cache'
