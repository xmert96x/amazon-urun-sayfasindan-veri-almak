# Chrome Uzantısı Kurulum Rehberi (Paketlenmemiş)

Bu rehber, Chrome tarayıcısına paketlenmemiş bir uzantıyı yüklemek ve test etmek için **adım adım açıklama** sunar. Her adım açık, net ve görselle desteklenebilir şekilde yazılmıştır.

---

## 1️⃣ Enter’a Basın
Uzantıyı yüklemeye başlamak için sayfada **Enter tuşuna basın**.

---

## 2️⃣ Geliştirici Modunu Aç
1. Chrome’da sağ üst köşedeki **Uzantılar (Extensions)** simgesine tıklayın.  
2. Açılan sayfada sağ üstte **“Geliştirici modu” (Developer mode)** switch’ini açın.

> ✅ Not: Bu modu açmadan paketlenmemiş uzantı yüklenemez.

---

## 3️⃣ Paketlenmemiş Uzantıyı Yükle
1. Sayfanın sol üst köşesinde **“Paketlenmemiş uzantı yükle” (Load unpacked)** butonuna tıklayın.  
2. Açılan dosya seçim penceresinde uzantının bulunduğu klasörü seçin.  
   - **Dikkat:** Bu klasörde mutlaka **manifest.json** dosyası olmalıdır.  
3. **“Seç” (Select Folder)** butonuna basın.  

> ✅ İpucu: Yanlış klasör seçerseniz, Chrome hata verir.

---

## 4️⃣ Uzantıyı Kontrol Et
- Uzantı yüklendiğinde **uzantılar listesinde** görünecek.  
- Eğer uzantının bir **ikon**u varsa, Chrome araç çubuğunda belirecek.  
- Fonksiyonlarını test ederek doğru çalışıp çalışmadığını kontrol edebilirsiniz.

---

## 5️⃣ Kısayol Tuşları (Opsiyonel)
1. Sayfanın sol üstünde bulunan **“Klavye kısayolları” (Keyboard shortcuts)** linkine tıklayın.  
2. Açılan pencerede istediğiniz eylem için **tuş kombinasyonunu girin**.  
3. Atadığınız tuş ile uzantıyı hızlıca çalıştırabilirsiniz.

> ✅ Örnek: `Ctrl+Shift+U` gibi kombinasyonlar kullanabilirsiniz.

---

## 6️⃣ Güncelleme (Opsiyonel)
- Klasörde değişiklik yaptıysanız, **uzantılar sayfasında “Yenile” (Reload)** butonuna basarak güncelleyebilirsiniz.  
- Bu sayede yaptığınız değişiklikler anında tarayıcıda aktif olur.

> ⚠️ Uyarı: Her güncellemeden sonra uzantıyı test etmeyi unutmayın.

---

## Ek İpuçları
- Chrome sürümünüz güncel olmalı.  
- Manifest dosyasında doğru `manifest_version` yazdığından emin olun. (Chrome 3 kullanıyorsa `manifest_version: 3`)  
- Uzantınız ikon içeriyorsa `icons` alanını kontrol edin.  
- Hata alırsanız **Chrome uzantılar sayfasında** hata mesajlarını okuyun.

---

> Artık uzantınızı yüklediniz ve kullanmaya hazırsınız! 🎉
