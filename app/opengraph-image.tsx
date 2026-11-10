import { ImageResponse } from 'next/og';

// The picture Telegram, WhatsApp and Google show when a link to the site is shared.
export const alt = "Hifz yo'lim: Qur'on yodlash yo'ldoshi";
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #faf7f2 0%, #f3e6c4 100%)',
          color: '#1e293b',
        }}
      >
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: '#8b6510' }}>Hifz yo&apos;lim</div>
        <div style={{ display: 'flex', marginTop: 24, fontSize: 44, color: '#334155' }}>Qur&apos;on yodlash yo&apos;ldoshi</div>
        <div style={{ display: 'flex', marginTop: 48, fontSize: 30, color: '#64748b' }}>
          Xarita · Kundalik · Haftalik reja · Yodlash yordamchisi
        </div>
        <div style={{ display: 'flex', marginTop: 56, fontSize: 32, fontWeight: 700, color: '#c9a020' }}>hifz.uz</div>
      </div>
    ),
    size,
  );
}
