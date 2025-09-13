<?php

// Bu betik, gelen POST verilerini kullanarak Telegram API'sine fotoğraf gönderir.
// Geliştirme ortamı için hata raporlamayı aktif hale getiriyoruz.
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Gelen POST verilerini alıyoruz. Eğer veri yoksa null atanır.
$botToken = $_POST['botToken'] ?? null;
$chatId = $_POST['chatId'] ?? null;
$caption = $_POST['caption'] ?? '';
// 'disable_notification' değeri 'true' olarak ayarlanmışsa bildirimi kapatıyoruz.
$disableNotification = isset($_POST['disable_notification']) && $_POST['disable_notification'] === 'true';
// 'parse_mode' varsayılan olarak 'MarkdownV2' olarak ayarlanır.
$parseMode = $_POST['parse_mode'] ?? 'MarkdownV2';
$imageUrl = $_POST['photo'] ?? null;

// Gerekli verilerin varlığını kontrol ediyoruz. Eksikse hata döndürürüz.
if (!$botToken || !$chatId || !$imageUrl) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Eksik veriler: botToken, chatId veya photo eksik.']);
    exit;
}

// ----------------------------------------------------
// 1. GÖRSELİ İNDİRME VE GEÇİCİ DOSYAYA KAYDETME
// ----------------------------------------------------
$tmpFile = tempnam(sys_get_temp_dir(), 'telegram_');
$imageData = file_get_contents($imageUrl);
if ($imageData === false) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'Resim indirilemedi. Lütfen geçerli bir URL sağlayın.']);
    // Hata durumunda oluşturulan boş geçici dosyayı siliyoruz.
    unlink($tmpFile); 
    exit;
}
file_put_contents($tmpFile, $imageData);

// ----------------------------------------------------
// 2. TELEGRAM API'SİNE cURL İLE GÖNDERME
// ----------------------------------------------------
$url = "https://api.telegram.org/bot{$botToken}/sendPhoto";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);

// Gönderilecek verileri bir dizi olarak hazırlıyoruz.
// 'photo' alanı için `CURLFile` sınıfını kullanarak, dosyanın yolunu belirtiyoruz.
$postFields = [
    'chat_id' => $chatId,
    'photo' => new CURLFile($tmpFile),
    'caption' => $caption,
    'disable_notification' => $disableNotification,
    'parse_mode' => $parseMode
];
curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);

// İsteğiniz doğrultusunda özel User-Agent başlığını ekliyoruz.
curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:142.0) Gecko/20100101 Firefox/142.0');

// cURL isteğini çalıştırıp yanıtı alıyoruz.
$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

// Geçici dosyayı siliyoruz. Bu, kaynak yönetiminde önemlidir.
unlink($tmpFile);

// ----------------------------------------------------
// 3. YANITI DÖNDÜRME
// ----------------------------------------------------
if ($curlError) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'cURL hatası: ' . $curlError]);
    exit;
}

// Telegram API'sinin yanıtını doğrudan döndürüyoruz.
header('Content-Type: application/json');
echo $response;

?>