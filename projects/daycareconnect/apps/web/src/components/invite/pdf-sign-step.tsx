import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Checkbox,
} from "@daycare-hub/ui";

interface PdfSignStepProps {
  pdfUrl: string;
  title: string;
  apiUrl: string;
  onSubmit: (signatureName: string) => void;
  onBack?: () => void;
  loading?: boolean;
}

export function PdfSignStep({ pdfUrl, title, apiUrl, onSubmit, onBack, loading }: PdfSignStepProps) {
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);

  const fullPdfUrl = pdfUrl.startsWith("http") ? pdfUrl : `${apiUrl}${pdfUrl}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !signatureName) return;
    onSubmit(signatureName);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 overflow-hidden" style={{ height: "500px" }}>
        <iframe
          src={fullPdfUrl}
          title={title}
          className="h-full w-full"
        />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signatureName">Your Full Name (Electronic Signature)</Label>
          <Input
            id="signatureName"
            value={signatureName}
            onChange={(e) => setSignatureName(e.target.value)}
            placeholder="Type your full legal name"
            required
          />
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            id="consent"
            checked={agreed}
            onCheckedChange={(checked) => setAgreed(!!checked)}
          />
          <Label htmlFor="consent" className="text-sm">
            I have read and agree to the terms of "{title}"
          </Label>
        </div>

        <div className="flex justify-between pt-4">
          {onBack && (
            <Button type="button" variant="outline" onClick={onBack}>
              Back
            </Button>
          )}
          <Button
            type="submit"
            disabled={loading || !agreed || !signatureName}
            className={!onBack ? "ml-auto" : ""}
          >
            {loading ? "Submitting..." : "Sign & Continue"}
          </Button>
        </div>
      </form>
    </div>
  );
}
