function toggleVisibility(id) {
  const input = document.getElementById(id);
  if (input) {  
    input.type = input.type === "password" ? "text" : "password"; 
    input.style.padding = "12px 40px 12px 12px";
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const toggleBotToken = document.getElementById('toggleBotToken');
  const toggleChannelId = document.getElementById('toggleChannelId');
  const botTokenInput = document.getElementById('botToken');
  const channelIdInput = document.getElementById('channelId');
    const submitBtn = document.getElementById('submitBtn');
const refTagInput = document.getElementById('refTag');
const backButton = document.getElementById('backButton');

  // Storage'dan değerleri yükle
  chrome.storage.local.get(["BOT_TOKEN", "CHANNEL_CHAT_ID","AFFILIATE_TAG"], (data) => {
    if (data.BOT_TOKEN !== undefined) botTokenInput.value = data.BOT_TOKEN;
    if (data.CHANNEL_CHAT_ID !== undefined) channelIdInput.value = data.CHANNEL_CHAT_ID;
   if (data.AFFILIATE_TAG !== undefined) refTagInput.value = data.AFFILIATE_TAG;
if (data.CHANNEL_CHAT_ID === undefined || data.BOT_TOKEN === undefined || data.AFFILIATE_TAG === undefined) {
    backButton.style.display = 'none';
} else {
    backButton.style.display = 'block';
}
       }
  
);



  // Görünürlüğü değiştir
  if (toggleBotToken) {
    toggleBotToken.addEventListener('click', () => toggleVisibility('botToken'));
  }
  if (toggleChannelId) {
    toggleChannelId.addEventListener('click', () => toggleVisibility('channelId'));
  }

  // Gönder butonu
if (submitBtn) {
  submitBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Form submit olmasın

    // Inputların geçerli olup olmadığını kontrol et
    if (!botTokenInput.checkValidity() || !channelIdInput.checkValidity()) {
      // Eğer inputlar required veya pattern dolu değilse, tarayıcı uyarısı göster
      botTokenInput.reportValidity();
      channelIdInput.reportValidity();
      return; // Kaydetme işlemi yapılmaz
    }

    // Inputlar geçerliyse storage'a kaydet
    const botToken = botTokenInput.value.trim();
    const channelId = channelIdInput.value.trim();
    chrome.storage.local.set({ BOT_TOKEN: botToken, CHANNEL_CHAT_ID: channelId ,  AFFILIATE_TAG: refTagInput.value.trim() }, () => {
  chrome.storage.local.get(["BOT_TOKEN", "CHANNEL_CHAT_ID","AFFILIATE_TAG"], (data) => {
  if (data.BOT_TOKEN !== undefined) botTokenInput.value = data.BOT_TOKEN;
      if (data.CHANNEL_CHAT_ID !== undefined) channelIdInput.value = data.CHANNEL_CHAT_ID;
         if (data.AFFILIATE_TAG !== undefined) refTagInput.value = data.AFFILIATE_TAG;
  // Burada callback içinde kontrol yap
if (
  channelIdInput.value === data.CHANNEL_CHAT_ID &&
  botTokenInput.value === data.BOT_TOKEN &&
  refTagInput.value === data.AFFILIATE_TAG
){
   
  if (backButton.style.display === 'none') {
 
  window.location.href = 'popup.html';
}
   
  const notif = document.getElementById('notification');
  notif.style.display = 'block';
  
  // animasyon ile görünür yap
  setTimeout(() => {
    notif.style.opacity = 1;
    notif.style.transform = 'translateY(0)';
    notif.innerHTML="Başarı ile kaydedildi!"
  }, 10);

  // 3 saniye sonra kaybolacak
  setTimeout(() => {
    notif.style.opacity = 0;
    notif.style.transform = 'translateY(-20px)';
    setTimeout(() => {
      notif.style.display = 'none';
    }, 500);
  }, 3000);
  }
});

    });
  });
}


  // Geri butonu
 
  if (backButton) backButton.addEventListener('click', () => window.history.back());
});
