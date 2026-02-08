import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { Button } from "@daycare-hub/ui";
import { Copy, Check, Download } from "lucide-react";

interface QrCodeDisplayProps {
  url: string;
  size?: number;
}

export function QrCodeDisplay({ url, size = 200 }: QrCodeDisplayProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    const svg = document.querySelector(".qr-code-container svg");
    if (!svg) return;

    const canvas = document.createElement("canvas");
    canvas.width = size * 2;
    canvas.height = size * 2;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const link = document.createElement("a");
      link.download = "invite-qr-code.png";
      link.href = canvas.toDataURL("image/png");
      link.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(svgData)}`;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="qr-code-container rounded-lg border bg-white p-4">
        <QRCodeSVG value={url} size={size} />
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? (
            <>
              <Check className="mr-1 h-3 w-3" /> Copied
            </>
          ) : (
            <>
              <Copy className="mr-1 h-3 w-3" /> Copy Link
            </>
          )}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-1 h-3 w-3" /> Download PNG
        </Button>
      </div>
    </div>
  );
}
