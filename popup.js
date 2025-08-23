    let aktif_token = null;
    let kanal_id = null;
    let aktif_tag = null;
    let tempres;

    document.addEventListener('DOMContentLoaded', () => {
        const autoPriceToggle = document.getElementById('autoPriceToggle');
        const priceInputs = document.getElementById('priceInputs');
        const quantityInput = document.getElementById('quantityInput');
        const totalPriceInput = document.getElementById('totalPriceInput');
        const sendBtn = document.getElementById('sendBtn');
        const additionalInfoInput = document.getElementById('additionalInfoInput');
        const statusMessage = document.getElementById('statusMessage');
        const settingsBtn = document.getElementById('settingsBtn');
        const soundToggle = document.getElementById("soundToggle");
        const info = document.getElementById("info");
        const correctAudio = new Audio(chrome.runtime.getURL("correct.mp3"));
        const incorrectAudio = new Audio(chrome.runtime.getURL("incorrect.mp3"));

        let error = true;

        async function updateActiveData() {
            chrome.storage.local.get([
                'botTokens', 'chatIds', 'affiliateTags',
                'active-botTokens-key', 'active-chatIds-key', 'active-affiliateTags-key'
            ], (res) => {
                tempres = res;
                aktif_token = res['active-botTokens-key'] ? res.botTokens[res['active-botTokens-key']] : null;
                kanal_id = res['active-chatIds-key'] ? res.chatIds[res['active-chatIds-key']] : null;
                aktif_tag = res['active-affiliateTags-key'] ? res.affiliateTags[res['active-affiliateTags-key']] : null;

                if (!aktif_token || !kanal_id || !aktif_tag) {
                    window.location.href = 'settings.html';
                } else {
                    info.innerHTML = "<span class='first-line'>Parametreler</span><br>" +
                        "<b>Kanal:</b> " + res['active-chatIds-key'] + "<br>" +
                        "<b>Bot:</b> " + res['active-botTokens-key'] + "<br>" +
                        "<b>Affiliate Tag:</b> " + res['active-affiliateTags-key'];

                        
                }
            });
        }

        // Başlangıçta çalıştır
        updateActiveData();

        // Storage değiştiğinde otomatik güncelle
        chrome.storage.onChanged.addListener((changes, areaName) => {
            if (areaName === 'local') updateActiveData();
        });

        const updatePriceInputs = () => {
            if (autoPriceToggle.checked) {additionalInfoInput.rows="3";
                priceInputs.style.display = 'none';
                quantityInput.required = false;
                totalPriceInput.required = false;
            } else {additionalInfoInput.rows="3";
                priceInputs.style.display = 'flex';
                quantityInput.required = true;
                totalPriceInput.required = true;
            }
        };

        // --- Düzeltilmiş kısım ---
        chrome.storage.local.get("autoPriceToggle", (data) => {
            if (data.autoPriceToggle !== undefined) {
                autoPriceToggle.checked = data.autoPriceToggle;
            } else {
                autoPriceToggle.checked = true;
                chrome.storage.local.set({
                    autoPriceToggle: true
                });
            }
            updatePriceInputs();
        });

        // Ses toggle ayarları
        chrome.storage.local.get("soundEnabled", (data) => {
            if (data.soundEnabled !== undefined) {
                soundToggle.checked = data.soundEnabled;
            } else {
                soundToggle.checked = true;
                chrome.storage.local.set({
                    soundEnabled: true
                });
            }
        });

        // Kullanıcı ayarı değiştirdiğinde depolamayı güncelle
        autoPriceToggle.addEventListener('change', () => {
            updatePriceInputs();
            chrome.storage.local.set({
                autoPriceToggle: autoPriceToggle.checked
            });
        });

        soundToggle.addEventListener('change', () => {
            chrome.storage.local.set({
                soundEnabled: soundToggle.checked
            });
        });

        settingsBtn.addEventListener('click', () => {
            window.location.href = 'settings.html';
        });

     

        function showStatus(message, type) {
            statusMessage.classList.remove('success', 'error', 'warning');
            statusMessage.textContent = message;
            if (type) statusMessage.classList.add(type);
        }

        sendBtn.addEventListener('click', async () => {
            sendBtn.disabled = true;

            // "Gönder" butonuna tıklandığında da ayarları kaydet
        // autoPriceToggle değerini kaydet
    chrome.storage.local.set({ autoPriceToggle: autoPriceToggle.checked });

    
    if (autoPriceToggle.checked === false) {
    chrome.storage.local.set({
        productQuantity: quantityInput.value,
        totalPrice: totalPriceInput.value
    });
    }

    chrome.storage.local.set({ additionalInfoInput: additionalInfoInput.value });

    
            showStatus('');

            try {
                const [tab] = await chrome.tabs.query({
                    active: true,
                    currentWindow: true
                });

                if (!tab || !tab.url.includes('amazon.')) {
                    showStatus('Hata: Lütfen bir Amazon ürün sayfasında olun.', 'error');
                    incorrectAudio.play();
                    return;
                }

                showStatus('Ürün bilgileri alınıyor...', 'warning');

                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    files: ['content.js']
                });

                const response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'extractProduct'
                });

                if (!response || !response.success) {
                    throw new Error(response?.error || 'Ürün bilgisi alınamadı.');
                }

                if (!autoPriceToggle.checked) {
                    if (!quantityInput.value || !totalPriceInput.value) {
                        showStatus('Lütfen adet ve toplam fiyatı girin!', 'error');
                        incorrectAudio.play();
                        return;
                    }
                }

                showStatus('Bilgiler alındı, Telegram\'a gönderiliyor...', 'warning');

                const res = await chrome.runtime.sendMessage({
                    action: 'sendTelegram',
                    payload: response.data,
                    source: 'popup'
                });

                if (res && res.ok) {
                    showStatus('✔ Telegram’a başarıyla gönderildi!', 'success');
                    correctAudio.play();
                } else {
                    throw new Error(res?.error || 'Telegram\'a gönderilirken hata oluştu.');
                }
            } catch (err) {
                showStatus('Hata: ' + err.message, 'error');
                incorrectAudio.play();
            } finally {
                sendBtn.disabled = false;
            }
        });
    });
