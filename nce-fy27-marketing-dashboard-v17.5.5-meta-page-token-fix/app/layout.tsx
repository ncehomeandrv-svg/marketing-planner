import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'NCE Marketing Planner',
  description: 'Shared marketing calendar, campaign planner and ticket workspace for NCE.'
};

export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
