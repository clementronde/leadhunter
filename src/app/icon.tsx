import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #f59e0b, #ea580c)',
          borderRadius: '7px',
        }}
      >
        {/* Target icon simplified as concentric circles */}
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 20,
            height: 20,
          }}
        >
          <div style={{ position: 'absolute', width: 20, height: 20, borderRadius: '50%', border: '2px solid white' }} />
          <div style={{ position: 'absolute', width: 12, height: 12, borderRadius: '50%', border: '2px solid white' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', background: 'white' }} />
        </div>
      </div>
    ),
    { ...size }
  )
}
