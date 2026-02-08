import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useDocumentDetail,
  useMarkDocumentViewed,
  useSignDocument,
} from "@daycare-hub/hooks";
import { DocumentStatusBadge } from "@/components/documents/document-status-badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  Checkbox,
} from "@daycare-hub/ui";

export const Route = createFileRoute(
  "/_parent/parent/documents/$documentId"
)({
  component: DocumentDetailPage,
});

function DocumentDetailPage() {
  const { documentId } = Route.useParams();
  const { data: doc, isLoading } = useDocumentDetail(documentId);
  const markViewedMutation = useMarkDocumentViewed();
  const signDocumentMutation = useSignDocument();

  const [signatureName, setSignatureName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  // Mark as viewed when opened
  useEffect(() => {
    if (doc?.status === "pending") {
      markViewedMutation.mutateAsync(documentId).catch(() => {});
    }
  }, [doc?.id, doc?.status]);

  if (isLoading) return <div className="flex items-center justify-center py-12"><div className="text-muted-foreground">Loading...</div></div>;

  if (!doc) return null;

  const canSign =
    doc.status === "pending" || doc.status === "viewed";
  const isSigned = doc.status === "signed";
  const isExpired =
    doc.status === "expired" ||
    (doc.expiresAt && new Date(doc.expiresAt) < new Date());

  const handleSign = async () => {
    if (!agreed || signatureName.length < 2) return;
    setError("");
    try {
      await signDocumentMutation.mutateAsync({
        instanceId: doc.id,
        data: { signatureName },
      });
    } catch (err: any) {
      setError(err.message || "Failed to sign document");
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">{doc.templateTitle}</h1>
          <DocumentStatusBadge status={doc.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          From: {doc.facilityName}
          {doc.childName && <> &middot; For: {doc.childName}</>}
          {" · Sent "}
          {new Date(doc.createdAt).toLocaleDateString()}
          {doc.expiresAt && (
            <>
              {" · Expires "}
              {new Date(doc.expiresAt).toLocaleDateString()}
            </>
          )}
        </p>
      </div>

      {isSigned && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="py-3">
            <p className="text-sm text-green-800">
              Signed by {doc.signatureName} on{" "}
              {new Date(doc.signedAt!).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      )}

      {isExpired && !isSigned && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="py-3">
            <p className="text-sm text-red-800">
              This document has expired and can no longer be signed.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="prose prose-sm max-w-none py-6">
          <Markdown remarkPlugins={[remarkGfm]}>
            {doc.contentSnapshot}
          </Markdown>
        </CardContent>
      </Card>

      {canSign && !isExpired && (
        <Card>
          <CardHeader>
            <CardTitle>Sign Document</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="agree"
                checked={agreed}
                onCheckedChange={(checked) => setAgreed(checked === true)}
              />
              <Label htmlFor="agree" className="cursor-pointer text-sm leading-relaxed">
                I have read and understand the contents of this document. I agree
                to the terms and conditions stated above.
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signatureName">Type your full legal name</Label>
              <Input
                id="signatureName"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="e.g., Jane Doe"
              />
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <p className="text-xs text-muted-foreground">
              By clicking "Sign Document" below, you are agreeing to
              electronically sign this document. Your signature will be recorded
              along with the date, time, and IP address for verification
              purposes.
            </p>

            <Button
              className="w-full"
              onClick={handleSign}
              disabled={!agreed || signatureName.length < 2 || signDocumentMutation.isPending}
            >
              {signDocumentMutation.isPending ? "Signing..." : "Sign Document"}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
