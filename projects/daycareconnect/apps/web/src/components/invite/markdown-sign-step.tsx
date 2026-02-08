import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Button,
  Input,
  Label,
  Checkbox,
} from "@daycare-hub/ui";

interface MarkdownSignStepProps {
  content: string;
  title: string;
  onSubmit: (signatureName: string) => void;
  onBack?: () => void;
  loading?: boolean;
}

export function MarkdownSignStep({ content, title, onSubmit, onBack, loading }: MarkdownSignStepProps) {
  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed || !signatureName) return;
    onSubmit(signatureName);
  }

  return (
    <div className="space-y-4">
      <div className="max-h-[500px] overflow-y-auto rounded-lg border bg-muted/30 p-6">
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
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
