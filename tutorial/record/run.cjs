const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname + '\\..';
const CLIPS = path.join(__dirname, 'clips');
fs.mkdirSync(CLIPS, { recursive: true });
for (const f of fs.readdirSync(CLIPS)) {
  if (f.endsWith('.webm') || f === 'manifest.json') fs.rmSync(path.join(CLIPS, f));
}
const DUR = JSON.parse(fs.readFileSync(path.join(ROOT, 'audio', 'durations.json'), 'utf8'));

const EXE = path.join(
  process.env.LOCALAPPDATA,
  'ms-playwright',
  'chromium-1243',
  'chrome-win64',
  'chrome.exe',
);

const manifest = [];

async function scene(ctx, id, url, ready, actions) {
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await ready(page);
  const t0 = Date.now();
  await actions(page);
  const elapsed = (Date.now() - t0) / 1000;
  const hold = Math.max(0.3, DUR[id] + 0.8 - elapsed);
  await page.waitForTimeout(hold * 1000);
  const tmp = await page.video().path();
  await page.close();
  const dest = path.join(CLIPS, `${id}.webm`);
  fs.renameSync(tmp, dest);
  manifest.push(id);
  console.log(id, 'ok');
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    deviceScaleFactor: 2,
    recordVideo: { dir: CLIPS, size: { width: 1080, height: 1920 } },
  });
  const prod = async (page) => {
    await page.getByLabel('Produk').selectOption({ label: 'Puding Coklat Cup' });
    await page.getByText(/HPP resep Rp2\.100/).waitFor();
  };

  // ---------- EP2 ----------
  await scene(ctx, 'ep2-s1', 'http://localhost:5199/', async (p) => {
    await p.getByText('Selamat datang di SBS Sirkulatel').waitFor();
  }, async (p) => {
    await p.getByRole('button', { name: 'Isi Data Contoh' }).click();
    await p.getByText('Puding Coklat Cup').first().waitFor();
  });

  await scene(ctx, 'ep2-s2', 'http://localhost:5199/#/bahan', async (p) => {
    await p.getByText('Telur Ayam').first().waitFor();
  }, async () => {});

  await scene(ctx, 'ep2-s3', 'http://localhost:5199/#/bahan', async (p) => {
    await p.getByText('Telur Ayam').first().waitFor();
  }, async () => {});

  await scene(ctx, 'ep2-s4', 'http://localhost:5199/#/bahan', async (p) => {
    await p.getByText('Telur Ayam').first().waitFor();
  }, async (p) => {
    await p.getByRole('button', { name: 'Produk & Resep', exact: true }).click();
    const row = p.locator('div', { hasText: 'Puding Coklat Cup' }).filter({ hasText: 'Nonaktifkan' }).last();
    await row.getByRole('button', { name: 'Resep', exact: true }).click();
    await p.getByText(/Resep: Puding Coklat/).waitFor();
  });

  await scene(ctx, 'ep2-s5', 'http://localhost:5199/#/bahan', async (p) => {
    await p.getByRole('button', { name: 'Produk & Resep', exact: true }).click();
    await p.getByText('Puding Coklat Cup').first().waitFor();
  }, async (p) => {
    const row = p.locator('div', { hasText: 'Puding Coklat Cup' }).filter({ hasText: 'Nonaktifkan' }).last();
    await row.getByRole('button', { name: 'Resep', exact: true }).click();
    await p.getByText(/HPP per unit/).waitFor();
  });

  // ---------- EP3 ----------
  await scene(ctx, 'ep3-s1', 'http://localhost:5199/#/simulator', async (p) => {
    await p.getByLabel('Produk').waitFor();
  }, async (p) => {
    await prod(p);
  });

  await scene(ctx, 'ep3-s2', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByText('Rp210.000').first().waitFor();
  });

  await scene(ctx, 'ep3-s3', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByRole('button', { name: 'Ubah harga jual' }).click();
    await p.getByLabel('Harga jual simulasi').fill('4000');
    await p.getByText('47.5%').first().waitFor();
  });

  await scene(ctx, 'ep3-s4', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByRole('button', { name: 'Kenaikan harga bahan' }).click();
    await p.getByPlaceholder('2000').fill('2500');
    await p.getByText(/58\.0% → 53\.0%/).waitFor();
  });

  await scene(ctx, 'ep3-s5', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByRole('button', { name: 'Target omzet' }).click();
    await p.getByLabel('Target omzet').fill('1000000');
    await p.getByText(/sekitar 200 unit/).waitFor();
  });

  await scene(ctx, 'ep3-s6', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByRole('button', { name: 'Ubah harga jual' }).click();
    await p.getByLabel('Harga jual simulasi').fill('5000');
    await p.getByRole('button', { name: 'Simpan Skenario A' }).click();
    await p.getByText('Skenario A tersimpan.').waitFor();
    await p.getByLabel('Harga jual simulasi').fill('4500');
    await p.getByRole('button', { name: 'Simpan Skenario B' }).click();
    await p.getByText('Skenario B tersimpan.').waitFor();
    await p.getByRole('button', { name: 'Bandingkan Skenario' }).click();
    await p.getByRole('columnheader', { name: 'Kondisi Aktual' }).waitFor();
  });

  await scene(ctx, 'ep3-s7', 'http://localhost:5199/#/simulator', async (p) => {
    await prod(p);
  }, async (p) => {
    await p.getByRole('button', { name: 'Jumlah produksi' }).click();
    await p.getByRole('spinbutton').fill('50');
    await p.getByRole('button', { name: 'Salin ke Rencana Produksi' }).click();
    await p.getByText('Rencana produksi dibuat').waitFor();
    await p.getByRole('button', { name: 'Tetap di Simulator' }).click();
  });

  // ---------- EP4 ----------
  await scene(ctx, 'ep4-s1', 'http://localhost:5199/#/dapur', async (p) => {
    await p.getByText('Dari Simulator').waitFor();
  }, async (p) => {
    await p.getByRole('button', { name: 'Cek Stok' }).click();
    await p.getByText(/tervalidasi/).waitFor();
    await p.getByLabel('Hasil jadi riil').fill('50');
    await p.getByRole('button', { name: 'Konfirmasi Selesai' }).click();
    await p.getByText(/selesai — stok barang jadi bertambah/).waitFor();
  });

  await scene(ctx, 'ep4-s2', 'http://localhost:5199/#/dapur', async (p) => {
    await p.getByText(/jadi 50 · HPP Rp2\.100/).waitFor();
  }, async () => {});

  await scene(ctx, 'ep4-s3', 'http://localhost:5199/#/kasir', async (p) => {
    await p.getByRole('button', { name: /Puding Coklat Cup/ }).waitFor();
  }, async (p) => {
    const card = p.getByRole('button', { name: /Puding Coklat Cup/ });
    await card.click();
    await card.click();
    await p.getByRole('button', { name: 'QRIS', exact: true }).click();
    await p.getByRole('button', { name: 'Bayar' }).click();
    await p.getByText(/Nota INV-/).waitFor();
  });

  await scene(ctx, 'ep4-s4', 'http://localhost:5199/#/laporan', async (p) => {
    await p.getByText('Rp10.000').first().waitFor();
  }, async () => {});

  await scene(ctx, 'ep4-s5', 'http://localhost:5199/#/laporan', async (p) => {
    await p.getByText('Rp10.000').first().waitFor();
  }, async (p) => {
    await p.getByLabel('Nilai (Rp)').fill('150000');
    await p.getByLabel('Keterangan').fill('Token listrik');
    await p.getByRole('button', { name: 'Catat Biaya' }).click();
    await p.getByText('Token listrik').waitFor();
  });

  await browser.close();
  fs.writeFileSync(path.join(CLIPS, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log('manifest:', manifest.length, 'scenes');
})().catch((e) => {
  console.error('RECORD FAIL:', e.message);
  process.exit(1);
});
