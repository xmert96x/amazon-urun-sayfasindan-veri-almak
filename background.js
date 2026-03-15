let BOT_TOKEN = null;
let CHANNEL_CHAT_ID = null;
let AFFILIATE_TAG = null;
let quantityInput = 0;
let totalPriceInput = 0;
let autoPriceToggle = false;
let additionalInfoInput = '';
let soundEnabled = true; // soundEnabled için varsayılan
 

// Depolamadan veri çekme işlemi Promise ile
function getStorageData(keys) {
    return new Promise((resolve) => {
        chrome.storage.local.get(keys, (res) => resolve(res));
    });
}

/**
 * Depolamadan tüm gerekli verileri çeker ve global değişkenlere atar
 */
async function updateActiveData() {
    const keysToRetrieve = [
        'botTokens',
        'chatIds',
        'affiliateTags',    
        'active-botTokens-key',
        'active-chatIds-key',
        'active-affiliateTags-key',
        'autoPriceToggle',
        'productQuantity',
        'totalPrice',
        'additionalInfoInput',
        'soundEnabled'
    ];

    const res = await getStorageData(keysToRetrieve);

    // Aktif token, chat ID ve affiliate tag atanıyor
    BOT_TOKEN = res['active-botTokens-key'] ? res.botTokens[res['active-botTokens-key']] : null;
    CHANNEL_CHAT_ID = res['active-chatIds-key'] ? res.chatIds[res['active-chatIds-key']] : null;
    AFFILIATE_TAG = res['active-affiliateTags-key'] ? res.affiliateTags[res['active-affiliateTags-key']] : null;
 

const channelKey = res['active-channelName-key']; 
    // Diğer değerler atanıyor, yoksa varsayılan
  autoPriceToggle = res?.autoPriceToggle ?? false;
quantityInput = res?.productQuantity ?? 0;
totalPriceInput = res?.totalPrice ?? 0;
additionalInfoInput = (res?.additionalInfoInput ?? '').trim();
soundEnabled = res?.soundEnabled ?? true;
    soundEnabled = res.soundEnabled ?? true;

    // Güncel değerleri logla
    console.log('Güncel değerler:', {
        BOT_TOKEN,
        CHANNEL_CHAT_ID,
        AFFILIATE_TAG,
        autoPriceToggle,
        quantityInput,
        totalPriceInput,
        soundEnabled
    });
}

// Başlangıçta verileri çek
(async () => {
    await updateActiveData();
})();


// Storage değiştiğinde otomatik güncelle
chrome.storage.onChanged.addListener(async (changes, areaName) => {
    // Sadece yerel depolama alanını kontrol et
    if (areaName === 'local') {
        // Değişen her değer için loglama yapabilirsiniz
        if (changes.autoPriceToggle?.newValue !== undefined) {
            console.log("autoPriceToggle değişti. Yeni değer:", changes.autoPriceToggle.newValue);
        }
        if (changes.soundEnabled?.newValue !== undefined) {
            console.log('Ses durumu değişti:', changes.soundEnabled.newValue);
        }

        // Değişiklik ne olursa olsun, tüm global değişkenleri asenkron olarak yeniden yükle
        await updateActiveData(); 
        console.log('Storage değişti ve tüm global değişkenler güncellendi');
    }
});

// Artık bu gereksiz koda ihtiyacınız yok
// chrome.storage.onChanged.addListener((changes, areaName) => {
//     if (areaName === "local" && "soundEnabled" in changes) {
//         newState = Boolean(changes.soundEnabled.newValue);
//         console.log("yenideğer"+changes.soundEnabled.newValue)
//     }
// });
// Metin için tam MarkdownV2 escape
function escapeMarkdownV2(text) {
    if (!text) return '';
        return text.replace(/([_\[\]\(\)\*\~\`\>\#\+\-\=\|\{\}\.\!\,\<\>])/g, '\\$1');
}

// URL için sadece sorunlu karakter kaçışı
 

function extractASIN(url) {
     const match = url.match(/\/(?:dp|gp\/product|gp\/aw\/d|gp\/offer-listing|exec\/obidos|o)\/([A-Z0-9]{10})(?=[/?]|$)/i);
  return match ? match[1] : null;
}

async function sendProduct(payload) { // Check if the payload has the 'source' property and if it's set to 'shortcut'
    

   
  if (!BOT_TOKEN || !CHANNEL_CHAT_ID ||!AFFILIATE_TAG) {
      throw new Error('Çalışması için gerekli veriler eksik.');
        updateActiveData();}
    updateActiveData();
 //console.log(autoPriceToggle.toString()+" "+quantityInput+" "+totalPriceInput);
 
    const asin = extractASIN(payload.url);
    if (!asin) throw new Error('Lütfen bir Amazon ürün sayfasında olun.');
 
let affiliateUrl = `https://www.amazon.com.tr/dp/${asin}?${AFFILIATE_TAG}`;
if (payload.conditionText && payload.conditionText.startsWith('İkinci El:')) {
    affiliateUrl += "&smid=A215JX4S9CANSO&th=1";  
}

if (payload.offerData && Object.keys(payload.offerData).length >= 2) {
    const firstTwoEntries = Object.entries(payload.offerData).slice(0, 2);
    const firstTwoValues = firstTwoEntries.map(([key, value]) => value || '');

    // Amazon.com.tr ve Güvenli işlem kontrolü
    if (
        firstTwoValues[0].includes('Amazon.com.tr') &&
        (firstTwoValues[1].includes('Güvenli işlem') || firstTwoValues[1].includes('Amazon.com.tr'))
    ) {
        affiliateUrl += "&smid=A1UNQM1SR2CHM&th=1";
    }

    // secondKey kontrolü
  
      const secondKey = (firstTwoEntries && firstTwoEntries[1]) ? firstTwoEntries[1][0] : null;


    if (secondKey && !secondKey.includes("Satıcı")) {
        affiliateUrl += "&smid=A1UNQM1SR2CHM&th=1";
    }
}

if (!affiliateUrl.includes('smid=') && payload.url) {
    // payload.url içinden smid parametresini çek
    const smidMatch = payload.url.match(/[?&]smid=([^&]+)/);
    
    if (smidMatch && smidMatch[1]) {
        affiliateUrl += `&smid=${smidMatch[1]}&th=1`;
    }
}

 

    const affiliateUrlSafe = escapeMarkdownV2(affiliateUrl);

    const res = await fetch(payload.imageUrl);
    if (!res.ok) throw new Error('Resim indirilemedi');
    const blob = await res.blob();

    const title = escapeMarkdownV2(payload.title || '');


    let promosText = '';
    if (payload.promos && Array.isArray(payload.promos) && payload.promos.length > 0) {
        promosText = payload.promos.map(p => {
            const label = escapeMarkdownV2(p.label || '');
            const desc = escapeMarkdownV2(p.description || '');
            return `› *${label}* ${desc}`;
        }).join('\n');
    promosText='🎁*Kampanyalar*:\n'+promosText;
    }

    const searchLink = `https://www.google.com/search?q=${encodeURIComponent(payload.title || '')}`;
    const searchLinkSafe = escapeMarkdownV2(searchLink);
   
    console.log("Değer:"+autoPriceToggle);
 const price = escapeMarkdownV2(payload.price || '');
let manuelprice = escapeMarkdownV2(
    ((totalPriceInput / quantityInput).toFixed(2)
     .split('.')
     .map((v,i) => i === 0 ? v.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : v)
     .join(','))
);      
    const captionParts = [];
let stockText = payload.stockInfo;

if (stockText) {
  // "Stokta sadece" geçiyorsa rakamları kalın yap
  if (stockText.includes("Stokta sadece")) {
    stockText = stockText.replace(/(\d+)/g, '*$1*');
  }

  // Markdown özel karakterlerini kaçır, sonra yıldızları geri aç
  stockText = escapeMarkdownV2(stockText).replace(/\\\*/g, '*');

// Son olarak metnin tamamını italik yapmak için alt çizgilerle sarar
stockText = `\\(_${stockText}_\\)`;
}
    if (title) captionParts.push(`🛍*${title}[🔎](${searchLinkSafe})*`);
       if (payload.offerData && Object.keys(payload.offerData).length >= 2) { if (price) {
       
    
if (autoPriceToggle === true || payload.source == 'shortcut') {
    captionParts.push(`💸*Fiyat*: ${price}${stockText}`);
} else {
    if (quantityInput > 1)
        captionParts.push(`💸*Fiyat*: ${quantityInput} adet alımda adeti ${manuelprice} TL ${stockText}`);
    else
  captionParts.push(`💸*Fiyat*: Ödeme adımında ${manuelprice} TL ${stockText}`);   
}



}}else  captionParts.push(`${stockText}`); 
    if (promosText) captionParts.push(promosText);
    captionParts.push(`🔗[Amazon’da Gör](${affiliateUrlSafe})`);
    
if(payload.moq){
    const moq = escapeMarkdownV2(payload.moq);
captionParts.push(`*${moq.slice(0, -1)}*${moq.at(-1)}`);}
    if (payload.selectedSize) {
captionParts.push(
  escapeMarkdownV2(payload.selectedSize)
    .split(" ")
    .map((v, i, arr) => i === 0 ? v.replace(/\\\*/g, '*') : v)
    .join(" ")
    .trim()
);

 


    }
    if (payload.offerData && Object.keys(payload.offerData).length >= 2) {
const firstTwoEntries = Object.entries(payload.offerData).slice(0, 2);

const firstTwoValues = firstTwoEntries.map(([key, value]) => value);

if (!(firstTwoValues[0].includes('Amazon.com.tr') && ( firstTwoValues[1].includes('Güvenli işlem')||firstTwoValues[1].includes('Amazon.com.tr')))) {

    // First, escape any potential markdown in the raw values
// 1️⃣ İkinci entry key’i "Satıcı" değilse atla ve diğer filtrelemeler
const filteredEntries = firstTwoEntries.filter(([key, value], index) => {
    if (!value) return false; // boş value'ları atla
    if (value.includes('Güvenli işlem')) return false; // "Güvenli işlem" atla
    if (index === 1 && value !== 'Amazon Lojistik' && !key.includes('Satıcı')) return false; // ikinci entry ve key Satıcı değilse atla, ama value Amazon Lojistik ise atlama
    return true;
});

// 2️⃣ Filtrelenmiş sonuç üzerinden tüm value'lar Amazon.com.tr içeriyor mu kontrolü
const allValuesAmazon = filteredEntries.every(
    ([_, value]) => value && value.trim().toLowerCase().includes('amazon.com.tr')
);

let offerText = null;

if (!allValuesAmazon) {
    // 3️⃣ Escape ve offerText oluştur
    offerText = filteredEntries
        .map(([key, value]) => key ? `*${key}:* ${escapeMarkdownV2(value)}` : escapeMarkdownV2(value))
        .join('\n')
        .trim();
}

// 4️⃣ offerText varsa captionParts'a ekle
if (offerText) {
    captionParts.push(offerText);
}

}
    if (payload.internationalShippingContainer) {
    captionParts.push(`_${escapeMarkdownV2(payload.internationalShippingContainer)}_`); 
        
}}
 
if (payload.conditionText.startsWith('İkinci El:')) {
    captionParts.push(`*${escapeMarkdownV2(payload.conditionText.split(':')[0])}:* ${escapeMarkdownV2(payload.conditionText.split(':').slice(1).join(':').trim())}`);

}
if(payload.commentMessage.length>0){
       captionParts.push(
  `>*${escapeMarkdownV2(payload.commentMessage[0].label)}: *${escapeMarkdownV2(payload.commentMessage[0].description)}`
);
}

 


if (payload.source != 'shortcut') {if(additionalInfoInput.length>0)
captionParts.push(`>${escapeMarkdownV2(additionalInfoInput)}`);
    }


console.log("sound:"+soundEnabled);
captionParts.push(`\\#işbirliği \\#amazon ${escapeMarkdownV2(payload.categoryTag)} \\#${asin}`);
    const formData = new FormData();
    formData.append('chat_id', CHANNEL_CHAT_ID);
  formData.append("link_preview_options", JSON.stringify({
  is_disabled: true
}));
    formData.append('caption', captionParts.filter(Boolean).join('\n\n'));
    
    formData.append('parse_mode', 'MarkdownV2');
    formData.append('photo', payload.imageUrl);
formData.append('disable_notification',!soundEnabled);
    const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        body: formData
    });

    const json = await telegramRes.json();
    if (!json.ok) throw new Error(JSON.stringify(json));
    return json;
}

async function sendLink(payload) {    
  updateActiveData();
let url = payload.url;

//endsWith() metodu string'lerde kullanılır.
if (url.endsWith("/") || url.endsWith("\\")) {
    url = url.slice(0, -1);
}

const urlObj = new URL(url);

// tag ve creative parametrelerini sil
urlObj.searchParams.delete("tag");
urlObj.searchParams.delete("creative");

// ref parametrelerini ekle
if (AFFILIATE_TAG && typeof AFFILIATE_TAG === "string") {
    AFFILIATE_TAG.split("&").forEach(param => {
        const [key, value] = param.split("=");
        if (key && value) {
            urlObj.searchParams.set(key, value);
        }
    });
}

console.log(payload.pageTitle);
console.log(payload.url);

const captionParts = [];
captionParts.push("*"+escapeMarkdownV2(payload.pageTitle)+"*");

captionParts.push("🔗"+escapeMarkdownV2(urlObj.toString()));
if (payload.source != 'shortcut') {if(additionalInfoInput.length>0)
 captionParts.push(`>${escapeMarkdownV2(additionalInfoInput)}`);
}
captionParts.push(`\\#işbirliği \\#amazon`);

const text = captionParts.filter(Boolean).join("\n\n");

const telegramRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
        "Content-Type": "application/json"
    },
    body: JSON.stringify({
        chat_id: CHANNEL_CHAT_ID,
        text: text,
       link_preview_options: {
        is_disabled: true
    },
        parse_mode: "MarkdownV2",
        disable_notification: !soundEnabled
    })
});

const json = await telegramRes.json();
if (!json.ok) throw new Error(JSON.stringify(json));
return json;

    
  
 
}

// Mesaj dinleyici
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {      
    if (msg.action === 'sendProduct') {  
        sendProduct(msg.payload)
            .then(() => sendResponse({ ok: true }))
            .catch(err => sendResponse({ ok: false, error: String(err) }));
        return true; 
    }

       if (msg.action === 'sendLink') {
        
       sendLink(msg.payload)
            .then(() => sendResponse({ ok: true }))
            .catch(err => sendResponse({ ok: false, error: String(err) }));
        return true; 
    }
    
});




function createNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: chrome.runtime.getURL("img/amazon-notification.png"),
        title: title,
        message: message
    });
}
 
// Kısayol tuşu dinleyici
chrome.commands.onCommand.addListener((command) => {
    if (command === 'send_to_product') {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const tab = tabs[0];
            if (tab && tab.url.includes('amazon.')) {
                try {
                    chrome.tabs.sendMessage(tab.id, { action: 'sendProduct' }, (response) => {
                        if (response && response.success) {
                            response.data.source = 'shortcut';
                            sendProduct(response.data).then(() => {
                       createNotification("Başarılı", "✔ Telegram’a başarıyla gönderildi!");
                            }).catch((err) => {
                                console.error('Kısayol ile gönderme hatası:', err);
                         createNotification("Hata", 'Kısayol ile gönderme hatası: ' + err);
                            });
                        } else {
                            console.error('Ürün verisi alınamadı.');
                           createNotification("Hata", "Ürün verisi alınamadı.");
                        }
                    });
                } catch (err) {
                    console.error('Kısayol ile gönderme hatası:', err);
                    createNotification("Hata", 'Kısayol ile gönderme hatası: ' + err);
                }
            } else {
               createNotification("Hata", "Lütfen bir Amazon ürün sayfasında olun.");
            }
        });
    }
 





 
        if (command === 'send_to_link') {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                const tab = tabs[0];
                if (tab && tab.url.includes('amazon.')) {
                    chrome.tabs.sendMessage(tab.id, { action: 'sendLink' }, (response) => {
                        if (response && response.success) {
                            response.data.source = 'shortcut';
                            sendLink(response.data).then(() => {
                             createNotification("Başarılı","✔ Telegram’a başarıyla gönderildi!");
                            }).catch((err) => {
                                console.error('Kısayol ile gönderme hatası:', err);
                                 createNotification("Hata", 'Kısayol ile gönderme hatası: ' + err);
                                });
                            } else {
                                console.error('Kısayol ile gönderme hatası: Ürün verisi alınamadı.');
                            createNotification("Hata", "Ürün verisi alınamadı.");
                            }
                        });
                    } else {
                     createNotification("Hata", "Lütfen bir Amazon sayfasında olun.");
                    }
                });
            }
        });

        chrome.notifications.onClicked.addListener(() => {
            if (typeof CHANNEL_CHAT_ID !== 'undefined') {
                chrome.tabs.create({ url: "tg://" + CHANNEL_CHAT_ID });
            } else {
                console.error("CHANNEL_CHAT_ID tanımlı değil!");
            }
        });

chrome.alarms.create("myAlarm", { periodInMinutes: 1 });

chrome.alarms.onAlarm.addListener(() => {
   // Alarm her 1 dakikada bir tetiklenecek
   // Buraya istediğin işlemleri yazabilirsin
});