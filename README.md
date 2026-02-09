# Notion to Markdown Chrome Extension

English | [简体中文](./README.zh-CN.md)

Convert Notion pages to Markdown format with one click, and automatically upload images to Tencent Cloud COS.

## ✨ Features

- 🚀 **One-Click Conversion**: Convert any Notion page to Markdown by clicking the extension icon
- 📸 **Image Processing**: Automatically download temporary Notion images and upload to Tencent Cloud COS with permanent URLs
- 📋 **Clipboard Integration**: Converted Markdown is automatically copied to clipboard for immediate use
- ⚙️ **Simple Configuration**: Configure once, use forever
- 🔒 **Data Security**: All configurations stored locally, no third-party servers involved

## 🛠️ Tech Stack

- **Notion API**: `@notionhq/client` - Official Notion JavaScript SDK
- **Markdown Conversion**: `notion-to-md` - Convert Notion blocks to Markdown
- **Cloud Storage**: `cos-js-sdk-v5` - Tencent Cloud Object Storage SDK
- **Build Tool**: Webpack 5

## 📦 Installation

### Method 1: Build from Source (Recommended)

```bash
# Clone the repository
git clone https://github.com/koffuxu/notion-to-markdown-extension.git
cd notion-to-markdown-extension

# Install dependencies
npm install

# Build the project
npm run build
```

The built extension files will be generated in the `dist/` directory.

### Method 2: Download Pre-built Version

Download the latest version from the [Releases](https://github.com/koffuxu/notion-to-markdown-extension/releases) page and extract it.

### Load into Chrome

1. Open Chrome browser and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** toggle in the top right corner
3. Click **"Load unpacked"** button
4. Select the `dist/` directory (or extracted directory)

After successful installation, you'll see the extension icon in the browser toolbar.

## ⚙️ Configuration

First-time setup requires configuring Notion API and Tencent Cloud COS. Configuration is needed only once.

### Step 1: Get Notion Integration Token

1. Visit [Notion Integrations](https://www.notion.so/my-integrations)
2. Click **"+ New integration"**
3. Fill in the integration details:
   - **Name**: Enter a name, e.g., "Markdown Exporter"
   - **Associated workspace**: Select your workspace
4. Click **Submit**
5. Copy the generated **Internal Integration Secret** (starts with `secret_`)

**Important**: Keep this token secure and do not share it with others.

### Step 2: Grant Page Access

For each Notion page you want to convert:

1. Click the `···` (three dots) menu in the top right of the page
2. Select **Connections** → **Connect to**
3. Choose the integration you just created (e.g., "Markdown Exporter")

**Note**: Each page needs to be authorized individually, or authorize a parent page to inherit permissions for child pages.

### Step 3: Configure Tencent Cloud COS

#### 3.1 Create a Bucket

1. Log in to [Tencent Cloud COS Console](https://console.cloud.tencent.com/cos)
2. Click **Bucket List** → **Create Bucket**
3. Fill in the information:
   - **Name**: Custom name, e.g., `my-blog-images`
   - **Region**: Choose the region closest to you, e.g., `Guangzhou`, `Shanghai`, etc.
   - **Access Permissions**: Recommend **Public Read & Private Write** (easier for blog image references)
4. Click **Create**

#### 3.2 Get API Keys

1. Visit [API Key Management](https://console.cloud.tencent.com/cam/capi)
2. Click **Create Key** (or use existing keys)
3. Record the **SecretId** and **SecretKey**

**Security Tip**: For better security, create a sub-account with only COS upload permissions instead of using main account keys.

#### 3.3 Configure CORS (Important)

To allow the browser extension to upload images, configure CORS rules:

1. In COS Console, enter your bucket
2. Click **Security Management** → **CORS Configuration**
3. Click **Add Rule** and fill in:
   - **Origin**: `chrome-extension://*` (or `*` for testing)
   - **Allowed Methods**: Check `PUT`, `POST`, `GET`
   - **Allow-Headers**: Enter `*`
   - **Expose-Headers**: Enter `ETag`
   - **Max-Age**: `600`
4. Click **Save**

### Step 4: Configure in Extension

1. Click the extension icon in the browser toolbar
2. Fill in the configuration:
   - **Notion Integration Token**: Secret from Step 1
   - **Bucket**: Format `bucket-name-AppID`, e.g., `my-blog-1234567890`
   - **Region**: Region identifier, e.g., `ap-guangzhou`, `ap-shanghai`
   - **SecretId**: ID from Step 3
   - **SecretKey**: Key from Step 3
   - **Path**: Image storage path (optional), e.g., `blog/images/`, leave empty to store in root
3. Click **Save Settings**

Configuration complete!

## 🚀 Usage

### Basic Usage

1. Open any Notion page in Chrome browser
2. Click the extension icon in the toolbar
3. Click **Convert & Copy** button
4. Wait for conversion to complete (progress will be shown):
   - `Fetching page blocks...` - Retrieving page content
   - `Processing images...` - Processing images
   - `Uploading image...` - Uploading images to COS
   - `Copied to clipboard! ✅` - Conversion complete
5. Paste in any Markdown editor (`Cmd/Ctrl + V`)

### Use Cases

- **Blog Writing**: Write articles in Notion, convert with one click and publish to Hexo, Hugo, Jekyll, etc.
- **Document Migration**: Export Notion documents to Markdown format
- **Note Management**: Sync Notion notes to local Markdown files
- **Multi-platform Publishing**: Converted Markdown can be directly published to platforms like Juejin, Zhihu, WeChat Official Accounts, etc.

### Supported Notion Block Types

- ✅ Headings (Heading 1/2/3)
- ✅ Paragraph
- ✅ Lists (Ordered, Unordered, To-do)
- ✅ Code Block
- ✅ Quote
- ✅ Divider
- ✅ Image (automatically uploaded to COS)
- ✅ Table
- ✅ Link
- ✅ Text styles (Bold, Italic, Strikethrough, etc.)

## 🔧 Development

### Project Structure

```
notion-to-markdown-extension/
├── src/
│   ├── manifest.json       # Chrome extension manifest
│   ├── popup.html          # Extension popup UI
│   └── popup.js            # Core logic (Notion API + COS upload)
├── dist/                   # Build output directory (git ignored)
├── webpack.config.js       # Webpack configuration
├── package.json            # Project dependencies and scripts
├── .gitignore             # Git ignore configuration
├── README.md              # This file
└── README.zh-CN.md        # Chinese documentation
```

### Development & Debugging

```bash
# Install dependencies
npm install

# Development mode (auto rebuild on file changes)
npm run watch

# Production build
npm run build
```

### Debugging Tips

If you encounter issues, you can view logs:

1. Right-click the extension icon
2. Select **"Inspect popup"**
3. Check the **Console** tab in the opened DevTools

Common errors and solutions:

| Error | Possible Cause | Solution |
|-------|---------------|----------|
| `401 Unauthorized` | Invalid Notion token or page not authorized | Check token correctness, confirm page is authorized to the integration |
| `403 Forbidden` | COS permission issue | Verify SecretId/Key are correct, confirm upload permissions |
| `CORS error` | CORS not configured | Configure CORS rules in COS console |
| `Illegal invocation` | fetch context issue | Fixed in latest version, please rebuild |
| `Could not detect Notion Page ID` | Not a Notion page | Use in a Notion page, not database list view |

## 📝 Notes

### Permissions

The extension requires the following permissions:

- `activeTab`: Get current tab URL (to extract Notion Page ID)
- `storage`: Store configuration (Notion token, COS settings)
- `clipboardWrite`: Write converted Markdown to clipboard
- `host_permissions`: Access Notion API and Tencent Cloud COS API

All data is stored locally and not uploaded to any third-party servers.

### Image URL Notes

- Original Notion image URLs are temporary (expire in ~1 hour)
- Extension automatically uploads images to your configured COS bucket
- Generated image URL format: `https://{bucket}.cos.{region}.myqcloud.com/{path}/{hash}.{ext}`
- Filenames use MD5 hash to avoid duplicate uploads

### Database vs Page

- ✅ **Supported**: Notion Pages
- ❌ **Not Supported**: Notion Database list views

To convert a database record, click to open the record's detail page.

## 🤝 Contributing

Issues and Pull Requests are welcome!

### How to Contribute

1. Fork this repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Code style: Follow ESLint standards
- Commit messages: Use semantic commit messages (Conventional Commits)
- Testing: Add test cases for important features

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

## 🙏 Acknowledgments

This project uses the following excellent open-source projects:

- [@notionhq/client](https://github.com/makenotion/notion-sdk-js) - Official Notion JavaScript SDK
- [notion-to-md](https://github.com/souvikinator/notion-to-md) - Notion to Markdown conversion library
- [cos-js-sdk-v5](https://github.com/tencentyun/cos-js-sdk-v5) - Tencent Cloud Object Storage JavaScript SDK

## 📮 Contact

- GitHub: [@koffuxu](https://github.com/koffuxu)
- Repository: [notion-to-markdown-extension](https://github.com/koffuxu/notion-to-markdown-extension)

For questions or suggestions, please submit an [Issue](https://github.com/koffuxu/notion-to-markdown-extension/issues)!

---

**Star** ⭐ this project to help more people discover it!
