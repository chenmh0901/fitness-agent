# Fitness AI Agent MVP

个人健身 AI Agent 的移动端优先 MVP。仓库包含 NestJS/PostgreSQL 后端和 Ionic
Vue Web/PWA，支持查看今日体重、睡眠与训练状态，并通过 Agent Tool Calling
读取和写入个人健身数据。

## 技术栈

- NestJS 11
- TypeScript 5
- Prisma ORM 7
- PostgreSQL 18
- OpenAI SDK
- Ionic Vue 8
- Vue 3 + Vite
- pnpm

## 环境要求

- Node.js 20.19+、22.12+ 或 24+
- pnpm 11+
- Docker 与 Docker Compose（推荐用于本地 PostgreSQL）

## 后端本地启动

1. 创建本地环境变量文件：

   ```bash
   cp .env.example .env
   ```

   PowerShell：

   ```powershell
   Copy-Item .env.example .env
   ```

2. 安装依赖：

   ```bash
   pnpm install
   ```

3. 启动 PostgreSQL：

   ```bash
   docker compose up -d
   ```

4. 生成 Prisma Client：

   ```bash
   pnpm prisma:generate
   ```

5. 启动开发服务器：

   ```bash
   pnpm start:dev
   ```

应用默认监听 `http://localhost:3000`，全局 API 前缀为 `/api`。

## 移动端 Web/PWA 启动

1. 创建移动端环境文件：

   ```powershell
   Copy-Item apps/mobile/.env.example apps/mobile/.env
   ```

2. 确认后端已经运行，然后启动 Ionic Vite：

   ```bash
   pnpm mobile:dev
   ```

3. 浏览器访问 `http://localhost:5173`。同一局域网内调试真机时，需要将
   `VITE_API_BASE_URL` 和后端 `APP_CORS_ORIGINS` 调整为电脑可访问的局域网地址。

移动端当前以 Web/PWA 运行，不包含 Capacitor 或原生安装包。

## HTTP 接口

### 获取今日健身摘要

```http
GET /api/daily/today
```

调用示例：

```bash
curl http://localhost:3000/api/daily/today
```

响应示例：

```json
{
  "localDate": "2026-07-30",
  "generatedAt": "2026-07-30T02:30:00.000Z",
  "weightSummary": {
    "days": 7,
    "recordCount": 0,
    "averageWeight": null,
    "firstWeight": null,
    "latestWeight": null,
    "change": null,
    "trend": "insufficient_data"
  },
  "sleepSummary": {
    "days": 7,
    "recordCount": 0,
    "recentSleep": [],
    "averageDurationMinutes": null,
    "averageQuality": null,
    "status": "no_data"
  },
  "todayWorkout": null,
  "recommendationsContext": {
    "userProfile": null,
    "recentExercisePerformance": []
  }
}
```

### Agent 对话

```http
POST /api/agent/chat
Content-Type: application/json
```

调用示例：

```bash
curl -X POST http://localhost:3000/api/agent/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"今天早上90.5kg"}'
```

请求：

```json
{
  "message": "今天早上90.5kg"
}
```

响应：

```json
{
  "answer": "已记录今天的晨起体重为90.5kg。"
}
```

`message` 会先去除首尾空格，空字符串或仅包含空白字符的消息返回 HTTP 400。

## 时区与日期

- 应用时区通过 `APP_TIMEZONE` 配置，默认使用 `Asia/Shanghai`。
- 应用启动时将 Node.js 进程时区设置为该值，体重、睡眠和训练的“今天”使用同一时区边界。
- `/api/daily/today` 只提供真正的当前日期，不接收历史日期参数。
- `localDate` 使用 `YYYY-MM-DD` 表示业务日期，不再使用 UTC 时间戳表达“哪一天”。
- `generatedAt` 使用 ISO 8601 时间戳表示摘要生成时刻。

## CORS

后端通过 `APP_CORS_ORIGINS` 维护前端来源白名单，多个来源使用逗号分隔。默认开发值为：

```env
APP_CORS_ORIGINS=http://localhost:5173
```

配置拒绝通配符 `*`，生产环境应填写实际部署的 HTTPS 来源。

## 错误响应

所有 HTTP 错误使用统一结构。参数校验失败示例：

```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Request validation failed",
  "details": ["message should not be empty"],
  "timestamp": "2026-07-30T01:00:00.000Z",
  "path": "/api/agent/chat"
}
```

未预期的 Agent 或 Provider 错误只返回通用 HTTP 500 信息，不会向客户端返回 OpenAI
错误内容、API Key 或内部调用栈。

## 项目结构

```text
.
├── prisma/
│   └── schema.prisma
├── apps/
│   └── mobile/                 # Ionic Vue Web/PWA
│       ├── src/api/            # 统一 API Client
│       ├── src/components/     # 今日卡片与聊天消息
│       ├── src/views/          # 今日、聊天和 Tabs 页面
│       └── src/types/          # 后端响应类型
├── src/
│   ├── common/
│   │   ├── config/
│   │   └── http/
│   ├── modules/
│   │   ├── agent/
│   │   ├── user/
│   │   ├── workout/
│   │   ├── weight/
│   │   ├── sleep/
│   │   └── knowledge/
│   ├── prisma/
│   ├── app.module.ts
│   └── main.ts
├── compose.yaml
└── prisma.config.ts
```

`src/generated/prisma/` 由 `pnpm prisma:generate` 自动生成，并已加入 `.gitignore`。

## 环境变量

| 变量                | 必填     | 默认示例                                                                  | 用途              |
| ------------------- | -------- | ------------------------------------------------------------------------- | ----------------- |
| `NODE_ENV`          | 否       | `development`                                                             | 运行环境          |
| `PORT`              | 否       | `3000`                                                                    | HTTP 监听端口     |
| `APP_TIMEZONE`      | 否       | `Asia/Shanghai`                                                           | 应用 IANA 时区    |
| `APP_CORS_ORIGINS`  | 否       | `http://localhost:5173`                                                   | 前端来源白名单    |
| `DATABASE_URL`      | 是       | `postgresql://fitness:fitness@localhost:5432/fitness_agent?schema=public` | PostgreSQL 连接   |
| `AI_PROVIDER`       | 否       | `deepseek`                                                                | AI Provider 选择  |
| `DEEPSEEK_API_KEY`  | 生产必填 | 留空                                                                      | DeepSeek API Key  |
| `DEEPSEEK_MODEL`    | 否       | `deepseek-v4-flash`                                                       | DeepSeek 模型名称 |
| `OPENAI_API_KEY`    | 生产必填 | 留空                                                                      | OpenAI API Key    |
| `OPENAI_MODEL`      | 是       | `gpt-4.1-mini`                                                            | OpenAI 模型名称   |
| `POSTGRES_DB`       | Compose  | `fitness_agent`                                                           | 本地数据库名      |
| `POSTGRES_USER`     | Compose  | `fitness`                                                                 | 本地数据库用户    |
| `POSTGRES_PASSWORD` | Compose  | `fitness`                                                                 | 本地数据库密码    |

应用启动时会校验端口、数据库连接、AI Provider 配置和 IANA 时区。开发和测试环境可不配置
Provider API Key，此时 Daily API 等非 AI 功能仍可使用，调用 Agent Chat 会返回统一服务错误；
生产环境必须配置有效的 API Key。

默认使用 DeepSeek：

```env
AI_PROVIDER=deepseek
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_MODEL=deepseek-v4-flash
```

切换到 OpenAI 只需修改环境变量并重启后端：

```env
AI_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

移动端环境变量：

| 变量                | 默认示例                    | 用途              |
| ------------------- | --------------------------- | ----------------- |
| `VITE_API_BASE_URL` | `http://localhost:3000/api` | 后端 API 基础地址 |

## 常用命令

| 命令                               | 作用                     |
| ---------------------------------- | ------------------------ |
| `pnpm start:dev`                   | 以监听模式启动开发服务器 |
| `pnpm build`                       | 构建生产代码             |
| `pnpm test`                        | 运行全部测试             |
| `pnpm test:e2e`                    | 运行 HTTP 端到端测试     |
| `pnpm lint`                        | 执行静态检查             |
| `pnpm format`                      | 格式化源码与配置         |
| `pnpm mobile:dev`                  | 启动移动端开发服务器     |
| `pnpm mobile:test`                 | 运行移动端单元测试       |
| `pnpm mobile:build`                | 类型检查并构建移动端 PWA |
| `pnpm prisma:generate`             | 生成 Prisma Client       |
| `pnpm prisma:validate`             | 校验 Prisma Schema       |
| `pnpm db:migrate -- --name <name>` | 创建并应用开发迁移       |
| `pnpm db:deploy`                   | 在部署环境应用已有迁移   |
| `pnpm db:studio`                   | 打开 Prisma Studio       |

## 当前范围

- 单用户个人健身 MVP，不包含登录、JWT 或多用户隔离。
- 提供今日摘要和 Agent 对话两个 HTTP 接口。
- Agent 支持读取以及写入体重、睡眠和训练数据。
- 移动端聊天只保存在当前浏览器会话，不写入数据库。
- 不包含 Capacitor、原生 App 打包或前端直连 OpenAI。
- 暂不包含 Swagger、限流、缓存、消息队列或历史日期摘要接口。
