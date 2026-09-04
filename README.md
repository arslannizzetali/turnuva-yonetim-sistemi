# 🏆 Turnuva Yönetim Sistemi

*(English version: [README.en.md](README.en.md))*

Futbol ve Voleybol turnuvalarını yönetmek için geliştirilmiş, **tamamen çevrimdışı** çalışan Electron masaüstü uygulaması. Herhangi bir internet bağlantısı, harici CDN, online font veya dış kütüphane kullanmaz — tüm veriler kullanıcının bilgisayarında saklanır.

## Özellikler

- **Kurulum Sihirbazı**: Branş (Futbol/Voleybol) → Format (Grup + Eleme / Doğrudan Eleme) → Yapılandırma (takım isimleri, grup sayısı vb.) adımlarıyla turnuva oluşturma.
- **Kura Çekilişi**: Sesli/animasyonlu simülasyon (isteğe bağlı) veya anında kura.
- **Grup Aşaması**: Otomatik fikstür (tek devreli round-robin), canlı puan durumu tablosu.
- **Eleme Ağacı (Knockout)**: 2'nin kuvveti olmayan takım sayılarında otomatik BAY (bye) dağıtımı, özel "3 takım kalırsa" kuralı (bay + yarı final).
- **Moderatör Paneli**: Takım diskalifiye etme — oynanmış maçlar korunur, oynanmamış maçlar rakip lehine hükmen sonuçlanır.
- **Takım Kilitleme**: İlk maç oynanana kadar takımlar düzenlenebilir; sonrasında kilitlenir.
- **Detaylı Skor Girişi**: Futbolda normal süre/uzatma/penaltı akışı, voleybolda set skoru; isteğe bağlı gol/kart detayı (Gol Krallığı & Kart Ceza Tablosu istatistikleri).
- **Yazdırma / PDF**: Tek tuşla A4'e uygun çıktı (Windows'un "Microsoft Print to PDF" seçeneğiyle PDF olarak da kaydedilebilir).
- **JSON Yedekleme**: Turnuva veya tüm veritabanını dışa/içe aktarma (flash bellek ile taşınabilir).
- **Şampiyonluk Kutlaması**: Konfeti animasyonu ve kupa ekranı.

## Proje Yapısı

```
├── main.js              # Electron ana süreç (pencere, menü, dosya kaydetme diyaloğu)
├── index.html            # Uygulama kabuğu (tüm görünümler JS ile buraya render edilir)
├── icon.ico               # Uygulama / build ikonu
├── css/
│   └── style.css          # Tüm arayüz stilleri (lacivert/beyaz/yeşil tema)
├── js/
│   ├── utils.js            # Yardımcı fonksiyonlar, localStorage, Web Audio sesleri
│   ├── model.js             # Veri modeli: turnuva, kura, fikstür, puan durumu, diskalifiye mantığı
│   ├── render.js            # Tüm arayüz render fonksiyonları ve ekran akışları
│   └── app.js                # Olay delegasyonu (buton tıklamaları), JSON dışa/içe aktarma, başlangıç
└── package.json
```

## Geliştirme

```bash
npm install
npm start
```

## Windows Taşınabilir (.exe) Derleme

```bash
npm run build:win
```

Çıktı `dist/` klasöründe `TurnuvaYonetimSistemi-Portable.exe` olarak oluşur. Bu dosya kuruluma ihtiyaç duymadan çift tıklayarak çalışır.

> **Not:** `icon.ico` şu an yer tutucu bir simgedir. Teslim öncesi kendi logonuzla değiştirip aynı isimle (`icon.ico`) kaydetmeniz yeterlidir.

## Veri Saklama

Tüm turnuva verileri tarayıcı motorunun (Chromium/Electron) `localStorage` alanında, kullanıcının bilgisayarında saklanır. İnternet bağlantısı hiçbir aşamada gerekmez.
