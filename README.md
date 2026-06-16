# Telegram Channel Forwarder dengan GramJS

Contoh Node.js untuk membaca pesan dari channel Telegram yang bisa diakses oleh akun Anda, lalu meneruskannya ke channel lain memakai GramJS / MTProto user account.

Bot API biasanya tidak bisa membaca channel sumber yang bukan milik Anda. Dengan GramJS, yang login adalah akun Telegram biasa, jadi syaratnya akun tersebut sudah join / punya akses baca ke channel sumber dan punya izin kirim ke channel tujuan.

## Setup

1. Ambil `api_id` dan `api_hash` dari <https://my.telegram.org/apps>.
2. Install dependency:

   ```bash
   npm install
   ```

3. Buat `.env` dari contoh:

   ```bash
   cp .env.example .env
   ```

4. Isi minimal:

   ```env
   TELEGRAM_API_ID=123456
   TELEGRAM_API_HASH=your_api_hash
   SOURCE_CHAT=@sourcechannel
   TARGET_CHAT=@targetchannel
   RELAY_MODE=forward
   ```

   Untuk lebih dari satu source, pisahkan dengan koma:

   ```env
   SOURCE_CHAT=@source1,@source2,-1001234567890
   ```

5. Login akun Telegram untuk membuat session:

   ```bash
   npm run login
   ```

   Simpan output `TELEGRAM_STRING_SESSION` ke `.env`.

6. Jalankan forwarder:

   ```bash
   npm start
   ```

## Private Channel / Source Bukan Milik Anda

Kalau channel sumber tidak punya username publik, login dulu dengan akun yang sudah join channel itu, lalu jalankan:

```bash
npm run dialogs
```

Cari channel sumber/tujuan dari daftar, lalu pakai `gramjs_id`, `bot_api_id` (`-100...`), username, atau judul yang tampil di `.env`.

## Mode Relay

- `RELAY_MODE=forward`: pesan diteruskan dengan attribution asli.
- `RELAY_MODE=copy`: konten disalin lalu dikirim ulang ke channel tujuan.

Kalau Telegram menolak karena source channel mengaktifkan protected content, script tidak bisa dan tidak boleh membypass proteksi tersebut. Di mode `forward`, pesan seperti itu akan di-skip dan forwarder tetap berjalan.

## Filter dan Backfill

Opsional:

```env
MATCH_REGEX=promo|diskon
BACKFILL_LIMIT=20
```

`MATCH_REGEX` hanya meneruskan pesan yang cocok. `BACKFILL_LIMIT` mengambil N pesan terakhir saat startup sebelum listener live aktif.

## Jalankan dengan PM2

Install PM2 kalau belum ada:

```bash
npm install -g pm2
```

Start forwarder:

```bash
npm run pm2:start
```

Cek log:

```bash
npm run pm2:logs
```

Restart / stop:

```bash
npm run pm2:restart
npm run pm2:stop
```

Supaya hidup lagi setelah reboot:

```bash
pm2 save
pm2 startup
```

Jalankan command yang ditampilkan oleh `pm2 startup`, lalu ulangi `pm2 save`.
