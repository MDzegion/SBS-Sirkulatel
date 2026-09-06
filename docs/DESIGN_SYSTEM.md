# UI/UX Design System & Screen Specifications (DESIGN SYSTEM)
## Sistem Bisnis Sederhana (SBS Sirkulatel)
*Dokumen Spesifikasi Desain & Komponen Antarmuka — Versi 1.1 (MVP Rapikan)*
*Pendekatan: Spec-Driven Development (SDD)*

---

## 1. Filosofi Desain

Antarmuka SBS Sirkulatel dirancang untuk mematahkan stigma bahwa sistem pencatatan usaha dan simulasi finansial harus berbentuk "tabel excel yang kaku dan rumit":
1. **Anti-Spreadsheet & Human-First**: Setiap angka penting disajikan sebagai **Kartu Metrik (Metric Card)** yang bernapas dan bersih. Tidak menampilkan rumus, markup, atau jargon.
2. **Progressive Disclosure**: Kontrol input hanya muncul saat dibutuhkan. Pengguna dipandu langkah demi langkah. Tidak semua parameter simulasi tampil bersamaan.
3. **Visual Feedback Instan**: Setiap pergeseran slider atau pemilihan angka menghasilkan animasi angka berganti halus (*count-up transition*).
4. **Warna Bernuansa Sehat**: Indikator hijau/emerald untuk profit sehat, kuning untuk waspada, dan merah untuk zona bahaya.
5. **Isolasi Terlihat**: Badge permanen bahwa mode simulasi tidak mengubah stok dan kas.

---

## 2. Design Tokens (CSS Architecture)

### 2.1 Color Palette

```css
:root {
  /* Brand Primary - Forest Emerald */
  --color-primary-50: #ECFDF5;
  --color-primary-100: #D1FAE5;
  --color-primary-500: #10B981;
  --color-primary-600: #059669;
  --color-primary-700: #047857;
  --color-primary-900: #064E3B;

  /* Secondary Accent - Warm Amber / Insight */
  --color-accent-50: #FFFBEB;
  --color-accent-500: #F59E0B;
  --color-accent-600: #D97706;

  /* Semantic Alert - Coral Rose */
  --color-danger-50: #FEF2F2;
  --color-danger-500: #EF4444;
  --color-danger-600: #DC2626;

  /* Neutrals & Surfaces */
  --color-surface-bg: #F8FAFC;
  --color-surface-card: #FFFFFF;
  --color-surface-card-subtle: #F1F5F9;
  --color-border: #E2E8F0;
  --color-border-hover: #CBD5E1;

  /* Text & Typography */
  --color-text-title: #0F172A;
  --color-text-body: #334155;
  --color-text-muted: #64748B;
  --color-text-inverted: #FFFFFF;

  /* Shadows & Elevation */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.04);

  /* Border Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-full: 9999px;
}
```

### 2.2 Tipografi
- **Primary Font Family**: `'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif`
- **Timbangan Skala**:
  - `Display / Headline`: `24px / 1.3 (SemiBold / Bold)`
  - `Card Title`: `16px / 1.4 (SemiBold)`
  - `Body Regular`: `14px / 1.5 (Regular / Medium)`
  - `Caption / Micro`: `12px / 1.4 (Medium)` — label satuan (`per unit`, `butir`, `% margin`)

---

## 3. Komponen Inti Antarmuka (Core Components)

### 3.1 Kartu Metrik Utama (Metric Card)

```text
┌──────────────────────────────────────────────┐
│ [icon: dompet]  ESTIMASI MODAL TOTAL         │
│ Rp210.000                                    │
│ Kebutuhan bahan untuk 100 cup                │
└──────────────────────────────────────────────┘
```

Label UI: **Margin** (bukan "Margin Bersih", bukan "Markup").

### 3.2 Slider Kontrol Interaktif

```text
Jumlah Produksi: [ 100 cup ]
[─────●─────────────────────────────]
Min: 10 cup                        Max: 500 cup
```

### 3.3 Insight Banner
Menerjemahkan angka ke bahasa sehari-hari. Dilarang kata "terbaik" / "optimal".

```text
┌─────────────────────────────────────────────────────────────┐
│ INSIGHT                                                     │
│ Harga Rp5.000 menghasilkan margin 58.0% (laba kotor         │
│ Rp2.900/cup). Dengan 100 cup, potensi laba kotor Rp290.000. │
└─────────────────────────────────────────────────────────────┘
```

### 3.4 Matriks Perbandingan Skenario

```text
┌─────────────────────────────────────────────────────────────┐
│                    KONDISI AKTUAL   SKENARIO A   SKENARIO B │
│ Jumlah Produksi:   50 cup           50 cup       100 cup    │
│ Harga Jual:        Rp5.000          Rp5.000      Rp4.500    │
│ Modal Dibutuhkan:  Rp105.000        Rp105.000    Rp210.000  │
│ Potensi Omzet:     Rp250.000        Rp250.000    Rp450.000  │
│ Potensi Laba Kotor:Rp145.000        Rp145.000    Rp240.000  │
│ Margin:            58.0%            58.0%        53.3%      │
│                                                             │
│ [ Simpan Skenario ]  [ Salin ke Rencana Produksi ]          │
└─────────────────────────────────────────────────────────────┘
```

Tombol **Salin ke Rencana Produksi** menyalin produk + jumlah ke draf Dapur. Stok dan kas belum berubah. Setelah diklik, tampilkan: *"Rencana produksi sudah ada di Dapur. Stok baru berkurang setelah Anda konfirmasi di sana."*

### 3.5 Badge Isolasi (permanen di layar simulator)

```text
Mode Simulasi: Data stok & uang kas Anda tidak terpengaruh.
```

### 3.6 Kartu BEP (kondisional)
Hanya dirender jika pengguna mengisi alokasi biaya tetap. Jika tidak, komponen tidak ada di layout.

### 3.7 Opsi Lanjutan — Biaya Tertentu
Tersembunyi di belakang `[ + Ubah biaya kemasan / overhead ]`. Default tertutup.

---

## 4. Spesifikasi Tata Letak Layar (Screen Wireframes)

### 4.1 Layar Utama: Business Simulator (Desktop & Tablet)

```text
┌────────────────────────────────────────────────────────────────────────┐
│  SBS SIRKULATEL         [Dashboard] [Simulator] [Kasir] [Produksi]      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  BUSINESS SIMULATOR — Uji Keputusan Sebelum Eksekusi                   │
│  Cek potensi laba dan modal tanpa merusak data bisnis asli             │
│  [ Mode Simulasi: stok & kas tidak terpengaruh ]                       │
│                                                                        │
│  ┌─────────────────────────────────┐ ┌───────────────────────────────┐ │
│  │ 1. PILIH PRODUK                 │ │ HASIL SIMULASI                │ │
│  │ Produk: [ Puding Coklat Cup v ] │ │                               │ │
│  │ HPP Saat Ini: Rp2.100/cup       │ │ ┌──────────────┐ ┌──────────┐ │ │
│  │ Harga Jual Normal: Rp5.000      │ │ │MODAL         │ │LABA KOTOR│ │ │
│  ├─────────────────────────────────┤ │ │ Rp210.000    │ │ Rp290.000│ │ │
│  │ 2. PILIH PARAMETER              │ │ └──────────────┘ └──────────┘ │ │
│  │ (•) Jumlah Produksi             │ │ ┌──────────────┐ ┌──────────┐ │ │
│  │ ( ) Ubah Harga Jual             │ │ │POTENSI OMZET │ │MARGIN    │ │ │
│  │ ( ) Kenaikan Harga Bahan        │ │ │ Rp500.000    │ │ 58.0%    │ │ │
│  │ ( ) Target Omzet                │ │ └──────────────┘ └──────────┘ │ │
│  │                                 │ │                               │ │
│  │ Rencana Produksi: [ 100 cup ]   │ │ INSIGHT:                      │ │
│  │ [────●───────────────────────]  │ │ Margin 58.0% tergolong sehat  │ │
│  │                                 │ │ untuk usaha porsi.            │ │
│  │ [ SIMULASIKAN ]                 │ │                               │ │
│  │                                 │ │ [ + Simpan Skenario A ]       │ │
│  │ [ + Ubah biaya kemasan/overhead]│ │ [ Bandingkan Skenario ]       │ │
│  │                                 │ │ [ Salin ke Rencana Produksi ] │ │
│  └─────────────────────────────────┘ └───────────────────────────────┘ │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

Target laba dan BEP tidak ada di layar awal.

### 4.2 Layar Responsive: Business Simulator (Mobile)
1. **Header Ringkas**: Logo + selector produk + badge isolasi.
2. **Kartu Input**: satu parameter aktif (radio) + slider/input.
3. **Kartu Hasil**: 4 kotak metrik (2x2) — Modal, Laba kotor, Omzet, Margin.
4. **Insight Text**.
5. **Aksi**: Simpan Skenario, Bandingkan, Salin ke Rencana Produksi.

### 4.3 Umpan balik setelah Salin ke Rencana Produksi

```text
┌────────────────────────────────────────────┐
│ Rencana produksi 100 cup Puding Coklat     │
│ sudah ada di Dapur sebagai draf.           │
│ Stok bahan belum dipotong.                 │
│ [ Buka Dapur ]        [ Tetap di Simulator]│
└────────────────────────────────────────────┘
```

---

## 5. Panduan Micro-Interactions & Animasi

1. **Slider Dragging**: estimasi modal dan laba interpolasi angka tanpa jeda.
2. **Color Shift Margin**:
   - Margin ≥ 50%: teks **Emerald 600**.
   - Margin 20%–49%: teks **Amber 600**.
   - Margin < 20%: teks **Rose 600** + ikon peringatan.
3. **Tombol Salin**: disabled sampai ada hasil simulasi valid (`productionQty > 0`).
4. Jangan tampilkan markup, rumus, atau label "Margin Bersih".
