BASKETBALL SCOREBOARD — PROFESSIONAL SEPARATE UI

ISI:
- scoreboard.html : khusus layar laptop/TV. Tidak ada kontrol.
- controller.html : khusus HP sebagai remote.
- server.js       : server lokal + WebSocket + timer.
- package.json    : dependency.
- README.txt      : panduan.

CARA MENJALANKAN:
1. HP: aktifkan Hotspot.
2. Laptop: sambungkan ke hotspot HP.
3. Buka Command Prompt di folder ini.
4. Jalankan:
   npm install
5. Jalankan:
   npm start
6. Catat IP laptop yang muncul, misalnya 192.168.43.125.
7. Di laptop buka:
   http://localhost:3000
   Ini adalah SCOREBOARD SAJA.
8. Tekan F11 untuk fullscreen.
9. Di HP buka:
   http://192.168.43.125:3000/controller
   Ganti IP dengan IP laptop yang tampil di terminal.

CATATAN:
- HP dan laptop cukup berada pada jaringan hotspot yang sama.
- Internet tidak diperlukan untuk koneksi lokal.
- Jangan tutup Command Prompt selama digunakan.
- Jika Windows Firewall bertanya, izinkan Node.js pada jaringan Private.
- Kontrol dari HP mengubah scoreboard laptop secara real-time.

PENTING:
Laptop tidak menampilkan controller. HP tidak perlu menampilkan scoreboard.

Vercel deployment setup
