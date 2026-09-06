# SBS Sirkulatel — Sistem Bisnis Sederhana (Dokumentasi SDD)

Repositori dokumentasi dan arsitektur **SBS Sirkulatel** (Sistem Bisnis Sederhana untuk UMKM F&B, Kuliner, dan Pengolahan Komoditas). Disusun dengan **Spec-Driven Development (SDD)**: spesifikasi ditetapkan sebelum implementasi kode.

Versi spek: **1.1 (MVP Rapikan)**.

---

## Mandat Addendum: Business Simulator Wajib Masuk MVP

- **Status Fitur**: **MUST HAVE — MVP**
- **Tujuan**: Memahami konsekuensi keputusan (harga, volume produksi, kenaikan harga bahan, target omzet) **sebelum** dieksekusi.
- **Prinsip**:
  1. Deterministik, non-ML.
  2. Isolasi penuh: simulasi tidak mengubah stok, penjualan, atau kas.
  3. Shared engine: HPP, margin, dan biaya simulator = rumus operasional aktual.
  4. Anti-spreadsheet, progressive disclosure.
  5. Insight informatif — dilarang klaim "harga terbaik" / "skenario optimal".
- **Jembatan ke aktual**: **Salin ke Rencana Produksi** hanya membuat draf Dapur. Stok dipotong setelah konfirmasi di Dapur.

---

## Daftar Dokumen Spesifikasi (Spec Suite)

| Dokumen | Path | Deskripsi Utama |
| :--- | :--- | :--- |
| **Product Requirements Document (PRD)** | [`docs/PRD.md`](./docs/PRD.md) | Visi, persona, modul aktual (termasuk supplier & pembelian), 4 use case simulator, out of scope, AC-01 s/d AC-14. |
| **Technical Requirements Document (TRD)** | [`docs/TRD.md`](./docs/TRD.md) | Arsitektur, formula HPP aktual vs simulasi, isolasi in-memory vs tabel skenario, kontrak TypeScript, pembelian harga terakhir, draf produksi. |
| **Database & Entity Schema (SCHEMA)** | [`docs/SCHEMA.md`](./docs/SCHEMA.md) | ERD, suppliers, purchases, status/source produksi, JSON skenario tanpa FK cascade. |
| **Application Flow (APP FLOW)** | [`docs/APP_FLOW.md`](./docs/APP_FLOW.md) | Alur restok, progressive disclosure simulator, UC4 target omzet, salin ke dapur, state machine Draft → Completed. |
| **UI/UX Design System (DESIGN SYSTEM)** | [`docs/DESIGN_SYSTEM.md`](./docs/DESIGN_SYSTEM.md) | Token, kartu metrik, wireframe, badge isolasi, tombol Salin ke Rencana Produksi. |

---

## Struktur Direktori Proyek

```text
SBS Sirkulatel/
├── docs/
│   ├── PRD.md
│   ├── TRD.md
│   ├── SCHEMA.md
│   ├── APP_FLOW.md
│   └── DESIGN_SYSTEM.md
└── README.md
```
