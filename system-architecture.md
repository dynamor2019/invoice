# 华能票据审核系统 - 系统架构图

## 整体架构概览

```mermaid
graph TB
    subgraph "前端层 (Frontend)"
        A[React + Vite 应用]
        A1[用户界面组件]
        A2[状态管理 Store]
        A3[路由管理 Router]
        A4[图表组件 Chart.js]
    end

    subgraph "后端层 (Backend)"
        B[Express.js 服务器]
        B1[认证中间件 JWT]
        B2[API 路由层]
        B3[业务逻辑层]
        B4[文件上传处理]
    end

    subgraph "数据层 (Database)"
        C[SQLite 数据库]
        C1[用户表 users]
        C2[项目表 projects]
        C3[报销单表 bills]
        C4[供应商表 suppliers]
        C5[合同表 contracts]
        C6[审计日志表 audit_logs]
    end

    subgraph "文件存储"
        D[本地文件系统]
        D1[项目附件]
        D2[报销凭证]
        D3[合同文件]
    end

    A --> B
    B --> C
    B --> D
    A2 --> A1
    A3 --> A1
    A4 --> A1
    B1 --> B2
    B2 --> B3
    B3 --> C
    B4 --> D
```

## 用户角色权限架构

```mermaid
graph TD
    subgraph "管理层"
        A1[董事长 Chairman]
        A2[总经理 GM]
        A3[副总经理 Deputy GM]
    end

    subgraph "业务层"
        B1[项目经理 Project Manager]
        B2[采购经理 Procurement Manager]
        B3[造价主管 Cost Manager]
        B4[财务主管 Finance Manager]
    end

    subgraph "执行层"
        C1[会计 Accountant]
        C2[员工 Staff]
    end

    subgraph "系统层"
        D1[管理员 Admin]
    end

    A1 --> |三级审批| B1
    A2 --> |二级审批| A1
    A3 --> |一级审批| A2
    B1 --> |项目管理| C1
    B2 --> |采购管理| C1
    B3 --> |造价管理| C1
    B4 --> |财务管理| C1
    C1 --> |记账归档| C2
    D1 --> |系统管理| A1
```

## 业务流程架构

```mermaid
graph LR
    subgraph "项目管理流程"
        P1[项目创建] --> P2[项目审批]
        P2 --> P3[项目执行]
        P3 --> P4[项目归档]
    end

    subgraph "报销审批流程"
        R1[报销申请] --> R2[一级审批]
        R2 --> R3[二级审批]
        R3 --> R4[三级审批]
        R4 --> R5[会计处理]
        R5 --> R6[归档完成]
    end

    subgraph "采购合同流程"
        C1[合同创建] --> C2[合同审批]
        C2 --> C3[合同执行]
        C3 --> C4[付款记录]
        C4 --> C5[合同归档]
    end

    P3 --> R1
    P3 --> C1
    C4 --> R1
```

## 技术栈架构

```mermaid
graph TB
    subgraph "前端技术栈"
        F1[React 19.1.1]
        F2[Vite 构建工具]
        F3[React Router 路由]
        F4[Chart.js 图表]
        F5[Tailwind CSS 样式]
        F6[Material-UI 组件]
    end

    subgraph "后端技术栈"
        B1[Node.js 运行时]
        B2[Express.js 框架]
        B3[SQLite3 数据库]
        B4[JWT 认证]
        B5[Multer 文件上传]
        B6[CORS 跨域]
    end

    subgraph "开发工具"
        D1[ESLint 代码检查]
        D2[PostCSS 样式处理]
        D3[PM2 进程管理]
        D4[XLSX 文件处理]
    end

    F1 --> B2
    F2 --> B1
    B2 --> B3
    B4 --> B2
    B5 --> B2
```

## 数据库架构

```mermaid
erDiagram
    USERS {
        string id PK
        string name
        string role
        string passwordHash
        string createdAt
    }

    PROJECTS {
        string id PK
        string name
        string code
        string client
        string totalBudgetEnc
        string approvalStatus
        string managerId FK
        string createdAt
    }

    BILLS {
        string id PK
        string projectId FK
        string userId FK
        decimal amount
        string status
        string reason
        string createdAt
    }

    SUPPLIERS {
        string id PK
        string name
        string address
        string email
        string mainProducts
        string createdAt
    }

    SUPPLIER_CONTRACTS {
        string id PK
        string projectId FK
        string contractNo
        string contractName
        string supplierName
        decimal contractAmount
        string status
        string createdAt
    }

    CONTRACT_PAYMENTS {
        string id PK
        string contractId FK
        decimal paymentAmount
        string paymentDate
        string paymentMethod
        string createdAt
    }

    NOTIFICATIONS {
        string id PK
        string userId FK
        string title
        string message
        string type
        boolean isRead
        string createdAt
    }

    AUDIT_LOGS {
        string id PK
        string userId FK
        string action
        string resource
        string resourceId
        string details
        string createdAt
    }

    USERS ||--o{ PROJECTS : manages
    USERS ||--o{ BILLS : creates
    PROJECTS ||--o{ BILLS : contains
    PROJECTS ||--o{ SUPPLIER_CONTRACTS : has
    SUPPLIER_CONTRACTS ||--o{ CONTRACT_PAYMENTS : receives
    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ AUDIT_LOGS : generates
```

## 功能模块架构

```mermaid
graph TB
    subgraph "核心功能模块"
        M1[用户认证模块]
        M2[项目管理模块]
        M3[报销审批模块]
        M4[供应商管理模块]
        M5[合同管理模块]
        M6[统计分析模块]
        M7[通知系统模块]
        M8[审计日志模块]
    end

    subgraph "支撑功能模块"
        S1[文件上传模块]
        S2[权限控制模块]
        S3[数据加密模块]
        S4[Excel导入导出]
        S5[图表展示模块]
    end

    M1 --> S2
    M2 --> S1
    M2 --> S4
    M2 --> S5
    M3 --> S2
    M4 --> S4
    M5 --> S1
    M6 --> S5
    M7 --> S2
    M8 --> S3
```

## 部署架构

```mermaid
graph TB
    subgraph "开发环境"
        D1[Vite Dev Server :5173]
        D2[Express Server :8080]
        D3[SQLite Database]
        D4[本地文件存储]
    end

    subgraph "生产环境"
        P1[Nginx 反向代理]
        P2[PM2 进程管理]
        P3[Express 应用]
        P4[SQLite 数据库]
        P5[文件存储系统]
    end

    D1 --> D2
    D2 --> D3
    D2 --> D4

    P1 --> P2
    P2 --> P3
    P3 --> P4
    P3 --> P5
```

## 安全架构

```mermaid
graph TB
    subgraph "认证安全"
        A1[JWT Token 认证]
        A2[密码哈希存储]
        A3[会话管理]
    end

    subgraph "授权安全"
        B1[角色权限控制]
        B2[API 访问控制]
        B3[数据访问控制]
    end

    subgraph "数据安全"
        C1[敏感数据加密]
        C2[审计日志记录]
        C3[文件访问控制]
    end

    A1 --> B1
    A2 --> A1
    A3 --> A1
    B1 --> B2
    B2 --> B3
    B3 --> C1
    C1 --> C2
    C2 --> C3
```

## 系统特性

### 核心特性
- **多角色权限管理**: 支持8种不同角色的权限控制
- **完整审批流程**: 三级审批制度，支持免审阈值设置
- **项目全生命周期管理**: 从立项到归档的完整流程
- **智能编号生成**: 自动生成符合规则的项目编号
- **实时统计分析**: 动态图表展示项目和财务数据

### 技术特性
- **前后端分离**: React + Express 架构
- **响应式设计**: 支持多种设备访问
- **文件管理**: 支持多种格式文件上传和管理
- **数据导入导出**: Excel 格式数据处理
- **实时通知**: 基于角色的消息通知系统

### 安全特性
- **JWT 认证**: 无状态身份验证
- **数据加密**: 敏感信息加密存储
- **权限控制**: 细粒度的功能权限管理
- **审计追踪**: 完整的操作日志记录