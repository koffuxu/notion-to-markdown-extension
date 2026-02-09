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
  notionToken: document.getElementById('notion-token'),
  cosBucket: document.getElementById('cos-bucket'),
  cosRegion: document.getElementById('cos-region'),
  cosSecretId: document.getElementById('cos-secret-id'),
  cosSecretKey: document.getElementById('cos-secret-key'),
  cosPath: document.getElementById('cos-path'),
  saveBtn: document.getElementById('save-settings'),
  convertBtn: document.getElementById('convert-btn'),
  toggleSettings: document.getElementById('toggle-settings'),
  status: document.getElementById('status'),
};

// --- Storage Logic ---
const loadSettings = async () => {
  const data = await chrome.storage.sync.get(['notionToken', 'cosBucket', 'cosRegion', 'cosSecretId', 'cosSecretKey', 'cosPath']);
  if (data.notionToken) {
    elements.notionToken.value = data.notionToken;
    elements.cosBucket.value = data.cosBucket || '';
    elements.cosRegion.value = data.cosRegion || '';
    elements.cosSecretId.value = data.cosSecretId || '';
    elements.cosSecretKey.value = data.cosSecretKey || '';
    elements.cosPath.value = data.cosPath || '';
    showMainView();
  } else {
    showSetupView();
  }
};

const saveSettings = async () => {
  const settings = {
    notionToken: elements.notionToken.value.trim(),
    cosBucket: elements.cosBucket.value.trim(),
    cosRegion: elements.cosRegion.value.trim(),
    cosSecretId: elements.cosSecretId.value.trim(),
    cosSecretKey: elements.cosSecretKey.value.trim(),
    cosPath: elements.cosPath.value.trim(),
  };

  if (!settings.notionToken) {
    setStatus('Notion Token is required.', 'red');
    return;
  }

  await chrome.storage.sync.set(settings);
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
    // Notion IDs are 32 chars, usually at the end of the slug-id string
    const match = lastSegment.match(/([a-f0-9]{32})/);
    return match ? match[1] : null;
  } catch (e) {
    return null;
  }
};

const convertToMarkdown = async () => {
  setStatus('Starting conversion...');
  elements.convertBtn.disabled = true;

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageId = getPageIdFromUrl(tab.url);

    if (!pageId) {
      throw new Error("Could not detect Notion Page ID from URL.");
    }

    const data = await chrome.storage.sync.get(['notionToken', 'cosBucket', 'cosRegion', 'cosSecretId', 'cosSecretKey', 'cosPath']);

    // Initialize Clients
    const notion = new Client({ auth: data.notionToken });
    const n2m = new NotionToMarkdown({ notionClient: notion });

    let cos = null;
    if (data.cosBucket && data.cosSecretId && data.cosSecretKey) {
      cos = new COS({
        SecretId: data.cosSecretId,
        SecretKey: data.cosSecretKey,
      });
    }

    setStatus(`Fetching page blocks for ${pageId}...`);
    const mdblocks = await n2m.pageToMarkdown(pageId);
    let mdString = n2m.toMarkdownString(mdblocks)["parent"];

    // Image Processing
    if (cos) {
      setStatus('Processing images...');
      const imageRegex = /!\[(.*?)\]\((.*?)\)/g;
      let match;
      const replacements = [];

      // Find all images
      while ((match = imageRegex.exec(mdString)) !== null) {
        const alt = match[1];
        const url = match[2];
        // Only process Notion hosted images (AWS S3)
        if (url.includes('amazonaws.com') || url.includes('notion.so')) {
           replacements.push({ original: match[0], url, alt });
        }
      }

      // Upload sequentially to avoid rate limits
      for (const item of replacements) {
        setStatus(`Uploading image... ${item.alt}`);
        try {
          const newUrl = await uploadImageToCos(cos, item.url, data.cosBucket, data.cosRegion, data.cosPath);
          mdString = mdString.replace(item.original, `![${item.alt}](${newUrl})`);
        } catch (err) {
          console.error("Image upload failed", err);
          // Keep original URL on failure, or handle error
        }
      }
    }

    // Copy to clipboard
    await navigator.clipboard.writeText(mdString);
    setStatus('Copied to clipboard! ✅', 'green');

  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`, 'red');
  } finally {
    elements.convertBtn.disabled = false;
  }
};

// --- COS Helper ---
const uploadImageToCos = async (cos, imageUrl, bucket, region, pathPrefix) => {
  // 1. Fetch image blob
  const response = await window.fetch(imageUrl);
  const blob = await response.blob();

  // 2. Generate filename (hash of url to avoid dupes)
  const hash = crypto.createHash('md5').update(imageUrl).digest('hex');
  const ext = blob.type.split('/')[1] || 'png';
  const filename = `${pathPrefix || ''}${hash}.${ext}`;

  // 3. Upload
  return new Promise((resolve, reject) => {
    cos.putObject({
      Bucket: bucket,
      Region: region,
      Key: filename,
      Body: blob,
    }, function(err, data) {
      if (err) return reject(err);
      // Construct URL (https://{bucket}.cos.{region}.myqcloud.com/{key})
      const location = `https://${bucket}.cos.${region}.myqcloud.com/${filename}`;
      resolve(location);
    });
  });
};

// --- Event Listeners ---
elements.saveBtn.addEventListener('click', saveSettings);
elements.convertBtn.addEventListener('click', convertToMarkdown);
elements.toggleSettings.addEventListener('click', showSetupView);

// Init
loadSettings();