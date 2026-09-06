# STORYBOARD — Video Tutorial SBS Sirkulatel

Untuk ibu-ibu pelaku UMKM. Bahasa Indonesia sehari-hari, tanpa istilah teknis.
`say` = teks untuk voiceover (angka dieja, agar TTS natural).
`show` = teks subtitle (boleh angka digit).

Toolchain ( reproducible ):
- HyperFrames CLI 0.8.30 (pola komposisi + render), skill dibaca dari `.skills/`
- Voiceover: Edge TTS `id-ID-GadisNeural` via `node-edge-tts`
- Rekaman layar: Playwright Chromium `recordVideo`, viewport 540x960 (mobile)
- Rakit: FFmpeg 6.1.1 (`node_modules/ffmpeg-static`)
- Master: portrait 1080x1920. Landscape 1920x1080 diturunkan via blur-pillarbox.
- Musik: tidak ada (fokus ke suara narasi).

Konvensi waktu: durasi tiap scene = durasi audio + ekor 0,5 dtk (animasi) /
tahan画面 hingga audio selesai (rekaman layar). SRT dibangkitkan dari naskah.

---

## EP1 — Konsep dagang (animasi HyperFrames, portrait)

Tujuan: paham modal, HPP, margin sebelum menyentuh aplikasi.

### ep1-s1 hook
- say: Jualan puding, laris terus. Tapi kok uangnya tidak nambah-nambah? Mungkin bukan kurang laris. Mungkin hitungnya yang belum pas.
- show: Jualan laris, tapi uang tidak nambah? Mungkin hitungnya belum pas.
- visual: teks besar + ilustrasi cup puding CSS.

### ep1-s2 modal
- say: Setiap bikin puding, ada modalnya. Telur, susu, gula, dan cup. Semua dijumlah. Itu namanya modal.
- show: Modal = semua bahan yang dibeli (telur, susu, gula, cup).
- visual: 4 kartu bahan muncul berurutan, total di bawah.

### ep1-s3 hpp
- say: Modal dua ratus sepuluh ribu, jadinya seratus cup. Modal dibagi jumlah yang jadi. Hasilnya dua ribu seratus per cup. Itu namanya HPP.
- show: Modal Rp210.000 ÷ 100 cup = HPP Rp2.100/cup.
- visual: animasi hitung 210000 / 100 = 2100.

### ep1-s4 margin
- say: Dijual lima ribu per cup. Lima ribu dikurangi dua ribu seratus, untungnya dua ribu sembilan ratus per cup. Itu lima puluh delapan persen. Namanya margin.
- show: Rp5.000 − Rp2.100 = untung Rp2.900/cup (margin 58%).
- visual: bar harga vs HPP, sisa hijau = untung.

### ep1-s5 simulator
- say: Nah, sebelum masak banyak-banyak, keputusannya bisa dicoba dulu di Business Simulator. Tidak merusak catatan asli. Caranya ada di video ketiga.
- show: Coba dulu di Business Simulator — aman, tidak merusak catatan.
- visual: mockup tombol SIMULASIKAN + badge aman.

### ep1-s6 cta
- say: SBS Sirkulatel. Catat harian, uji keputusan sebelum eksekusi.
- show: SBS Sirkulatel — catat harian, uji keputusan sebelum eksekusi.
- visual: logo teks + tagline.

---

## EP2 — Isi data awal (rekaman layar aplikasi)

Tujuan: dari kosong sampai punya bahan + resep + HPP.

### ep2-s1 seed
- say: Pertama, kita isi data contoh dulu, supaya bisa langsung coba-coba. Tekan tombol Isi Data Contoh.
- show: Tekan "Isi Data Contoh" untuk mulai coba-coba.
- aksi: dashboard → klik Isi Data Contoh → tunggu daftar produk.

### ep2-s2 bahan
- say: Sekarang bahan-bahannya sudah ada. Telur, susu, dan gula. Lihat di menu Bahan.
- show: Bahan sudah terisi: telur, susu, gula. Buka menu Bahan.
- aksi: klik nav Bahan → daftar bahan terlihat.

### ep2-s3 stok
- say: Setiap bahan ada harga dan stoknya. Kalau stoknya menipis, nanti ada tandanya sendiri.
- show: Tiap bahan ada harga + stok. Stok menipis ada tandanya.
- aksi: tahan di daftar bahan (scroll pelan bila perlu).

### ep2-s4 resep
- say: Lalu buka tab Produk dan Resep. Satu cup puding butuh setengah butir telur, sedikit susu, sedikit gula, dan cup kemasan.
- show: Tab Produk & Resep: 1 cup = telur + susu + gula + cup.
- aksi: klik tab Produk & Resep → klik Resep pada Puding Coklat.

### ep2-s5 hpp
- say: Dari resep itu, aplikasi langsung menghitung HPP. Dua ribu seratus per cup. Kita tidak usah menghitung sendiri.
- show: HPP dihitung otomatis: Rp2.100/cup. Tanpa hitung manual.
- aksi: tahan di angka HPP → tekan Simpan Resep bila belum tersimpan.

---

## EP3 — Business Simulator (rekaman layar aplikasi)

Tujuan: 4 pertanyaan bisnis + bandingkan + salin ke dapur.

### ep3-s1 buka
- say: Ini menu yang paling penting. Business Simulator. Di sini kita boleh coba-coba tanpa takut merusak catatan.
- show: Business Simulator: coba-coba tanpa merusak catatan.
- aksi: klik nav Simulator → pilih Puding Coklat → tunggu HPP resep.

### ep3-s2 qty
- say: Contoh. Kalau bikin seratus cup, modalnya dua ratus sepuluh ribu. Kalau habis terjual, untungnya bisa dua ratus sembilan puluh ribu.
- show: 100 cup → modal Rp210.000, potensi untung Rp290.000.
- aksi: pastikan mode Jumlah produksi, jumlah 100 → tahan di kartu hasil.

### ep3-s3 harga
- say: Coba ganti harga. Kalau jual empat ribu, untungnya langsung turun. Kelihatan seketika.
- show: Ganti harga jual → untung langsung berubah.
- aksi: mode Ubah harga jual → isi 4000 → tahan di margin.

### ep3-s4 bahan
- say: Coba kalau harga telur naik. HPP ikut naik, margin turun. Tapi masih untung, jadi tidak usah panik.
- show: Harga telur naik → margin turun, tapi tetap untung.
- aksi: mode Kenaikan harga bahan → isi telur 2500 → tahan di banner.

### ep3-s5 target
- say: Punya target? Misalnya mau omzet satu juta. Tulis angkanya, langsung keluar jawabannya. Butuh jual sekitar dua ratus cup.
- show: Target omzet Rp1.000.000 → butuh ±200 cup.
- aksi: mode Target omzet → isi 1000000 → tahan di banner.

### ep3-s6 banding
- say: Hasil coba-coba bisa disimpan. Skenario A, skenario B, lalu dibandingkan. Yang satu untungnya lebih besar, tapi modalnya juga lebih besar.
- show: Simpan Skenario A & B, lalu bandingkan.
- aksi: simpan A → simpan B → Bandingkan Skenario → tahan di tabel.

### ep3-s7 salin
- say: Kalau sudah mantap, tekan Salin ke Rencana Produksi. Rencananya pindah ke Dapur. Stok belum kepotong, jadi aman.
- show: Salin ke Rencana Produksi → pindah ke Dapur, stok aman.
- aksi: Salin → dialog muncul → Tetap di Simulator (tutup dialog).

---

## EP4 — Jualan harian (rekaman layar aplikasi)

Tujuan: dapur → kasir → laporan + biaya.

### ep4-s1 dapur
- say: Rencana dari simulator sudah ada di Dapur. Tekan Cek Stok dulu. Kalau bahannya cukup, isi hasil jadinya, lalu konfirmasi.
- show: Dapur: Cek Stok → isi hasil jadi → Konfirmasi.
- aksi: nav Dapur → Cek Stok → isi hasil 50 → Konfirmasi Selesai.

### ep4-s2 stok
- say: Begitu dikonfirmasi, stok bahan berkurang dan puding masuk stok jualan.
- show: Konfirmasi = stok bahan berkurang, puding siap jual.
- aksi: tahan di riwayat batch.

### ep4-s3 kasir
- say: Ada pembeli? Buka Kasir. Ketuk pudingnya, pilih bayarnya, lalu tekan Bayar. Notanya langsung keluar.
- show: Kasir: ketuk produk → pilih bayar → Bayar.
- aksi: nav Kasir → ketuk Puding 2x → QRIS → Bayar → tahan nota.

### ep4-s4 laporan
- say: Terakhir, lihat Laporan. Omzet hari ini dan untungnya, semuanya tercatat sendiri.
- show: Laporan: omzet + untung tercatat otomatis.
- aksi: nav Laporan → tahan di kartu metrik.

### ep4-s5 biaya
- say: Ada pengeluaran seperti bayar listrik? Catat di sini juga, supaya untung bersihnya ketahuan.
- show: Catat biaya (mis. listrik) → untung bersih ketahuan.
- aksi: isi biaya 150000 + keterangan → Catat Biaya → tahan laba bersih.

---

## EP5 — Penutup (animasi HyperFrames, portrait)

### ep5-s1 recap
- say: Jadi ingat tiga langkahnya ya. Satu, catat bahan dan resep. Dua, coba dulu di simulator. Tiga, masak, jual, lalu lihat laporannya.
- show: 1 catat · 2 coba di simulator · 3 masak, jual, lihat laporan.
- visual: 3 kartu bernomor muncul berurutan.

### ep5-s2 closing
- say: Selamat mencoba. Semoga laris, dan untungnya jelas!
- show: Selamat mencoba — semoga laris, untungnya jelas!
- visual: tagline + logo teks.
