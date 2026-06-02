# 🏥 Smart Elderly Care — 智慧养老微信小程序

> **Java Spring Boot 多角色智慧养老服务平台**  
> 面向老年人的 O2O 服务微信小程序后端，支持老人、监护人、服务人员三种角色，覆盖从预约下单到服务评价的完整服务闭环。

> ⚠️ **贡献说明**：本仓库为团队项目，本人负责后端开发、API 设计、数据库设计及前后端联调对接，非唯一贡献者。详细分工见项目文档。

---

## 1. 📌 项目一句话定位

**Java Spring Boot 多角色智慧养老服务平台后端** — 基于 Spring Boot 3 + JPA + MySQL + JWT 构建，微信小程序原生前端。实现老人/监护人/服务人员的多角色服务预约、状态流转、绑定关系和紧急救助，覆盖从创建到评价的完整服务生命周期。

---

## 2. 🖼️ Screenshots / Demo

| 角色 | 入口 | 核心页面 |
|------|------|---------|
| 👴 老人 | 首页 · 服务列表 · 紧急呼救 | 首页看板、服务详情、评价、紧急医疗信息、绑定管理 |
| 👨‍👩‍👧 监护人 | 首页 · 绑定管理 · 创建服务 | 创建服务、服务列表、绑定家人、投诉建议 |
| 👷 服务人员 | 服务任务列表 · 服务详情 | 任务列表、服务详情、上传记录 |

> 📱 在微信开发者工具中导入 `前端/miniprogram-1/miniprogram-1` 并编译预览。
> 📹 Demo 视频待录制。

---

## 3. ⚡ Tech Stack

| 层级 | 技术 | 版本 | 状态 |
|------|------|------|------|
| **语言** | Java | 17 | ✅ |
| **框架** | Spring Boot | 3.4.6 | ✅ |
| **ORM** | Spring Data JPA (Hibernate) | — | ✅ |
| **数据库** | MySQL | 8.x | ✅ |
| **认证** | JWT (jjwt) | 0.11.5 | ✅ |
| **HTTP 客户端** | Hutool HTTP | 5.8.13 | ✅ |
| **代码简化** | Lombok | 1.18.30 | ✅ |
| **JSON 处理** | Jackson | 2.15.2 | ✅ |
| **构建** | Maven (mvnw wrapper) | — | ✅ |
| **缓存** | Redis | — | 📌 待接入 |
| **容器化** | Docker Compose | — | 📌 待接入 |
| **API 文档** | SpringDoc OpenAPI / Swagger | — | 📌 待接入 |

---

## 4. 🎯 Core Features

| 功能 | 说明 | 涉及角色 |
|------|------|---------|
| **微信静默登录** | wx.login() → jscode2session → JWT，用户无感认证 | 全部 |
| **JWT 鉴权** | Token 解析验证，1 小时过期 | 全部 |
| **多角色注册** | 老人(0)、监护人(1)、日常员工(2)、护理员工(3)、精神服务员工(4) | 全部 |
| **服务预约** | 指定服务类型/时间/地址，为已绑定老人创建 | 老人、监护人 |
| **服务状态流转** | 未指派(0) → 待进行(1) → 进行中(2) → 待支付(3) → 待评价(4) → 已完成(5) | 全部 |
| **服务支付** | 状态校验后更新为待评价 | 老人、监护人 |
| **服务评价** | 1-5 星评分 + 文本评价 | 老人、监护人 |
| **老人-监护人绑定** | 手机号搜索 → 发起申请 → 对方确认/拒绝 → 已绑定/已解除 | 老人、监护人 |
| **紧急医疗信息** | 血型、过敏史、基础疾病、手术史、用药情况 | 老人 |
| **紧急求助** | 一键发送 GPS 位置 + 求助消息到服务器 | 老人 |

---

## 5. 🏗️ Architecture

### 分层架构

```
请求 → Controller（接收/校验） → Service（业务+权限） → Repository（JPA 自动 SQL） → MySQL
         ↑                                                                         ↑
         └────────────── JWT 鉴权（Token 解析） ───────────────────────────────────┘
```

### 代码组织

```
src/main/java/com/hecs/mini_program_backend/
├── MiniProgramBackendApplication.java    # 启动类
├── config/                               # 配置类（微信 CORS）
├── controller/                           # 5 个 @RestController
│   ├── LoginController.java              # POST /login 微信登录
│   ├── SignUpController.java             # POST /signup 注册/注销
│   ├── ServiceController.java            # /api/services/* CRUD+评价+支付
│   ├── BindController.java               # /api/bindings/* 绑定关系
│   └── EmergencyController.java          # /api/emergency/* 紧急救助
├── entity/                               # 4 个 JPA @Entity
├── mapper/                               # 4 个 JpaRepository
├── service/                              # 业务逻辑接口+实现
└── utils/                                # JWT Token 生成/解析
```

---

## 6. 💾 Database Design

```mermaid
erDiagram
    User ||--o{ Service : "创建/服务对象/服务人员"
    User ||--o{ UserBind : "老人/监护人"
    User ||--o{ Emergency : "老人医疗信息"

    User { int id PK; string open_id; int user_type "0老人 1监护人 2-4员工 99未注册" }
    Service { int service_id PK; int service_type; int service_status "0未指派 ~ 5已完成"; int creator_id FK; int target_id FK; int provider_id FK; datetime scheduled_time }
    UserBind { int bind_id PK; int elder_id FK; int guardian_id FK; int initiator_id FK; int bind_status "0待确认 1已绑定 2已拒绝" }
    Emergency { int emergency_id PK; int user_id FK; string blood_type; string allergies }
```

| 表名 | 说明 | 核心字段 |
|------|------|---------|
| `user` | 用户表（多角色合一） | open_id, user_type, nickname, phone_number |
| `service` | 服务订单表 | service_type, service_status, creator_id, target_id, provider_id |
| `user_bind` | 绑定关系 | elder_id, guardian_id, initiator_id, bind_status |
| `emergency` | 紧急医疗信息 | user_id, blood_type, allergies, basic_diseases |

---

## 7. 🌐 API Overview

| 模块 | 方法 | 路径 | 说明 |
|------|------|------|------|
| **用户认证** | POST | `/login` | 微信登录（code → JWT） |
| | POST | `/signup` | 注册/完善信息 |
| **服务管理** | GET | `/api/services` | 服务列表（分页） |
| | GET | `/api/services/{id}` | 服务详情 |
| | POST | `/api/services/create` | 创建服务 |
| | POST | `/api/services/update/{id}` | 更新服务 |
| | POST | `/api/services/cancel/{id}` | 取消服务 |
| | POST | `/api/services/evaluate/{id}` | 评价服务 |
| | POST | `/api/services/payment/{id}` | 支付服务 |
| **绑定管理** | GET | `/api/bindings` | 绑定列表 |
| | POST | `/api/bindings/create` | 创建绑定 |
| | PUT | `/api/bindings/{id}/status` | 更新绑定状态 |
| | POST | `/api/bindings/delete/{id}` | 解除绑定 |
| **紧急救助** | GET | `/api/emergency/info` | 获取紧急信息 |
| | POST | `/api/emergency/update` | 更新紧急信息 |
| | POST | `/api/emergency/help` | 发送求助 |

---

## 8. 🚀 Quick Start

```bash
# ① 克隆
git clone https://github.com/2002yy/smart-elderly-care.git
cd smart-elderly-care

# ② 启动数据库
docker compose up -d mysql

# ③ 配置后端
cd 后端/mini_program_backend
cp src/main/resources/application.properties.example src/main/resources/application.properties
# 编辑 application.properties，填入微信 appid/secret

# ④ 启动后端
./mvnw spring-boot:run
# 看到 "Tomcat started on port 8081" 即成功

# ⑤ 前端：微信开发者工具 → 导入 前端/miniprogram-1/miniprogram-1
```

### application.properties 示例

```properties
spring.datasource.url=jdbc:mysql://localhost:3306/MiniApp?serverTimezone=Asia/Shanghai
spring.datasource.username=root
spring.datasource.password=root
spring.jpa.hibernate.ddl-auto=update
wechat.appid=你的AppID
wechat.appsecret=你的AppSecret
server.port=8081
```

---

## 9. 🧪 Testing / CI

| 类型 | 覆盖 | 状态 |
|------|------|------|
| 手工测试用例 38 个 | 3 角色 + 4 功能模块 | ✅ |
| JUnit 单元测试 | Service 层 | 📌 待补 |
| MockMvc 集成测试 | Controller 层 | 📌 待补 |
| GitHub Actions CI | 自动构建+测试 | 📌 待补 |

---

## 10. 🗺️ Roadmap

### 已实现
- [x] 微信静默登录 + JWT 无状态认证
- [x] 多角色注册（老人/监护人/员工）
- [x] 服务完整生命周期（创建→执行→支付→评价）
- [x] 老人-监护人双向绑定
- [x] 紧急救助（定位 + 医疗信息）
- [x] 16 个 RESTful API 端点
- [x] 38 个手工测试用例

### 待补方向

| 方向 | 优先级 | 说明 |
|------|--------|------|
| **JUnit / MockMvc 最小测试** | P0 | Service 层 + Controller 层核心流程覆盖 |
| **OpenAPI 接口文档** | P1 | SpringDoc + Swagger UI，自动生成 |
| **Redis 缓存** | P1 | 验证码/登录态辅助/热点服务缓存 |
| **Docker Compose 完整后端 + MySQL** | P2 | Spring Boot JAR + MySQL 一键编排 |
| **GitHub Actions CI** | P1 | push 时自动 mvn verify + lint |
| **微信支付接入** | P2 | 替换模拟支付 |
| **紧急求助推送** | P2 | 微信模板通知监护人 |

---

## 11. 📄 Portfolio Notes

### 作品集说明

本仓库是 **Java 后端开发求职主项目之一**，重点展示：

| 能力维度 | 体现 |
|---------|------|
| **Spring Boot 工程化** | 分层架构、自动配置、JPA ORM、CORS |
| **RESTful API** | 16 个接口，资源导向 URL |
| **JWT 认证** | 微信静默登录 → JWT 无状态认证 |
| **多角色权限** | 5 种用户类型，前端+后端双重校验 |
| **数据库设计** | 4 表，多角色合一 user 表 |
| **状态机思维** | 6 状态流转 + 合法性校验 |
| **前后端联调** | 38 测试用例，接口文档，字段兼容 |

### License

MIT License
