// Fix 'Illegal invocation' error for fetch in webpack bundled environment
if (typeof window !== 'undefined' && window.fetch) {
  window.fetch = window.fetch.bind(window);
}

const { Client } = require("@notionhq/client");
const { NotionToMarkdown } = require("notion-to-md");
const COS = require("cos-js-sdk-v5");
const crypto = require("crypto");

const elements = {
  setupView: document.getElementById('setup-view'),
  mainView: document.getElementById('main-view'),
  modeCookie: document.getElementById('mode-cookie'),
  modeToken: document.getElementById('mode-token'),
  cookieInfo: document.getElementById('cookie-info'),
  tokenInfo: document.getElementById('token-info'),
  tokenGroup: document.getElementById('token-group'),
  notionToken: document.getElementById('notion-token'),
  cosBucket: document.getElementById('cos-bucket'),
  cosRegion: document.getElementById('cos-region'),
  cosSecretId: document.getElementById('cos-secret-id'),
  cosSecretKey: document.getElementById('cos-secret-key'),
  cosPath: document.getElementById('cos-path'),
  saveBtn: document.getElementById('save-settings'),
  convertBtn: document.getElementById('convert-btn'),
  toggleSettings: document.getElementById('toggle-settings'),
  currentMode: document.getElementById('current-mode'),
  status: document.getElementById('status'),
};

// --- Helper: Get Notion token from cookies ---
const getNotionTokenFromCookies = async () => {
  try {
    const domains = ['.notion.so', 'notion.so', 'www.notion.so'];
    let allCookies = [];

    for (const domain of domains) {
      try {
        const cookies = await chrome.cookies.getAll({ domain });
        allCookies = allCookies.concat(cookies);
      } catch (e) {
        console.warn(`Failed to get cookies for domain: ${domain}`, e);
      }
    }

    const tokenCookie = allCookies.find(c => c.name === 'token_v2');
    return tokenCookie?.value || null;
  } catch (err) {
    console.error('Failed to get Notion cookies:', err);
    return null;
  }
};

// --- Notion Internal API Helper (for Cookie Mode) ---
const fetchNotionPage = async (pageId, token) => {
  // Note: Browser automatically includes cookies with credentials: 'include'
  // We don't need to manually set the Cookie header
  const response = await window.fetch('https://www.notion.so/api/v3/loadPageChunk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include', // This automatically sends cookies
    body: JSON.stringify({
      pageId: pageId,
      limit: 100,
      cursor: { stack: [] },
      chunkNumber: 0,
      verticalColumns: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Notion API error response:', errorText);
    throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
  }

  return await response.json();
};

// --- Block to Markdown Converter ---
const blockToMarkdown = (block, recordMap) => {
  if (!block || !block.value) return '';

  const { type, properties, format } = block.value;

  // Get rich text content
  const getText = (prop) => {
    if (!prop) return '';
    return prop.map(segment => {
      if (typeof segment === 'string') return segment;
      const text = segment[0] || '';
      const annotations = segment[1];

      if (!annotations || annotations.length === 0) return text;

      let result = text;
      annotations.forEach(([type, value]) => {
        if (type === 'b') result = `**${result}**`;
        else if (type === 'i') result = `*${result}*`;
        else if (type === 'c') result = `\`${result}\``;
        else if (type === 's') result = `~~${result}~~`;
        else if (type === 'a') result = `[${result}](${value})`;
      });
      return result;
    }).join('');
  };

  const title = getText(properties?.title);

  switch (type) {
    case 'page':
      return `# ${title}\n\n`;

    case 'header':
      return `# ${title}\n\n`;

    case 'sub_header':
      return `## ${title}\n\n`;

    case 'sub_sub_header':
      return `### ${title}\n\n`;

    case 'text':
      return title ? `${title}\n\n` : '\n';

    case 'bulleted_list':
      return `- ${title}\n`;

    case 'numbered_list':
      return `1. ${title}\n`;

    case 'to_do':
      const checked = properties?.checked?.[0]?.[0] === 'Yes';
      return `- [${checked ? 'x' : ' '}] ${title}\n`;

    case 'code':
      const language = properties?.language?.[0]?.[0] || '';
      return `\`\`\`${language}\n${title}\n\`\`\`\n\n`;

    case 'quote':
      return `> ${title}\n\n`;

    case 'divider':
      return `---\n\n`;

    case 'image':
      const imageUrl = format?.display_source || properties?.source?.[0]?.[0] || '';
      const caption = getText(properties?.caption) || 'image';
      return `![${caption}](${imageUrl})\n\n`;

    case 'bookmark':
      const url = properties?.link?.[0]?.[0] || '';
      return `[${title || url}](${url})\n\n`;

    default:
      return title ? `${title}\n\n` : '';
  }
};

const convertNotionToMarkdown = async (pageId, token) => {
  const data = await fetchNotionPage(pageId, token);
  const recordMap = data.recordMap;

  if (!recordMap || !recordMap.block) {
    throw new Error('Invalid response from Notion API');
  }

  const blocks = Object.values(recordMap.block);

  // Sort blocks by their position
  const sortedBlocks = blocks.sort((a, b) => {
    const aIdx = a.value?.content?.indexOf(b.value?.id) ?? -1;
    const bIdx = b.value?.content?.indexOf(a.value?.id) ?? -1;
    return aIdx - bIdx;
  });

  let markdown = '';

  for (const block of sortedBlocks) {
    markdown += blockToMarkdown(block, recordMap);
  }

  return markdown.trim();
};

// --- Mode Switch Logic ---
const updateModeUI = () => {
  const isCookieMode = elements.modeCookie.checked;
  elements.cookieInfo.classList.toggle('hidden', !isCookieMode);
  elements.tokenInfo.classList.toggle('hidden', isCookieMode);
  elements.tokenGroup.classList.toggle('hidden', isCookieMode);
};

// --- Storage Logic ---
const loadSettings = async () => {
  const data = await chrome.storage.sync.get([
    'authMode', 'notionToken', 'cosBucket', 'cosRegion',
    'cosSecretId', 'cosSecretKey', 'cosPath'
  ]);

  const authMode = data.authMode || 'cookie';
  if (authMode === 'token') {
    elements.modeToken.checked = true;
  } else {
    elements.modeCookie.checked = true;
  }
  updateModeUI();

  elements.notionToken.value = data.notionToken || '';
  elements.cosBucket.value = data.cosBucket || '';
  elements.cosRegion.value = data.cosRegion || '';
  elements.cosSecretId.value = data.cosSecretId || '';
  elements.cosSecretKey.value = data.cosSecretKey || '';
  elements.cosPath.value = data.cosPath || '';

  const cosConfigured = data.cosBucket && data.cosSecretId && data.cosSecretKey;
  const authConfigured = authMode === 'cookie' || data.notionToken;

  if (cosConfigured && authConfigured) {
    elements.currentMode.textContent = authMode === 'cookie' ? '🍪 Cookie' : '🔑 Token';
    showMainView();
  } else {
    showSetupView();
  }
};

const saveSettings = async () => {
  const authMode = elements.modeCookie.checked ? 'cookie' : 'token';

  const settings = {
    authMode,
    notionToken: elements.notionToken.value.trim(),
    cosBucket: elements.cosBucket.value.trim(),
    cosRegion: elements.cosRegion.value.trim(),
    cosSecretId: elements.cosSecretId.value.trim(),
    cosSecretKey: elements.cosSecretKey.value.trim(),
    cosPath: elements.cosPath.value.trim(),
  };

  if (!settings.cosBucket || !settings.cosRegion || !settings.cosSecretId || !settings.cosSecretKey) {
    setStatus('Please fill in all COS settings.', 'red');
    return;
  }

  if (authMode === 'token' && !settings.notionToken) {
    setStatus('Please provide Notion Integration Token for Token Mode.', 'red');
    return;
  }

  await chrome.storage.sync.set(settings);
  elements.currentMode.textContent = authMode === 'cookie' ? '🍪 Cookie' : '🔑 Token';
  setStatus('Settings saved!', 'green');
  setTimeout(showMainView, 1000);
};

// --- UI Logic ---
const showSetupView = () => {
  elements.setupView.classList.remove('hidden');
  elements.mainView.classList.add('hidden');
};

const showMainView = () => {
  elements.setupView.classList.add('hidden');
  elements.mainView.classList.remove('hidden');
};

const setStatus = (msg, color = 'black') => {
  elements.status.textContent = msg;
  elements.status.style.color = color;
};

// --- Notion Logic ---
const getPageIdFromUrl = (url) => {
  try {
    const u = new URL(url);
    const pathSegments = u.pathname.split('/');
    const lastSegment = pathSegments[pathSegments.length - 1];
    const match = lastSegment.match(/([a-f0-9]{32})/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
};

// Convert 32-char ID to UUID format (required for internal API)
const formatPageId = (id) => {
  if (!id || id.length !== 32) return id;
  // Insert hyphens: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
};

const convertToMarkdown = async () => {
  setStatus('Starting conversion...');
  elements.convertBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab || !tab.url) {
      throw new Error("Cannot access current tab. Please make sure you're on a webpage.");
    }

    if (!tab.url.includes('notion.so')) {
      throw new Error("Please open this extension on a Notion page.");
    }

    const pageId = getPageIdFromUrl(tab.url);
    if (!pageId) {
      throw new Error("Could not detect Notion Page ID from URL.");
    }

    const data = await chrome.storage.sync.get([
      'authMode', 'notionToken', 'cosBucket', 'cosRegion',
      'cosSecretId', 'cosSecretKey', 'cosPath'
    ]);

    const authMode = data.authMode || 'cookie';
    let mdString;

    // Convert based on mode
    if (authMode === 'cookie') {
      setStatus('Getting Notion credentials from cookies...');
      const token = await getNotionTokenFromCookies();
      if (!token) {
        throw new Error("Cookie Mode: Please log in to Notion first. No token_v2 cookie found.");
      }

      // Cookie mode requires UUID format (with hyphens)
      const formattedPageId = formatPageId(pageId);
      setStatus(`Fetching page blocks for ${formattedPageId}...`);
      mdString = await convertNotionToMarkdown(formattedPageId, token);

    } else {
      // Token mode (original implementation)
      const notionToken = data.notionToken;
      if (!notionToken) {
        throw new Error("Token Mode: No Notion Token configured.");
      }

      const notion = new Client({ auth: notionToken });
      const n2m = new NotionToMarkdown({ notionClient: notion });

      setStatus(`Fetching page blocks for ${pageId}...`);
      const mdblocks = await n2m.pageToMarkdown(pageId);
      mdString = n2m.toMarkdownString(mdblocks)["parent"];
    }

    // Image Processing (common for both modes)
    let cos = null;
    if (data.cosBucket && data.cosSecretId && data.cosSecretKey) {
      cos = new COS({
        SecretId: data.cosSecretId,
        SecretKey: data.cosSecretKey,
      });
    }

    if (cos) {
      setStatus('Processing images...');
      const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
      let match;
      const replacements = [];

      while ((match = imageRegex.exec(mdString)) !== null) {
        const alt = match[1];
        const url = match[2];
        if (url.includes('amazonaws.com') || url.includes('notion.so')) {
           replacements.push({ original: match[0], url, alt });
        }
      }

      for (const item of replacements) {
        setStatus(`Uploading image... ${item.alt || 'untitled'}`);
        try {
          const newUrl = await uploadImageToCos(cos, item.url, data.cosBucket, data.cosRegion, data.cosPath);
          mdString = mdString.replace(item.original, `![${item.alt}](${newUrl})`);
        } catch (err) {
          console.error("Image upload failed", err);
          setStatus(`⚠️ Image upload failed: ${item.alt}`, 'orange');
        }
      }
    }

    await navigator.clipboard.writeText(mdString);
    setStatus('✅ Copied to clipboard!', 'green');

  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`, 'red');
  } finally {
    elements.convertBtn.disabled = false;
  }
};

// --- COS Helper ---
const uploadImageToCos = async (cos, imageUrl, bucket, region, pathPrefix) => {
  const response = await window.fetch(imageUrl);
  const blob = await response.blob();

  const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
  const ext = blob.type.split('/')[1] || 'png';
  const filename = `${pathPrefix || ''}${hash}.${ext}`;

  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: filename,
      Body: blob,
    }, function(err, data) {
      if (err) return reject(err);
      const location = `https://${bucket}.cos.${region}.myqcloud.com/${filename}`;
      resolve(location);
    });
  });
};

// --- Event Listeners ---
elements.saveBtn.addEventListener('click', saveSettings);
elements.convertBtn.addEventListener('click', convertToMarkdown);
elements.toggleSettings.addEventListener('click', showSetupView);
elements.modeCookie.addEventListener('change', updateModeUI);
elements.modeToken.addEventListener('change', updateModeUI);

// Init
loadSettings();
