let aktif_token = null;
let kanal_id = null;
let aktif_tag = null;
let tempres;
let globalPrice = null;
let stockInfo =null;

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
    const  shareLinkBtn = document.getElementById("shareLinkBtn")


    // Hata değişkeni kaldırıldı (gerekli değil)

async function fetchPrice() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Geçerli bir Amazon sekmesinde değilsek hemen çık
    if (!tab || !tab.url.includes('amazon.')) return null;

    let response = null;

    try {
        // 1. İlk deneme: Mesajı göndermeyi dene
        response = await chrome.tabs.sendMessage(tab.id, { action: 'sendProduct' });
           await new Promise(r => setTimeout(r, 300));  
        // Yanıt alamadığımızda veya yanıt başarısızsa hata fırlat (catch bloğuna düşmek için)
        if (!response || !response.success) {
            throw new Error("RETRY_MESSAGING");
        }

    } catch (e) {
        // Hata yakalandığında (yani 'Receiving end does not exist' hatası)
        if (e.message.includes("RETRY_MESSAGING") || e.message.includes("Receiving end does not exist")) {
            
            // 2. Content.js'yi zorla enjekte et (Eğer yüklü değilse yükle)
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });
            
            // 3. Tekrar dene (Alıcı artık hazır olmalı)
            response = await chrome.tabs.sendMessage(tab.id, { action: 'sendProduct' });

            if (!response || !response.success) {
                // İkinci deneme de başarısız olursa
                return null;
            }
        } else {
            // Diğer hataları (Network, I/O, vb.) konsola yaz
            console.error("fetchPrice hatası:", e);
            return null;
        }
    }

    // Başarılı ulaşıldıysa globalPrice'ı ayarla
    if (response && response.success) {
        globalPrice = response.data.price;
        stockInfo=response.data.stockInfo
    }

    return null;
}

// Sayfa açıldığında otomatik çalıştır
(async () => {
    await fetchPrice();
})();   

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
        if (autoPriceToggle.checked) {
            additionalInfoInput.rows = "3";
            priceInputs.style.display = 'none';
            quantityInput.required = false;
            totalPriceInput.required = false;
            quantityInput.value = null;
            totalPriceInput.value = null;
        } else {
            additionalInfoInput.rows = "3";
            priceInputs.style.display = 'block';
            quantityInput.value = null;
            totalPriceInput.value = null;
            quantityInput.required = true;
            totalPriceInput.required = true;
        }
    };

    // --- Başlangıç Ayarlarını Yükle ---
    chrome.storage.local.get(["autoPriceToggle", "soundEnabled"], (data) => {
        if (data.autoPriceToggle !== undefined) {
            autoPriceToggle.checked = data.autoPriceToggle;
        } else {
            autoPriceToggle.checked = true;
            chrome.storage.local.set({ autoPriceToggle: true });
        }

        if (data.soundEnabled !== undefined) {
            soundToggle.checked = data.soundEnabled;
        } else {
            soundToggle.checked = true;
            chrome.storage.local.set({ soundEnabled: true });
        }
        updatePriceInputs();
    });

    // --- Olay Dinleyicileri ---
    autoPriceToggle.addEventListener('change', () => {
        updatePriceInputs();
        chrome.storage.local.set({ autoPriceToggle: autoPriceToggle.checked });
    });

    soundToggle.addEventListener('change', () => {
        chrome.storage.local.set({ soundEnabled: soundToggle.checked });
    });

    settingsBtn.addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

   function showStatus(message, type) {
    statusMessage.classList.remove('success', 'error', 'warning');
    statusMessage.textContent = message;

    if (type == "success") {
        correctAudio.play();
    }
    if (type == "error") {
        incorrectAudio.play();
    }

    if (type) statusMessage.classList.add(type);
}
    sendBtn.addEventListener('click', async () => {
        sendBtn.disabled = true;

        // Ayarları kaydet
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
            let [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab || !tab.url.includes('amazon.')) {
                showStatus('Hata: Lütfen bir Amazon ürün sayfasında olun.', 'error');
               
                return;
            }

            showStatus('Ürün bilgileri alınıyor...', 'warning');

            // --- HATAYI ÇÖZEN YENİ KISIM -    --
            let response = null;

            try {
                // 1. İlk deneme: İçerik betiği yüklüyse veriyi hemen al
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'sendProduct'
                });

                // Eğer response yoksa (Receiving end hatası) veya success false ise
                if (!response || !response.success) {
                    // Bu hatayı fırlat ki catch bloğuna düşelim
                    throw new Error("RETRY_MESSAGING");
                }

            } catch (e) {
                // Sadece mesajlaşma hatasını yakala (Receiving end does not exist) veya bizim fırlattığımız "RETRY_MESSAGING" hatasını
                if (e.message.includes("RETRY_MESSAGING") || e.message.includes("Receiving end does not exist")) {

                    // 2. Content.js'yi enjekte et
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });

                    // 3. Tekrar mesaj göndermeyi dene (Alıcı artık var olmalı)
                    response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'sendProduct'
                    });

                    if (!response || !response.success) {
                        // İkinci deneme de başarısız olursa
                        throw new Error(response?.error || 'Ürün bilgisi alınamadı.');
                    }
                } else {
                    // Diğer hataları (Network, sunucu vb.) yukarı fırlat
                    throw e;
                }
            }
            // --- YENİ KISIM BİTİŞİ ---

            // Fiyat Kontrolü ve İş Mantığı (Buraya gelindiyse 'response' geçerlidir)
            if (!autoPriceToggle.checked&& !stockInfo.includes("Şu anda mevcut değil.")) {  
                const quantity = parseInt(quantityInput.value, 10);
                const totalPrice = parseFloat(totalPriceInput.value);

                // 1. NaN (Sayı Değil) Kontrolü
                if (isNaN(quantity) || isNaN(totalPrice)) {
                    showStatus('Lütfen adet ve fiyat alanlarına geçerli bir sayı giriniz!', 'error');
                   
                    sendBtn.disabled = false;
                    return;
                }

                // 2. İş Kuralı Kontrolü
                if (quantity < 1 || totalPrice <= 0) {
                    showStatus('Lütfen adet en az 1 ve toplam fiyat 0\'dan büyük olsun!', 'error');
                    
                    sendBtn.disabled = false;
                    return;
                }
            }

            showStatus('Bilgiler alındı, Telegram\'a gönderiliyor...', 'warning');

            // Telegram gönderimi için 'response.data' kullanılır
            const res = await chrome.runtime.sendMessage({
                action: 'sendProduct',
                payload: response.data,
                
            });

            if (res && res.ok) {
                showStatus('✔ Telegram’a başarıyla gönderildi!', 'success');
              
            } else {
                throw new Error(res?.error || 'Telegram\'a gönderilirken hata oluştu.');
            }
        } catch (err) {
            showStatus('Hata: ' + err.message, 'error');
         
        } finally {
            sendBtn.disabled = false;
        }
    });


        shareLinkBtn.addEventListener('click', async () => {
            shareLinkBtn.disabled=true;
             chrome.storage.local.set({ additionalInfoInput: additionalInfoInput.value });
   showStatus('');

        try {
            const [tab] = await chrome.tabs.query({
                active: true,
                currentWindow: true
            });

            if (!tab || !tab.url.includes('amazon.')) {
                showStatus('Hata: Lütfen bir Amazon sayfasında olun.', 'error');
     
                return;
            }

            showStatus('Ürün bilgileri alınıyor...', 'warning');

            // --- HATAYI ÇÖZEN YENİ KISIM -    --
            let response = null;

            try {
                // 1. İlk deneme: İçerik betiği yüklüyse veriyi hemen al
                response = await chrome.tabs.sendMessage(tab.id, {
                    action: 'sendLink'
                });

                // Eğer response yoksa (Receiving end hatası) veya success false ise
                if (!response || !response.success) {
                    // Bu hatayı fırlat ki catch bloğuna düşelim
                    throw new Error("RETRY_MESSAGING");
                }

            } catch (e) {
                // Sadece mesajlaşma hatasını yakala (Receiving end does not exist) veya bizim fırlattığımız "RETRY_MESSAGING" hatasını
                if (e.message.includes("RETRY_MESSAGING") || e.message.includes("Receiving end does not exist")) {

                    // 2. Content.js'yi enjekte et
                    await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        files: ['content.js']
                    });

                    // 3. Tekrar mesaj göndermeyi dene (Alıcı artık var olmalı)
                    response = await chrome.tabs.sendMessage(tab.id, {
                        action: 'sendLink'
                    });

                    if (!response || !response.success) {
                        // İkinci deneme de başarısız olursa
                        throw new Error(response?.error || 'Ürün bilgisi alınamadı.');
                    }
                } else {
                    // Diğer hataları (Network, sunucu vb.) yukarı fırlat
                    throw e;
                }
            }
            // --- YENİ KISIM BİTİŞİ ---

            // Fiyat Kontrolü ve İş Mantığı (Buraya gelindiyse 'response' geçerlidir)
          
            showStatus('Bilgiler alındı, Telegram\'a gönderiliyor...', 'warning');

            // Telegram gönderimi için 'response.data' kullanılır
            const res = await chrome.runtime.sendMessage({
                action: 'sendLink',
                payload: response.data,
                
            });

            if (res && res.ok) {
                showStatus('✔ Telegram’a başarıyla gönderildi!', 'success');
            
            } else {
                throw new Error(res?.error || 'Telegram\'a gönderilirken hata oluştu.');
            }
        } catch (err) {
            showStatus('Hata: ' + err.message, 'error');
           
        } finally {
            shareLinkBtn.disabled = false;
        }

         
});

}); 

