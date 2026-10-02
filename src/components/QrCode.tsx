import { QRCodeSVG } from "qrcode.react";

/**
 * A scannable QR code for a link. Always dark-on-white with its own quiet
 * margin, whatever the app theme — phone cameras struggle with inverted or
 * low-contrast codes.
 */
export function QrCode({ value, size = 192 }: { value: string; size?: number }) {
  return (
    <div className="self-center rounded-xl bg-white p-3">
      <QRCodeSVG value={value} size={size} level="M" bgColor="#ffffff" fgColor="#000000" />
    </div>
  );
}
