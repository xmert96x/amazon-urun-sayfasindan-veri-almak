// Sayfa yüklendiğinde çalışacak olay dinleyicisi
document.addEventListener('DOMContentLoaded', () => {
    // Gerekli HTML elementlerini seç
    const sendBtn = document.getElementById('sendBtn');
    const statusMessage = document.getElementById('statusMessage');
    const settingsBtn = document.getElementById('settingsBtn');
    const soundToggle = document.getElementById("soundToggle");

    // Ayarlar butonuna tıklayınca settings sayfasına yönlendir
    settingsBtn.addEventListener('click', () => {
        window.location.href = 'settings.html';
    });

    // BOT_TOKEN ve CHANNEL_CHAT_ID ayarlarını kontrol et, yoksa ayarlar sayfasına yönlendir
    chrome.storage.local.get(["BOT_TOKEN", "CHANNEL_CHAT_ID","AFFILIATE_TAG"], (data) => {
        if (data.CHANNEL_CHAT_ID === undefined || data.BOT_TOKEN === undefined||data.AFFILIATE_TAG === undefined) {
            window.location.href = 'settings.html';
        }
    });

    // Ses ayarının durumunu depolamadan al ve toggle'ı ayarla
    chrome.storage.local.get("soundEnabled", (data) => {
        if (data.soundEnabled !== undefined) {
            soundToggle.checked = data.soundEnabled;
        } else {
            soundToggle.checked = true; // Varsayılan olarak açık yap
            chrome.storage.local.set({ soundEnabled: true });
        }
    });

    // Ses ayarı toggle'ında bir değişiklik olduğunda yeni durumu kaydet
    soundToggle.addEventListener('change', () => {
        const isEnabled = soundToggle.checked;
        chrome.storage.local.set({ soundEnabled: isEnabled });
    });

    // Durum mesajını göstermek için yardımcı fonksiyon
    function showStatus(message, type) {
        // Eski sınıfları temizle
        statusMessage.classList.remove('success', 'error', 'warning');
        // Yeni mesajı ayarla
        statusMessage.textContent = message;
        // Yeni sınıfı ekle ve göster
        if (type) {
            statusMessage.classList.add(type);
        }
    }

    // "Gönder" butonuna tıklandığında çalışacak ana fonksiyon
    sendBtn.addEventListener('click', async () => {
        // Butonu devre dışı bırak, tekrar tıklanmasını önle
        sendBtn.disabled = true;

        // Önceki mesajı temizle
        showStatus('');

        try {
            // Aktif sekmeyi bul
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            // Aktif sayfanın Amazon'a ait olup olmadığını kontrol et
            if (!tab || !tab.url.includes('amazon.')) {
                showStatus('Hata: Lütfen bir Amazon ürün sayfasında olun.', 'error');
                return; // Hata durumunda fonksiyonu sonlandır
            }

            // Durum mesajını güncelle
            showStatus('Ürün bilgileri alınıyor...', 'warning');

            // İçerik script'ini aktif sekmeye enjekte et
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                files: ['content.js']
            });

            // Ürün bilgilerini çekmek için içerik script'ine mesaj gönder
            const response = await chrome.tabs.sendMessage(tab.id, { action: 'extractProduct' });

            // Eğer bilgi alınamadıysa hata fırlat
            if (!response || !response.success) {
                throw new Error(response?.error || 'Ürün bilgisi alınamadı.');
            }

            // Durum mesajını güncelle
            showStatus('Bilgiler alındı, Telegram\'a gönderiliyor...', 'warning');

            // Çekilen ürün bilgilerini Telegram'a göndermek için arka plan script'ine mesaj gönder
            const res = await chrome.runtime.sendMessage({ action: 'sendTelegram', payload: response.data });

            // Telegram'dan gelen yanıtı kontrol et
            if (res && res.ok) {
                // Başarılı mesajı göster
                showStatus('✔ Telegram’a başarıyla gönderildi!', 'success');
            } else {
                throw new Error(res?.error || 'Telegram\'a gönderilirken hata oluştu.');
            }  
        } catch (err) {
            // Hata durumunda ekrana hata mesajını yazdır
            showStatus('Hata: ' + err.message, 'error');
        } finally { 
            // İşlem tamamlandığında butonu tekrar etkinleştir
            sendBtn.disabled = false;
        }
    });
});