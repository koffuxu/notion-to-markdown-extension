# Notion 转 Markdown Chrome 扩展

[English](./README.md) | 简体中文

一键将 Notion 页面转换为 Markdown 格式，并自动上传图片到腾讯云 COS 对象存储。

## ✨ 功能特性

- 🚀 **一键转换**: 在任何 Notion 页面点击插件图标即可转换为 Markdown
- 📸 **图片处理**: 自动下载 Notion 临时图片并上传到腾讯云 COS，生成永久链接
- 📋 **剪贴板集成**: 转换完成后自动复制到剪贴板，可直接粘贴使用
- ⚙️ **配置简单**: 一次配置，永久使用
- 🔒 **数据安全**: 所有配置保存在本地，不经过第三方服务器

## 🛠️ 技术栈

- **Notion API**: `@notionhq/client` - 官方 Notion API 客户端
- **Markdown 转换**: `notion-to-md` - Notion 块到 Markdown 的转换
- **云存储**: `cos-js-sdk-v5` - 腾讯云对象存储 SDK
- **构建工具**: Webpack 5

## 📦 安装步骤

### 方法一：从源码构建（推荐）

```bash
# 克隆仓库
git clone https://github.com/koffuxu/notion-to-markdown-extension.git
cd notion-to-markdown-extension

# 安装依赖
npm install

# 构建项目
npm run build
```

构建完成后会在 `dist/` 目录生成可安装的扩展文件。

### 方法二：下载预构建版本

从 [Releases](https://github.com/koffuxu/notion-to-markdown-extension/releases) 页面下载最新版本的压缩包并解压。

### 加载到 Chrome 浏览器

1. 打开 Chrome 浏览器，在地址栏输入 `chrome://extensions/` 并回车
2. 开启右上角的 **"开发者模式"** 开关
3. 点击左上角的 **"加载已解压的扩展程序"** 按钮
4. 选择项目的 `dist/` 目录（或解压后的目录）

安装成功后，你会在浏览器工具栏看到扩展图标。

## ⚙️ 配置说明

首次使用需要配置 Notion API 和腾讯云 COS，只需配置一次即可。

### 第一步：获取 Notion Integration Token

1. 访问 [Notion 集成页面](https://www.notion.so/my-integrations)
2. 点击 **"+ New integration"** 按钮
3. 填写集成信息：
   - **Name**: 填写名称，如 "Markdown Exporter"
   - **Associated workspace**: 选择你的工作区
4. 点击 **Submit** 提交
5. 复制生成的 **Internal Integration Secret**（以 `secret_` 开头）

**重要提示**：请妥善保管此 Token，不要分享给他人。

### 第二步：授权 Notion 页面

在你想要转换的 Notion 页面中：

1. 点击页面右上角的 `···` （三个点）菜单
2. 选择 **Connections** → **Connect to**
3. 在弹出的列表中选择你刚创建的 Integration（如 "Markdown Exporter"）

**注意**：每个想要转换的页面都需要单独授权，或者在父页面授权后子页面会继承权限。

### 第三步：配置腾讯云 COS

#### 3.1 创建存储桶

1. 登录 [腾讯云 COS 控制台](https://console.cloud.tencent.com/cos)
2. 点击 **存储桶列表** → **创建存储桶**
3. 填写信息：
   - **名称**: 自定义，如 `my-blog-images`
   - **所属地域**: 选择离你最近的地域，如 `广州`、`上海` 等
   - **访问权限**: 建议选择 **公有读私有写**（便于博客引用图片）
4. 点击 **创建**

#### 3.2 获取 API 密钥

1. 访问 [API 密钥管理页面](https://console.cloud.tencent.com/cam/capi)
2. 点击 **新建密钥**（如已有密钥可直接使用）
3. 记录下 **SecretId** 和 **SecretKey**

**安全建议**：为了安全，建议创建子账号并只授予 COS 上传权限，而不是使用主账号密钥。

#### 3.3 配置 CORS（重要）

为了让浏览器扩展能够上传图片，需要配置 CORS 规则：

1. 在 COS 控制台，进入你创建的存储桶
2. 点击 **安全管理** → **跨域访问 CORS 设置**
3. 点击 **添加规则**，填写：
   - **来源 Origin**: `chrome-extension://*`（或填写 `*` 用于测试）
   - **允许的方法**: 勾选 `PUT`、`POST`、`GET`
   - **Allow-Headers**: 填写 `*`
   - **Expose-Headers**: 填写 `ETag`
   - **超时 Max-Age**: `600`
4. 点击 **保存**

### 第四步：在扩展中配置

1. 点击浏览器工具栏的扩展图标
2. 在弹出的配置页面填入：
   - **Notion Integration Token**: 第一步获取的 Secret
   - **Bucket**: 格式为 `bucket名称-AppID`，例如 `my-blog-1234567890`
   - **Region**: 地域标识符，例如 `ap-guangzhou`、`ap-shanghai`
   - **SecretId**: 第三步获取的 ID
   - **SecretKey**: 第三步获取的 Key
   - **Path**: 图片存储路径（可选），例如 `blog/images/`，留空则存储在根目录
3. 点击 **Save Settings** 保存

配置完成！

## 🚀 使用方法

### 基本使用

1. 在 Chrome 浏览器中打开任意 Notion 页面
2. 点击浏览器工具栏的扩展图标
3. 点击 **Convert & Copy** 按钮
4. 等待转换完成（会显示进度提示）：
   - `Fetching page blocks...` - 正在获取页面内容
   - `Processing images...` - 正在处理图片
   - `Uploading image...` - 正在上传图片到 COS
   - `Copied to clipboard! ✅` - 转换完成
5. 在任意 Markdown 编辑器中粘贴（`Cmd/Ctrl + V`）

### 使用场景

- **博客写作**: 在 Notion 中写好文章，一键转换后发布到 Hexo、Hugo、Jekyll 等博客
- **文档迁移**: 将 Notion 文档导出为 Markdown 格式
- **笔记管理**: 将 Notion 笔记同步到本地 Markdown 文件
- **多平台发布**: 转换后的 Markdown 可直接发布到掘金、知乎、公众号等平台

### 支持的 Notion 块类型

- ✅ 标题（Heading 1/2/3）
- ✅ 段落（Paragraph）
- ✅ 列表（有序列表、无序列表、待办列表）
- ✅ 代码块（Code）
- ✅ 引用（Quote）
- ✅ 分割线（Divider）
- ✅ 图片（Image，自动上传到 COS）
- ✅ 表格（Table）
- ✅ 链接（Link）
- ✅ 加粗、斜体、删除线等文本样式

## 🔧 开发说明

### 项目结构

```
notion-to-markdown-extension/
├── src/
│   ├── manifest.json       # Chrome 扩展配置文件
│   ├── popup.html          # 扩展弹窗界面
│   └── popup.js            # 核心逻辑（Notion API + COS 上传）
├── dist/                   # 构建输出目录（git ignored）
├── webpack.config.js       # Webpack 打包配置
├── package.json            # 项目依赖和脚本
├── .gitignore             # Git 忽略文件配置
├── README.md              # 英文文档
└── README.zh-CN.md        # 中文文档（本文件）
```

### 开发调试

```bash
# 安装依赖
npm install

# 开发模式（自动监听文件变化并重新构建）
npm run watch

# 生产构建
npm run build
```

### 调试技巧

如果遇到问题，可以通过以下方式查看日志：

1. 右键点击扩展图标
2. 选择 **"审查弹出内容"** (Inspect)
3. 在打开的 DevTools 中查看 **Console** 选项卡

常见错误及解决方法：

| 错误信息 | 可能原因 | 解决方法 |
|---------|---------|---------|
| `401 Unauthorized` | Notion Token 错误或页面未授权 | 检查 Token 是否正确，确认页面已授权给 Integration |
| `403 Forbidden` | COS 权限配置问题 | 检查 SecretId/Key 是否正确，确认有上传权限 |
| `CORS error` | 跨域配置未设置 | 在 COS 控制台配置 CORS 规则 |
| `Illegal invocation` | fetch 上下文问题 | 该问题已在最新版本修复，请重新构建 |
| `Could not detect Notion Page ID` | 不是 Notion 页面 | 确保在 Notion 页面中使用，而不是数据库列表页 |

## 📝 注意事项

### 权限说明

扩展需要以下权限：

- `activeTab`: 获取当前标签页的 URL（用于提取 Notion Page ID）
- `storage`: 存储配置信息（Notion Token、COS 配置）
- `clipboardWrite`: 将转换后的 Markdown 写入剪贴板
- `host_permissions`: 访问 Notion API 和腾讯云 COS API

所有数据均存储在本地，不会上传到任何第三方服务器。

### 图片链接说明

- Notion 原始图片链接是临时的（约 1 小时过期）
- 扩展会自动将图片上传到你配置的 COS 存储桶
- 生成的图片 URL 格式：`https://{bucket}.cos.{region}.myqcloud.com/{path}/{hash}.{ext}`
- 文件名使用 MD5 哈希，避免重复上传

### 数据库 vs 页面

- ✅ **支持**: Notion 页面（Page）
- ❌ **不支持**: Notion 数据库列表视图（Database）

如需转换数据库中的某一条记录，请点击进入该记录的详情页面。

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

### 如何贡献

1. Fork 本仓库
2. 创建你的特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交你的更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启一个 Pull Request

### 开发规范

- 代码风格：遵循 ESLint 规范
- 提交信息：使用语义化提交信息（Conventional Commits）
- 测试：重要功能请添加测试用例

## 📄 开源协议

本项目基于 [MIT License](./LICENSE) 开源。

## 🙏 致谢

本项目使用了以下优秀的开源项目：

- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Notion 官方 JavaScript SDK
- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Notion 到 Markdown 转换库
- [cos-js-sdk-v5](https://github.com/tencentyun/cos-js-sdk-v5) - 腾讯云对象存储 JavaScript SDK

## 📮 联系方式

- GitHub: [@koffuxu](https://github.com/koffuxu)
- 仓库地址: [notion-to-markdown-extension](https://github.com/koffuxu/notion-to-markdown-extension)

如有问题或建议，欢迎提交 [Issue](https://github.com/koffuxu/notion-to-markdown-extension/issues)！

---

**Star** ⭐ 本项目，帮助更多人发现它！
