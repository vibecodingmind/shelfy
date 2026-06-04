import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: { default: 'Shelfy — Shelf Space Marketplace Tanzania', template: '%s | Shelfy' },
  description: 'Rent shelf space in Tanzania. Vendors grow without new branches. Hosts earn from unused shelf space.',
  keywords: ['shelf space', 'Tanzania', 'SME', 'marketplace', 'rental', 'Dar es Salaam'],
  authors: [{ name: 'Shelfy Tanzania' }],
  openGraph: {
    title: 'Shelfy — Shelf Space Marketplace Tanzania',
    description: 'Rent shelf space. Grow your business.',
    url: 'https://shelfy.co.tz',
    siteName: 'Shelfy',
    locale: 'en_TZ',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
