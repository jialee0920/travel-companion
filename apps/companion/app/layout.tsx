import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://www.donghaeng.me'),
  title: '동행 · 함께할 사람을 찾다',
  description:
    '실시간 동행 매칭과 공동구매. 식사, 운동, 여행 동행을 함께 즐겨보세요.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://www.donghaeng.me',
    siteName: '동행',
    title: '동행 - 함께할 사람을 찾다',
    description:
      '실시간 동행 매칭과 공동구매. 식사, 운동, 여행 동행을 함께 즐겨보세요.',
    images: [
      {
        // apex(donghaeng.me)는 www로 308 리다이렉트되므로 www 절대경로 사용
        // logo.png(2.4MB)는 카카오 미리보기 실패 → 페이지 프로필 사진으로 폴백됨
        url: 'https://www.donghaeng.me/og-image.jpg',
        width: 1200,
        height: 1200,
        alt: '동행',
        type: 'image/jpeg',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: '동행 - 함께할 사람을 찾다',
    description:
      '실시간 동행 매칭과 공동구매. 식사, 운동, 여행 동행을 함께 즐겨보세요.',
    images: ['https://www.donghaeng.me/og-image.jpg'],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
  colorScheme: 'light dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
