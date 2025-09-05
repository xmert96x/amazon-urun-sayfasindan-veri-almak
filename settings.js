const DATA_TYPES = ['botTokens', 'chatIds', 'affiliateTags',];
let aktif_token = null;
let kanal_id = null;
let aktif_tag = null;
 
// Sekme yönetimi
function openTab(tabName) {
    chrome.storage.local.set({ activeTabName: tabName });
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`.tab-button[data-tab="${tabName}"]`).classList.add('active');
}

// Aktif verileri güncelle
async function updateActiveData() {
    chrome.storage.local.get([
        'botTokens', 'chatIds', 'affiliateTags',
        'active-botTokens-key', 'active-chatIds-key', 'active-affiliateTags-key',
        'activeTabName', 
    ], (res) => {
        aktif_token = res['active-botTokens-key'] ? res.botTokens[res['active-botTokens-key']] : null;
        kanal_id = res['active-chatIds-key'] ? res.chatIds[res['active-chatIds-key']] : null;
        aktif_tag = res['active-affiliateTags-key'] ? res.affiliateTags[res['active-affiliateTags-key']] : null;
      
  
        if (!aktif_token) openTab('botTokens');
        else if (!kanal_id) openTab('chatIds');
        else if (!aktif_tag) openTab('affiliateTags');
        else if (res.activeTabName) openTab(res.activeTabName);
        else openTab('botTokens');
    });
}

updateActiveData();
chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') updateActiveData();
});

// Veri çekme / kaydetme
function getData(type) {
    return new Promise(resolve => {
        chrome.storage.local.get([type], result => resolve(result[type] || {}));
    });
}

function saveData(type, obj) {
    return new Promise(resolve => {
        chrome.storage.local.set({ [type]: obj }, resolve);
    });
}

// Aktif anahtarı çek / ayarla
function getActiveKey(type) {
    return new Promise(resolve => {
        chrome.storage.local.get([`active-${type}-key`], result => resolve(result[`active-${type}-key`] || null));
    });
}

function setActiveKey(type, key) {
    chrome.storage.local.set({ [`active-${type}-key`]: key }, () => updateUI(type));
}

// Tabloyu render et
async function renderTable(type) {
    const tbody = document.getElementById(`botTableBody-${type}`);
    if (!tbody) return;

    const data = await getData(type);
    const activeKey = await getActiveKey(type);

    tbody.innerHTML = "";
    Object.keys(data).forEach(key => {
        const row = document.createElement('tr');
        if (key === activeKey) row.classList.add('active');

        row.innerHTML = `
            <td>${key}</td>
            <td>${data[key]}</td>
            <td class="action-buttons">
                <button class="btn-activate" ${key === activeKey ? 'disabled' : ''}>Aktif Yap</button>
                <button class="btn-delete" ${key === activeKey ? 'disabled' : ''}>Sil</button>
            </td>
        `;

        row.querySelector('.btn-activate').addEventListener('click', () => setActiveKey(type, key));
        row.querySelector('.btn-delete').addEventListener('click', async () => {
            if (confirm(`'${key}' verisini silmek istediğinizden emin misiniz?`)) {
                delete data[key];
                await saveData(type, data);
                const activeKeyNow = await getActiveKey(type);
                if (key === activeKeyNow) {
                    const remainingKeys = Object.keys(data);
                    if (remainingKeys.length > 0) setActiveKey(type, remainingKeys[0]);
                    else chrome.storage.local.remove(`active-${type}-key`, () => updateUI(type));
                } else updateUI(type);
            }
        });

        tbody.appendChild(row);
    });
}

// Program genelinde sadece ilk kez tüm veri tipleri dolduğunda yönlendirme
async function checkAndRedirectOnce() {
    const redirectInfo = await new Promise(resolve =>
        chrome.storage.local.get(['hasRedirected'], result => resolve(result.hasRedirected))
    );

    if (redirectInfo) return;

    const botTokensData = await getData('botTokens');
    const chatIdsData = await getData('chatIds');
    const affiliateTagsData = await getData('affiliateTags');
    if (Object.keys(botTokensData).length > 0 &&
        Object.keys(chatIdsData).length > 0 &&
        Object.keys(affiliateTagsData).length > 0) {
        chrome.storage.local.set({ hasRedirected: true }, () => {
            window.location.href = 'popup.html';
        });
    }
}

// Form işlemleri
function setupForm(type) {
    const form = document.getElementById(`form-${type}`);
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const key = document.getElementById(`keyInput-${type}`).value.trim();
        const value = document.getElementById(`valueInput-${type}`).value.trim();
        if (!key || !value) return;

        const data = await getData(type);
        if (data[key] && !confirm(`'${key}' adında bir veri zaten var. Üzerine yazmak istiyor musunuz?`)) return;

        data[key] = value;
        await saveData(type, data);

        const activeKey = await getActiveKey(type);
        if (!activeKey) setActiveKey(type, key);
        else updateUI(type);

        form.reset();

        await checkAndRedirectOnce();
    });
}

// UI Güncelle
async function updateUI(type) {
    await renderTable(type);
    const botTokensData = await getData('botTokens');
    const chatIdsData = await getData('chatIds');
    const affiliateTagsData = await getData('affiliateTags');    
  
    const activeBotTokenKey = await getActiveKey('botTokens');
    const activeChatIdKey = await getActiveKey('chatIds');
    const activeAffiliateTagKey = await getActiveKey('affiliateTags');
 
    aktif_token = activeBotTokenKey ? botTokensData[activeBotTokenKey] : null;
    kanal_id = activeChatIdKey ? chatIdsData[activeChatIdKey] : null;
    aktif_tag = activeAffiliateTagKey ? affiliateTagsData[activeAffiliateTagKey] : null;
 if (backButton) {
    if (aktif_token && kanal_id && aktif_tag) {
        backButton.style.display = 'block'; // hepsi aktifse göster
    } else {
        backButton.style.display = 'none'; // değilse gizle
    }
}

}

// Başlangıç
document.addEventListener('DOMContentLoaded', async () => {
    const backButton = document.getElementById('backButton');
    if (backButton) backButton.addEventListener('click', () => window.location.href = 'popup.html');

    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => openTab(btn.dataset.tab)));

    for (const type of DATA_TYPES) {
        await renderTable(type);
        setupForm(type);
    }

    await updateUI();


      const openBtn = document.getElementById('openBtn');
  const closeBtn = document.getElementById('closeBtn');
  const lightbox = document.getElementById('lightbox');

  openBtn.addEventListener('click', () => {
    lightbox.classList.add('active');
  });

  closeBtn.addEventListener('click', () => {
    lightbox.classList.remove('active');
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      lightbox.classList.remove('active');
    }
  });
});
 