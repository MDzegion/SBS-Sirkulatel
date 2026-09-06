# Application Flow & Process Specifications (APP FLOW)
## Sistem Bisnis Sederhana (SBS Sirkulatel)
*Dokumen Alur Aplikasi & Transisi Status — Versi 1.1 (MVP Rapikan)*
*Pendekatan: Spec-Driven Development (SDD)*

---

## 1. Arsitektur Navigasi Global

Aplikasi mengadopsi navigasi yang ringkas, bersih, dan dioptimalkan untuk mobile maupun tablet/desktop:

```mermaid
graph TD
    Root[SBS Sirkulatel App] --> NavDashboard[1. Dashboard Ringkasan]
    Root --> NavSimulator["2. Business Simulator (Fitur Unggulan MVP)"]
    Root --> NavPOS[3. Kasir / Penjualan]
    Root --> NavProduksi[4. Dapur Produksi]
    Root --> NavInventori[5. Bahan, Supplier & Pembelian]
    Root --> NavBiaya[6. Pengeluaran & Laporan]

    NavSimulator --> SimHarga[Simulasi Harga Jual]
    NavSimulator --> SimProduksi[Simulasi Kapasitas Produksi]
    NavSimulator --> SimBahan[Simulasi Kenaikan Bahan]
    NavSimulator --> SimTarget[Simulasi Target Omzet]
    NavSimulator --> SimCompare[Komparasi Skenario A vs B]
    NavSimulator --> SimCopy[Salin ke Rencana Produksi]
    SimCopy --> NavProduksi
```

---

## 2. Alur Transaksi Operasional Aktual

### 2.1 Alur Pengadaan Bahan, Supplier & Restok
```mermaid
sequenceDiagram
    actor User as Pemilik UMKM / Dapur
    participant BahanUI as Menu Bahan Baku
    participant BeliUI as Form Pembelian
    participant DB as Database

    User->>BahanUI: Input / pilih bahan
    alt Stok menipis
        BahanUI->>User: Alert stok kurang + tombol Restok
        User->>BeliUI: Buka form restok
    else Restok dari menu
        User->>BeliUI: Buka Pembelian
    end
    User->>BeliUI: Qty, harga beli, supplier opsional
    BeliUI->>DB: Commit purchase (ACID)
    Note over DB: stok += qty, cost_per_unit = harga terakhir
    DB-->>BeliUI: Stok & harga beli terkini terbarui
```

Pembelian bahan tidak menulis ke pengeluaran operasional.

### 2.2 Alur Penyusunan Resep
```mermaid
sequenceDiagram
    actor User as Pemilik UMKM / Dapur
    participant ResepUI as Menu Resep (BOM)
    participant Core as Shared Core Engine
    participant DB as Database

    User->>ResepUI: Buat Resep Baru "Puding Coklat"
    User->>ResepUI: Tambahkan Bahan (Telur 0.5 butir, Susu 100ml, Cup Rp500)
    ResepUI->>Core: calculateHPP(resep, daftarHargaBahan)
    Core-->>ResepUI: Return HPP Rp2.100 / unit
    ResepUI->>DB: Simpan Resep & Set Default HPP Produk
```

### 2.3 Alur Produksi Batch Aktual & Pengurangan Stok
```mermaid
flowchart TD
    Start([Mulai / buka draf produksi]) --> SelectProduct[Pilih Produk atau buka draf dari Simulator]
    SelectProduct --> InputQty[Masukkan / tinjau jumlah target]
    InputQty --> SaveDraft[Status: DRAFT — stok belum berubah]
    SaveDraft --> CheckStock{Stok Bahan Baku Cukup?}

    CheckStock -- Tidak --> AlertStock[Peringatan bahan kurang + tombol Restok]
    AlertStock --> Restok[Alur Pembelian 2.1]
    Restok --> CheckStock

    CheckStock -- Ya --> ConfirmProduce[Konfirmasi Mulai Masak / Selesai]
    ConfirmProduce --> DeductRawStock[Potong stok bahan baku]
    DeductRawStock --> CalcActualHPP[HPP riil = total biaya / actual yield]
    CalcActualHPP --> IncreaseProductStock[Tambah stok barang jadi]
    IncreaseProductStock --> Finish([Status: COMPLETED])
```

### 2.4 Alur Kasir POS & Penjualan Cepat
```mermaid
flowchart TD
    POSStart([Kasir Buka]) --> AddItem[Pilih Produk & Kuantitas]
    AddItem --> TotalSummary[Tampilkan Total Tagihan]
    TotalSummary --> ChoosePay[Pilih Metode: Tunai / QRIS / Transfer]
    ChoosePay --> ProcessPay[Terima Uang & Tampilkan Nota]
    ProcessPay --> AutoDeduct[Potong Stok Barang Jadi]
    AutoDeduct --> RecordRevenue[Catat Omzet & Laba Kotor]
    RecordRevenue --> POSFinish([Siap Transaksi Baru])
```

---

## 3. Alur Business Simulator (Progressive Disclosure)

Sesuai **UX RULE Addendum**, antarmuka simulator **anti-spreadsheet**:

$$\text{Pilih Produk} \longrightarrow \text{Masukkan Angka} \longrightarrow \text{Simulasikan} \longrightarrow \text{Lihat Dampaknya}$$

Tidak semua parameter ditampilkan sekaligus. Markup dan rumus tidak ditampilkan.

```mermaid
flowchart TD
    subgraph UX_Flow_Simulator["Alur Interaksi Business Simulator"]
        Step1[1. PILIH PRODUK]
        Step2[2. PILIH PERTANYAAN BISNIS<br/>- Tes harga jual?<br/>- Tes jumlah produksi?<br/>- Tes kenaikan harga bahan?<br/>- Tes target omzet?]
        Step3[3. INPUT MINIMAL<br/>Hanya kontrol relevan]
        Step4[4. KLIK SIMULASIKAN<br/>atau perubahan nilai langsung]
        Step5[5. KARTU HASIL<br/>Modal, HPP, Omzet, Laba kotor, Margin]
        Step6[6. INSIGHT BAHASA MANUSIA<br/>Tanpa klaim terbaik/optimal]
        Step7{Simpan skenario atau salin ke dapur?}
    end

    Step1 --> Step2 --> Step3 --> Step4 --> Step5 --> Step6 --> Step7
    Step7 -- Simpan --> SaveScenario[Simpan Skenario A atau B]
    SaveScenario --> CompareView[Komparasi A vs B vs Kondisi Aktual]
    Step7 -- Salin --> CopyDraft[Buat production_orders DRAFT]
    CopyDraft --> Dapur[Buka Dapur — stok belum berubah]
    Step7 -- Ubah angka --> Step3
```

---

## 4. Rincian Alur 4 Use Case Wajib Simulator

### 4.1 Use Case 1: Menentukan Harga Jual
1. Pengguna memilih produk: **Puding Coklat**.
2. Sistem menampilkan HPP dasar: **Rp2.100**.
3. Kontrol harga jual: tombol cepat `[Rp3.000]` `[Rp4.000]` `[Rp5.000]` atau input manual.
4. Saat memilih `[Rp5.000]`:
   - Laba kotor per unit: **Rp2.900**
   - Margin: **58.0%**
   - Insight: *"Harga Rp5.000 memberi margin 58.0%, lebih tinggi dibanding Rp3.000 dan Rp4.000 yang Anda coba."*
5. Dilarang: menyebut harga tersebut sebagai harga terbaik.

### 4.2 Use Case 2: Menentukan Jumlah Produksi
1. Pengguna memilih produk: **Puding Coklat**.
2. Pengguna menggeser slider produksi ke: **100 cup**.
3. Sistem menghitung:
   - Estimasi modal: **Rp210.000**
   - Rincian kebutuhan bahan
   - Potensi omzet (harga Rp5.000): **Rp500.000**
   - Potensi laba kotor: **Rp290.000**
   - Margin: **58.0%**
4. Insight: *"Untuk memproduksi 100 cup, Anda perlu menyiapkan modal sekitar Rp210.000."*

### 4.3 Use Case 3: Simulasi Kenaikan Harga Bahan
1. Pengguna membuka *"Kenaikan Harga Bahan"* (panel tersembunyi sampai dipilih).
2. Sistem menampilkan bahan dalam resep Puding Coklat.
3. Pengguna mengubah **Telur** dari **Rp2.000** menjadi **Rp2.500** per butir.
4. Kartu perbandingan:
   - HPP: Rp2.100 → **Rp2.350**
   - Margin (harga jual Rp5.000): 58.0% → **53.0%**
5. Insight: *"Kenaikan harga telur menurunkan margin sekitar 5 poin persentase. Anda tetap untung Rp2.650 per cup."*

### 4.4 Use Case 4: Target Omzet (default)
1. Pengguna memasukkan target omzet: **Rp1.000.000**.
2. Harga jual aktif: **Rp5.000**.
3. Sistem menghitung:
   $$\text{Target unit} = \left\lceil \frac{\text{Rp1.000.000}}{\text{Rp5.000}} \right\rceil = 200\ \text{unit}$$
   $$\text{Modal} = 200 \times \text{HPP per unit}$$
4. Insight: *"Untuk mencapai omzet Rp1.000.000 dengan harga Rp5.000/unit, diperlukan penjualan sekitar 200 unit."*
5. **Opsi lanjutan**: target laba — tidak ditampilkan di langkah awal.
6. Kartu BEP hanya muncul jika pengguna mengisi alokasi biaya tetap.

### 4.5 Salin ke Rencana Produksi
```mermaid
sequenceDiagram
    actor User as Pengguna
    participant Sim as Simulator
    participant DB as Database
    participant Dapur as Dapur Produksi

    User->>Sim: Salin ke Rencana Produksi
    Sim->>DB: INSERT production_orders status=DRAFT source=SIMULATOR_COPY
    Note over DB: current_stock tidak berubah
    Sim->>User: Draf siap di Dapur
    User->>Dapur: Buka draf, cek stok, konfirmasi
    Dapur->>DB: confirmProduction — potong bahan, tambah barang jadi
```

---

## 5. Diagram Transisi Status (State Machine)

### 5.1 Siklus Skenario Simulasi
```mermaid
stateDiagram-v2
    [*] --> Idle: Buka Modul Simulator
    Idle --> ProductLoaded: Pilih Produk
    ProductLoaded --> Calculating: Ubah Parameter
    Calculating --> ResultRendered: Output Dihitung
    ResultRendered --> SkenarioASaved: Simpan Skenario A
    ResultRendered --> SkenarioBSaved: Simpan Skenario B
    ResultRendered --> DraftCopied: Salin ke Rencana Produksi
    DraftCopied --> Idle: Draf ada di Dapur, simulator tetap isolasi
    SkenarioASaved --> MatrixComparing: Buka Perbandingan
    SkenarioBSaved --> MatrixComparing: Buka Perbandingan
    MatrixComparing --> ProductLoaded: Uji produk / angka lain
```

### 5.2 Siklus Produksi Aktual
```mermaid
stateDiagram-v2
    [*] --> Draft: Input Dapur atau Salin dari Simulator
    Draft --> Validated: Cek Stok Bahan Cukup
    Draft --> OutOfStock: Stok Bahan Kurang
    OutOfStock --> Draft: Restok via Pembelian
    Draft --> Cancelled: Batalkan draf
    Validated --> Processing: Mulai Proses Masak
    Processing --> Completed: Input Hasil Riil Jadi
    Completed --> StockUpdated: Stok bahan berkurang & barang jadi masuk kasir
    StockUpdated --> [*]
    Cancelled --> [*]
```

Masuk dari simulator **hanya** ke `Draft`. Tidak pernah langsung ke `Completed`.
