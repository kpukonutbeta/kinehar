import { defineConfig } from 'vitepress'

export default defineConfig({
  base: '/kinehar/documentation/',
  title: "KEJAR Docs",
  description: "Dokumentasi Aplikasi Kinerja Harian KPU Konawe Utara",
  lang: 'id-ID',
  themeConfig: {
    logo: 'https://upload.wikimedia.org/wikipedia/commons/4/46/KPU_Logo.svg',
    nav: [
      { text: 'Beranda', link: '/' },
      { text: 'Panduan', link: '/guide/getting-started' },
      { text: 'Fitur', link: '/features/' },
      { text: 'Teknis', link: '/technical/gas-setup' }
    ],
    sidebar: [
      {
        text: 'Pengenalan',
        items: [
          { text: 'Apa itu KEJAR?', link: '/guide/getting-started' },
          { text: 'Cara Penggunaan', link: '/guide/usage' },
        ]
      },
      {
        text: 'Fitur Utama',
        items: [
          { text: 'Form Kinerja', link: '/features/form-kinerja' },
          { text: 'Presensi/Absensi', link: '/features/absensi' },
          { text: 'Statistik & Histori', link: '/features/stats-history' },
        ]
      },
      {
        text: 'Konfigurasi Teknis',
        items: [
          { text: 'Google Apps Script', link: '/technical/gas-setup' },
          { text: 'Struktur Data', link: '/technical/data-structure' },
        ]
      }
    ],
    socialLinks: [
      { icon: 'github', link: 'https://github.com/' }
    ],
    footer: {
      message: 'Dirilis di bawah Lisensi MIT.',
      copyright: 'Copyright © 2024-sekarang KPU Konawe Utara'
    },
    outline: {
      label: 'Halaman Ini'
    },
    docFooter: {
      prev: 'Sebelumnya',
      next: 'Selanjutnya'
    },
    search: {
      provider: 'local'
    }
  }
})
