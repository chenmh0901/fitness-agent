# Fitness AI Agent Backend

个人健身 AI Agent 的 MVP 后端骨架。项目基于 NestJS、TypeScript、Prisma ORM 和
PostgreSQL，目前只包含基础设施与领域模块边界，不包含业务接口、数据模型或 AI 调用逻辑。

## 技术栈

- NestJS 11
- TypeScript 5
- Prisma ORM 7
- PostgreSQL 18
- pnpm

## 环境要求

- Node.js 20.19+、22.12+ 或 24+
- pnpm 11+
- Docker 与 Docker Compose（推荐用于本地 PostgreSQL）

## 本地启动

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

应用默认监听 `http://localhost:3000`，全局 API 前缀为 `/api`。当前未实现 HTTP 路由，
因此不会提供业务端点。

## 项目结构

```text
.
├── prisma/
│   └── schema.prisma          # Prisma 数据源与 Client 生成配置
├── src/
│   ├── common/
│   │   └── config/            # 跨模块环境配置与校验
│   ├── modules/
│   │   ├── agent/             # AI Agent 编排模块
│   │   ├── user/              # 用户基础信息模块
│   │   ├── workout/           # 训练计划与训练记录模块
│   │   ├── weight/            # 体重记录模块
│   │   ├── sleep/             # 睡眠记录模块
│   │   └── knowledge/         # 健身知识库模块
│   ├── prisma/                # PrismaModule 与 PrismaService
│   ├── app.module.ts          # 根模块
│   └── main.ts                # 应用入口
├── compose.yaml               # 本地 PostgreSQL
└── prisma.config.ts           # Prisma CLI 配置
```

`src/generated/prisma/` 由 `pnpm prisma:generate` 自动生成，并已加入 `.gitignore`。

## 环境变量

| 变量                | 必填    | 默认示例                                                                  | 用途            |
| ------------------- | ------- | ------------------------------------------------------------------------- | --------------- |
| `NODE_ENV`          | 否      | `development`                                                             | 运行环境        |
| `PORT`              | 否      | `3000`                                                                    | HTTP 监听端口   |
| `DATABASE_URL`      | 是      | `postgresql://fitness:fitness@localhost:5432/fitness_agent?schema=public` | PostgreSQL 连接 |
| `POSTGRES_DB`       | Compose | `fitness_agent`                                                           | 本地数据库名    |
| `POSTGRES_USER`     | Compose | `fitness`                                                                 | 本地数据库用户  |
| `POSTGRES_PASSWORD` | Compose | `fitness`                                                                 | 本地数据库密码  |

应用启动时会校验 `NODE_ENV`、`PORT` 和 `DATABASE_URL`。生产环境必须替换示例凭据。

## 常用命令

| 命令                               | 作用                     |
| ---------------------------------- | ------------------------ |
| `pnpm start:dev`                   | 以监听模式启动开发服务器 |
| `pnpm build`                       | 构建生产代码             |
| `pnpm lint`                        | 执行静态检查             |
| `pnpm format`                      | 格式化源码与配置         |
| `pnpm prisma:generate`             | 生成 Prisma Client       |
| `pnpm prisma:validate`             | 校验 Prisma Schema       |
| `pnpm db:migrate -- --name <name>` | 创建并应用开发迁移       |
| `pnpm db:deploy`                   | 在部署环境应用已有迁移   |
| `pnpm db:studio`                   | 打开 Prisma Studio       |

## 当前范围

- 已建立六个空 NestJS 领域模块并在根模块注册。
- 已配置环境变量加载与启动校验。
- 已配置 PostgreSQL、Prisma Client 和全局 `PrismaService`。
- 尚未定义 Prisma 数据模型、数据库迁移、Controller、Service、DTO、认证或 AI Provider。
