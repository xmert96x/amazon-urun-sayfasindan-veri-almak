function escapeMarkdownV2(text) {
  if (!text) return '';
  return text.replace(/([\_\[\]\(\)~\`\>\#\+\-\=\|\{\}\.\!\,\<\>])/g, '\\$1');
}

function extractASIN(url) {
  const match = url.match(/\/dp\/([A-Z0-9]{10})|\/gp\/product\/([A-Z0-9]{10})/);
  return match ? (match[1] || match[2]) : null;
}

function extractProduct() {
  const titleEl = document.querySelector('#productTitle');
  const title = titleEl ? titleEl.innerText.trim() : null;

let price = null;

// Birden fazla seçici ile fiyatı bulmaya çalışın.
const priceEl = document.querySelector('#corePriceDisplay_desktop_feature_div .aok-offscreen') ||
                document.querySelector('span.a-price span.a-offscreen') ||
                document.querySelector('#usedBuySection .offer-price') ||
                document.querySelector('.aok-offscreen');

// Eğer fiyat elemanı bulunduysa, fiyatı alın.
if (priceEl) {
    price = priceEl.innerText.trim();
}

 

  
function getProductSize() {
  // 1. Genişleyen twister düzenini kontrol et
  const expanderLabel = document.querySelector('#inline-twister-expander-header-size_name .a-color-secondary');
  const expanderValue = document.querySelector('#inline-twister-expanded-dimension-text-size_name');
  if (expanderLabel && expanderValue) {
    return `*${expanderLabel.textContent.trim()}* ${expanderValue.textContent.trim()}`;
  }

  // 2. Tek satırlık twister düzenini kontrol et
  const singletonLabel = document.querySelector('#inline-twister-singleton-header-size_name .inline-twister-dim-title');
  const singletonValue = document.querySelector('#inline-twister-expanded-dimension-text-size_name');
  if (singletonLabel && singletonValue) {
    return `*${singletonLabel.textContent.trim()}* ${singletonValue.textContent.trim()}`;
  }

  // 3. Dropdown (varyasyon seçimi) düzenini kontrol et
  const dropdownLabel = document.querySelector('#variation_size_name .a-form-label')?.textContent.trim();
  const selectElem = document.getElementById('native_dropdown_selected_size_name');
  const selectedSizeTemp = selectElem?.options[selectElem.selectedIndex]?.textContent.trim();
  if (dropdownLabel && selectedSizeTemp) {
    return `*${dropdownLabel}* ${selectedSizeTemp}`;
  }

  // Hiçbir boyutu bulamazsa boş dize döndür
  return '';
} const selectedSize = getProductSize();
let internationalShippingContainer = '';

const elem = document.querySelector('.a-section.a-spacing-mini');
if (elem) {
    internationalShippingContainer = elem.childNodes[0].textContent.trim();
}


  let imageUrl = null;
const imgEl = document.querySelector('#landingImage') || document.querySelector('#imgTagWrapperId img');
if (imgEl) {
  imageUrl =
    imgEl.getAttribute('data-old-hires') ||
    imgEl.getAttribute('srcset')?.split(',').pop().split(' ')[0] || // en yüksek çözünürlüklü olanı al
    imgEl.src;
}
const stockInfo = 
  document.querySelector(
    '#availabilityInsideBuyBox_feature_div #availability span.a-size-medium.a-color-success, ' +
    '#availabilityInsideBuyBox_feature_div #availability span.a-size-base.a-color-price.a-text-bold, ' +
    '#availability .a-size-base.a-color-price.a-text-bold, ' +
    '#outOfStock .a-color-price.a-text-bold'
)?.textContent.trim() || '';

     
   

let offerData = {};

// Birinci senaryoyu dener
const firstAttemptLabels = document.querySelectorAll('.offer-display-feature-label');

if (firstAttemptLabels.length > 0) {
    // Eğer birinci senaryo çalışırsa, ilgili veriyi çeker
    firstAttemptLabels.forEach(labelEl => {
        const baslik = labelEl.innerText.trim();
        const valueEl = labelEl.parentElement.querySelector('.offer-display-feature-text-message');
        if (valueEl) {
            offerData[baslik] = valueEl.innerText.trim();
        }
    });
} else {
    // Birinci senaryo başarısız olursa, ikinci senaryoyu dener
    const sellerElement = document.querySelector('#sellerProfileTriggerId');
    const fulfillmentElement = document.querySelector('#SSOFpopoverLink_ubb');

    // "Satıcı" yazısını veriden çeker
    if (sellerElement) {
        // Ebeveyn elementin tüm metnini alır ("Satıcı Amazon Depo")
        const parentText = sellerElement.parentElement.textContent.trim();
        // Boşluklara göre ayırıp ilk kelimeyi alır ("Satıcı")
        const sellerLabel = parentText.split(/\s+/)[0]; 
        
        offerData[sellerLabel] = sellerElement.textContent.trim();
    }
    
    // "Amazon Lojistik" yazısını çeker
    if (fulfillmentElement) {
        offerData[""] = fulfillmentElement.textContent;
    }
}
 

  const promos = [];
  const promoContainers = document.querySelectorAll(
    '.promoPriceBlockMessage span[data-csa-c-type="item"], ' +
    '#promotions_feature_div .a-list-item, ' +
    '#HLCX_offer-listing .a-list-item, ' +
    '.a-list-item.a-spacing-none.a-color-secondary'
  );
const conditionElement = document.querySelector('.a-section .a-row strong');
const conditionText = conditionElement ? conditionElement.innerText.trim() : '';
console.log(conditionText);


promoContainers.forEach(container => {
    const descriptionEl = container.querySelector('div.a-alert-content, span[id^="promoMessage"], span[id^="promoMessageCXCW"]');
  const marker = ".cxcwEmphasisLink";

let descriptionText = (descriptionEl ? descriptionEl.innerText : container.innerText)
    .trim()
    .replace(/\s{2,}/g, ' ')
    .replace(/\n/g, ' ');

document.querySelectorAll('.cxcwEmphasisLink').forEach(link => {
    const linkText = link.textContent.trim();
    if (linkText) {
        const regex = new RegExp(linkText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        descriptionText = descriptionText.replace(regex, '');
    }
});

descriptionText = descriptionText.trim();

    const labelEl = container.querySelector('label[id^="greenBadge"], span.a-text-bold');
    const labelText = labelEl ? labelEl.innerText.trim() : '';
if(descriptionText.includes(marker))descriptionText=descriptionText.substring(0, descriptionText.indexOf(marker));
    if ((labelText + ' ' + descriptionText).trim() &&
        !promos.some(p => ((p.label + ' ' + p.description).trim().includes((labelText + ' ' + descriptionText).trim())))) {
        promos.push({ label: labelText, description: descriptionText });
    }
});
 

   
const category =   (document.querySelector('#wayfinding-breadcrumbs_feature_div ul li a')?.textContent || '')
    .trim()
    .replace(/\s+/g, "") ||
  (document.querySelector("title")?.textContent.split(":").pop().trim().replace(/\s+/g, "") || "");

const categoryTag = category ? "#" + category : "";




 
const commentMessage = [];

 
// Alan elementini seç
const fieldElement = document.querySelector(
  '#a-popover-usedItemConditionDetailsPopover .a-section.a-spacing-micro:nth-of-type(2) span.a-size-mini'
);

if (fieldElement) { // element varsa işle
  const strongTag = fieldElement.querySelector('strong');
  const fieldName = strongTag ? strongTag.innerText.replace(':', '').trim() : 'unknown';

  // TextNode'lardan sadece metni al
  const fieldText = Array.from(fieldElement.childNodes)
    .filter(node => node.nodeType === Node.TEXT_NODE)
    .map(node => node.textContent.trim())
    .join(' ');

  commentMessage.push({
    label: fieldName,
    description: fieldText
  });
}  

 


 


  return { title, price, url: window.location.href, imageUrl, promos, stockInfo ,selectedSize,offerData,internationalShippingContainer,conditionText,categoryTag,commentMessage};
}


function sendLink() {const pageTitle = document.querySelector("title")?.textContent || '';
  return { pageTitle,url: window.location.href };}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if(msg.action==='sendProduct'){
    try{
      const data = extractProduct();
      sendResponse({ success: true, data });
    } catch(err){
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }

    if(msg.action==='sendLink'){
    try{
      const data = sendLink();
      sendResponse({ success: true, data });
    } catch(err){
      sendResponse({ success: false, error: String(err) });
    }
    return true;
  }
});
