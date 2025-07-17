# Hana Stats Bot

Discord sunucuları için geliştirilmiş kapsamlı istatistik ve görev yönetim botu.

## Özellikler

### 📊 İstatistik Sistemi
- **Mesaj İstatistikleri**: Kullanıcıların gönderdiği mesaj sayılarını takip eder
- **Ses İstatistikleri**: Sesli kanallarda geçirilen süreyi dakika cinsinden kaydeder
- **Partner İstatistikleri**: Partner metni gönderimlerini takip eder
- **Zaman Aralıkları**: Günlük, haftalık, aylık ve tüm zamanlar için istatistikler
- **Görsel Grafikler**: İstatistikleri grafik ve kart formatında görüntüleme

### 🎯 Görev Sistemi
- **Görev Oluşturma**: Mesaj, ses veya partner türünde görevler oluşturma
- **Otomatik Atama**: Tüm yetkililere otomatik görev atama
- **İlerleme Takibi**: Görev ilerlemelerini gerçek zamanlı takip
- **Süre Yönetimi**: Görevler için süre belirleme ve otomatik silme
- **Durum Raporları**: Tüm yetkililerin görev durumlarını görüntüleme

### 🏆 Sıralama Sistemi
- **Top Listeler**: En aktif kullanıcıları görüntüleme
- **Kategori Bazlı**: Mesaj, ses ve partner kategorilerinde ayrı sıralamalar
- **Dönem Seçimi**: Farklı zaman aralıkları için sıralamalar

### 🤝 Partner Sistemi
- **Modal Arayüz**: Kullanıcı dostu partner metni giriş formu
- **Otomatik Takip**: Partner metni gönderimlerinin otomatik kaydedilmesi

## Kurulum

### Gereksinimler
- Node.js (v16 veya üzeri)
- Discord Bot Token
- SQLite3

### Adımlar

1. **Projeyi klonlayın**
   ```bash
   git clone <repository-url>
   cd Stats
   ```

2. **Bağımlılıkları yükleyin**
   ```bash
   npm install
   ```

3. **Ortam değişkenlerini ayarlayın**
   `.env` dosyasını düzenleyin:
   ```env
   TOKEN=your_discord_bot_token
   CLIENT_ID=your_bot_client_id
   PREFIX=.
   TARGET_VOICE_CHANNEL_ID=voice_channel_id
   TASK_LOG_CHANNEL_ID=task_log_channel_id
   SPECIAL_ADMIN_ROLE_ID=admin_role_id
   AUTHORIZED_ROLE_1=role_id_1
   AUTHORIZED_ROLE_2=role_id_2
   # ... diğer yetkili roller
   ```

4. **Botu başlatın**
   ```bash
   node index.js
   ```
   veya
   ```bash
   npm start
   ```

## Komutlar

### Prefix Komutları

#### İstatistik Komutları
- `.stats [kullanıcı]` - Kullanıcı istatistiklerini gösterir
- `.top <tür> [dönem] [limit]` - En yüksek istatistiklere sahip kullanıcıları listeler
  - Türler: `mesaj`, `ses`, `partner`
  - Dönemler: `tüm`, `ay`, `hafta`, `gün`

#### Görev Komutları (Yöneticiler)
- `.görev ekle <tür> <hedef> <açıklama> [kullanıcı] [süre]` - Yeni görev ekler
- `.görev listele` - Tüm görevleri listeler
- `.görev sil <görev_id>` - Görevi siler
- `.görev göster` - Kendi görevlerinizi gösterir
- `.görev durum` - Tüm yetkililerin görev durumunu gösterir

### Slash Komutları

- `/stats [kullanıcı]` - İstatistikleri gösterir
- `/top` - Sıralama listelerini gösterir
- `/görev` - Görev yönetimi (alt komutlarla)
- `/partner` - Partner metni gönderme formu

## Veritabanı Yapısı

Bot SQLite veritabanı kullanır ve aşağıdaki tabloları içerir:

- **user_stats**: Kullanıcı istatistikleri
- **daily_stats**: Günlük istatistikler
- **tasks**: Görev bilgileri
- **user_tasks**: Kullanıcı-görev ilişkileri

## Dosya Yapısı

```
Stats/
├── commands/           # Bot komutları
│   ├── görev.js       # Görev yönetimi
│   ├── partner.js     # Partner sistemi
│   ├── stats.js       # İstatistik komutları
│   └── top.js         # Sıralama komutları
├── config/            # Konfigürasyon dosyaları
├── database/          # Veritabanı dosyaları ve yönetimi
├── events/            # Discord event handlers
├── utils/             # Yardımcı fonksiyonlar
├── logs/              # Log dosyaları
├── .env               # Ortam değişkenleri
├── index.js           # Ana bot dosyası
└── package.json       # Proje bağımlılıkları
```

## Özellik Detayları

### İstatistik Takibi
- Mesajlar otomatik olarak sayılır
- Ses kanalı aktivitesi 5 dakikada bir güncellenir
- Partner metinleri modal arayüzü ile kaydedilir
- Tüm veriler SQLite veritabanında saklanır

### Görev Sistemi
- Yöneticiler görev oluşturabilir
- Görevler belirli süre sonra otomatik silinir
- İlerleme durumu gerçek zamanlı takip edilir
- Tamamlanan görevler otomatik işaretlenir

### Güvenlik
- Rol tabanlı yetkilendirme
- Komut izinleri kontrol edilir
- Hata yakalama ve loglama

## Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## Destek

Sorularınız veya sorunlarınız için issue açabilirsiniz.

---

**Not**: Bot'u kullanmadan önce `.env` dosyasındaki tüm gerekli değişkenleri doğru şekilde ayarladığınızdan emin olun.