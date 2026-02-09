# Notion to Markdown Chrome Extension

English | [简体中文](./README.zh-CN.md)

Convert Notion pages to Markdown format with one click, and automatically upload images to Tencent Cloud COS.

## ✨ 功能特性

- 🚀 **一键转换**: 在任何 Notion 页面点击插件图标即可转换为 Markdown
- 📸 **图片处理**: 自动下载 Notion 临时图片并上传到腾讯云 COS，生成永久链接
- 📋 **剪贴板集成**: 转换完成后自动复制到剪贴板，可直接粘贴使用
- ⚙️ **配置简单**: 一次配置，永久使用

## 🛠️ 技术栈

- **Notion API**: `@notionhq/client` - 官方 Notion API 客户端
- **Markdown 转换**: `notion-to-md` - Notion 块到 Markdown 的转换
- **云存储**: `cos-js-sdk-v5` - 腾讯云对象存储 SDK
- **构建工具**: Webpack 5

## 📦 安装步骤

### 1. 构建扩展

```bash
# 安装依赖
npm install

# 构建项目
npm run build
```

构建完成后会在 `dist/` 目录生成可安装的扩展文件。

### 2. 加载到 Chrome

1. 打开 Chrome 浏览器，访问 `chrome://extensions/`
2. 开启右上角的 **"开发者模式"**
3. 点击 **"加载已解压的扩展程序"**
4. 选择项目的 `dist/` 目录

## ⚙️ 配置说明

### 获取 Notion Integration Token

1. 访问 [Notion Integrations](https://www.notion.so/my-integrations)
2. 点击 **"New integration"**
3. 命名你的 Integration（如 "Markdown Exporter"）
4. 复制生成的 **Internal Integration Secret**（以 `secret_` 开头）

### 配置 Notion 页面权限

在你想要转换的 Notion 页面中：
1. 点击页面右上角的 `···` 菜单
2. 选择 **Connections** → **Connect to**
3. 选择你刚创建的 Integration

### 配置腾讯云 COS

1. 登录 [腾讯云控制台](https://console.cloud.tencent.com/cos)
2. 创建一个存储桶（Bucket）
3. 获取以下信息：
   - **Bucket 名称**: 格式为 `example-1250000000`
   - **Region**: 如 `ap-guangzhou`、`ap-shanghai` 等
   - **SecretId** 和 **SecretKey**: 在 [API 密钥管理](https://console.cloud.tencent.com/cam/capi) 获取

### 在扩展中配置

1. 点击浏览器工具栏的扩展图标
2. 填入上述获取的所有配置信息
3. 点击 **Save Settings**

## 🚀 使用方法

1. 打开任意 Notion 页面
2. 点击浏览器工具栏的扩展图标
3. 点击 **Convert & Copy** 按钮
4. 等待转换完成（会显示进度提示）
5. 转换完成后 Markdown 会自动复制到剪贴板
6. 在任意编辑器中粘贴使用

## 📝 注意事项

### CORS 配置

需要在腾讯云 COS Bucket 中配置 CORS 规则：

1. 进入 COS 控制台 → 选择 Bucket → 安全管理 → 跨域访问 CORS 设置
2. 添加规则：
   - **来源 Origin**: `chrome-extension://*` 或 `*`（测试用）
   - **允许的方法**: `PUT`, `POST`, `GET`
   - **允许的头部**: `*`

### 权限要求

- Notion 页面必须已授权给你的 Integration
- 确保 COS 配置的 SecretId/SecretKey 有上传权限

## 🏗️ 项目结构

```
chrome-extension/
├── src/
│   ├── manifest.json       # Chrome 扩展配置
│   ├── popup.html          # 扩展弹窗 UI
│   └── popup.js            # 核心逻辑（Notion API + COS 上传）
├── dist/                   # 构建输出目录（git ignored）
├── webpack.config.js       # Webpack 配置
├── package.json            # 项目依赖
└── README.md              # 本文档
```

## 🐛 调试

如果遇到问题：

1. 右键点击扩展图标 → **"审查弹出内容"** (Inspect)
2. 查看 Console 选项卡中的错误日志
3. 常见问题：
   - `401 Unauthorized`: Notion Token 错误或页面未授权
   - `403 Forbidden`: COS 权限配置问题
   - `CORS error`: 需要在 COS 配置 CORS 规则

## 📄 License

MIT

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
