 
 
let BOT_TOKEN = null;
let CHANNEL_CHAT_ID = null;
let AFFILIATE_TAG = null;
chrome.storage.local.get(["BOT_TOKEN", "CHANNEL_CHAT_ID","AFFILIATE_TAG"], (data) => {
    BOT_TOKEN = data.BOT_TOKEN || null;
    CHANNEL_CHAT_ID = data.CHANNEL_CHAT_ID || null;
    AFFILIATE_TAG = data.AFFILIATE_TAG;
     
});
// Storage değişikliklerini dinle
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local") {
    if (changes.BOT_TOKEN) {
      BOT_TOKEN = changes.BOT_TOKEN.newValue;
      console.log("Yeni BOT_TOKEN alındı:", BOT_TOKEN);
    }

    if (changes.CHANNEL_CHAT_ID) {
      CHANNEL_CHAT_ID = changes.CHANNEL_CHAT_ID.newValue;
      console.log("Yeni CHANNEL_CHAT_ID alındı:", CHANNEL_CHAT_ID);
    }

    if (changes.AFFILIATE_TAG) {
      AFFILIATE_TAG = changes.AFFILIATE_TAG.newValue;
      console.log("Yeni AFFILIATE_TAG alındı:", AFFILIATE_TAG);
    }

    // Eğer hepsi varsa gerekli işlemleri başlatabilirsin
    if (BOT_TOKEN && CHANNEL_CHAT_ID && AFFILIATE_TAG) {
 
    
    }
  }
});


let newState;
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local" && "soundEnabled" in changes) {
        newState = Boolean(changes.soundEnabled.newValue);
    }
});

// Metin için tam MarkdownV2 escape
function escapeMarkdownV2(text) {
    if (!text) return '';
        return text.replace(/([_\[\]\(\)\*\~\`\>\#\+\-\=\|\{\}\.\!\,\<\>])/g, '\\$1');
}

// URL için sadece sorunlu karakter kaçışı
 

function extractASIN(url) {
    const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
    return match ? (match[1] || match[2]) : null;
}

async function sendToTelegram(payload) {

   
    const asin = extractASIN(payload.url);
    if (!asin) throw new Error('ASIN bulunamadı');
 
const affiliateUrl = `https://www.amazon.com.tr/dp/${asin}?${AFFILIATE_TAG}`;
    const affiliateUrlSafe = escapeMarkdownV2(affiliateUrl);

    const res = await fetch(payload.imageUrl);
    if (!res.ok) throw new Error('Resim indirilemedi');
    const blob = await res.blob();

    const title = escapeMarkdownV2(payload.title || '');
    const price = escapeMarkdownV2(payload.price || '');

    let promosText = '';
    if (payload.promos && Array.isArray(payload.promos) && payload.promos.length > 0) {
        promosText = '🎁 **Kampanyalar**:\n' + payload.promos.map(p => {
            const label = escapeMarkdownV2(p.label || '');
            const desc = escapeMarkdownV2(p.description || '');
            return `› *${label}* ${desc}`;
        }).join('\n');
    }

    const searchLink = `https://www.google.com/search?q=${encodeURIComponent(payload.title || '')}`;
    const searchLinkSafe = escapeMarkdownV2(searchLink);

    const captionParts = [];
    if (title) captionParts.push(`🛍 *${title}[🔎](${searchLinkSafe})*`);
       if (payload.offerData && Object.keys(payload.offerData).length >= 2) { if (price) {
       const stockText = payload.stockInfo ? ` \\(${escapeMarkdownV2(payload.stockInfo)}\\)` : '';
        captionParts.push(`💸 *Fiyat*: ${price}${stockText}`);
    }
    }
    else{  const stockText = payload.stockInfo ? ` ${escapeMarkdownV2(payload.stockInfo)}` : '';
if (stockText) {
    captionParts.push(`*${stockText}*`);
}}
    if (promosText) captionParts.push(promosText);
    captionParts.push(`🔗 [Amazon’da Gör](${affiliateUrlSafe})`);
    if (payload.selectedSize) {
    captionParts.push(escapeMarkdownV2(payload.selectedSize).replace(/\\\*/g, '*'));

    }
    if (payload.offerData && Object.keys(payload.offerData).length >= 2) {
const firstTwoEntries = Object.entries(payload.offerData).slice(0, 2);

const firstTwoValues = firstTwoEntries.map(([key, value]) => value);

if (!(firstTwoValues[0].includes('Amazon.com.tr') && firstTwoValues[1].includes('Amazon.com.tr'))) {

    // First, escape any potential markdown in the raw values
    const escapedEntries = firstTwoEntries.map(([key, value]) => [key, escapeMarkdownV2(value)]);

    // Now, apply the bold formatting to the escaped values
    const offerText = escapedEntries
        .map(([key, value]) => `*${key}:* ${value}`)
        .join('\n');

    captionParts.push(offerText);
}
    if (payload.internationalShippingContainer) {
        captionParts.push(escapeMarkdownV2(payload.internationalShippingContainer));
        
}}
captionParts.push(`\\#işbirliği \\#amazon \\#${asin}`);
console.log(captionParts);
    const formData = new FormData();
    formData.append('chat_id', CHANNEL_CHAT_ID);
    formData.append('caption', captionParts.filter(Boolean).join('\n\n'));
    formData.append('parse_mode', 'MarkdownV2');
    formData.append('photo', new File([blob], 'product.jpg', { type: blob.type }));
    console.log("newState "+newState);
    formData.append('disable_notification', !newState);

    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
    });

    const json = await telegramRes.json();
    if (!json.ok) throw new Error(JSON.stringify(json));
    return json;
}

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'sendTelegram') {
        sendToTelegram(msg.payload)
            .then(() => sendResponse({ ok: true }))
            .catch(err => sendResponse({ ok: false, error: String(err) }));
        return true; 
    }
});

// Kısayol tuş dinleyici
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'send_to_telegram') {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (tab && tab.url.includes('amazon.')) {
            try {
                // content.js'e mesaj gönder
                chrome.tabs.sendMessage(tab.id, { action: 'extractProduct' }, async (response) => {
                    if (response && response.success) {
                        await sendToTelegram(response.data);
                    } else {
                        console.error('Kısayol ile gönderme hatası: Ürün verisi alınamadı.');
                    }
                });
            } catch (err) {
                console.error('Kısayol ile gönderme hatası:', err);
            }
        }
    }
});
