const DATA_TYPES = ['botTokens', 'chatIds', 'affiliateTags'];
let activeToken = null;
let channelId = null;
let activeTag = null;
let backButton = null;

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
    return new Promise(resolve => {
        chrome.storage.local.get([
            'botTokens', 'chatIds', 'affiliateTags',
            'active-botTokens-key', 'active-chatIds-key', 'active-affiliateTags-key',
            'activeTabName',
        ], (res) => {
            activeToken = res['active-botTokens-key'] ? res.botTokens[res['active-botTokens-key']] : null;
            channelId = res['active-chatIds-key'] ? res.chatIds[res['active-chatIds-key']] : null;
            activeTag = res['active-affiliateTags-key'] ? res.affiliateTags[res['active-affiliateTags-key']] : null;

            if (!activeToken) openTab('botTokens');
            else if (!channelId) openTab('chatIds');
            else if (!activeTag) openTab('affiliateTags');
            else if (res.activeTabName) openTab(res.activeTabName);
            else openTab('botTokens');
            resolve();
        });
    });
}

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
    tbody.addEventListener('mousedown', e => e.preventDefault());

    const data = await getData(type);
    const activeKey = await getActiveKey(type);

    tbody.innerHTML = "";
    Object.keys(data).forEach(key => {
        const row = document.createElement('tr');
        if (key === activeKey) row.classList.add('active');

        row.innerHTML = `
            <td class="disable-text-select">${key}</td>
            <td class="disable-text-select">${data[key]}</td>
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

    activeToken = activeBotTokenKey ? botTokensData[activeBotTokenKey] : null;
    channelId = activeChatIdKey ? chatIdsData[activeChatIdKey] : null;
    activeTag = activeAffiliateTagKey ? affiliateTagsData[activeAffiliateTagKey] : null;
    
    // backButton'ın tanımlandığından emin olun
    if (backButton) {
        if (activeToken && channelId && activeTag) {
            backButton.style.display = 'block';
        } else {
            backButton.style.display = 'none';
        }
    }
}

// Başlangıç: Tüm mantık sayfa yüklendiğinde çalışır
document.addEventListener('DOMContentLoaded', async () => {
    // Değişkeni global scope'ta tanımlandığından emin olun
    backButton = document.getElementById('backButton');
    if (backButton) backButton.addEventListener('click', () => window.location.href = 'popup.html');

    document.querySelectorAll('.tab-button').forEach(btn => btn.addEventListener('click', () => openTab(btn.dataset.tab)));

    for (const type of DATA_TYPES) {
        await renderTable(type);
        setupForm(type);
    }
    
    await updateActiveData();
    await updateUI();

    const openBtn = document.getElementById('openBtn');
    const closeBtn = document.getElementById('closeBtn');
    const lightbox = document.getElementById('lightbox');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            lightbox.classList.add('active');
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            lightbox.classList.remove('active');
        });
    }

    if (lightbox) {
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) {
                lightbox.classList.remove('active');
            }
        });
    }
    
    document.addEventListener("contextmenu", function(e) {
        const selectedText = window.getSelection().toString().trim();
        if (!selectedText) {
            e.preventDefault();
        }
    });
});

chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local') {
        updateActiveData();
        updateUI(); // storage değiştiğinde arayüzü de güncelleyin
    }
});