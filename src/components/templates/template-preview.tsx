"use client";

import DOMPurify from "dompurify";
import { injectVariables, sampleData } from "@/lib/email/template-engine";

interface TemplatePreviewProps {
  body: string;
}

export function TemplatePreview({ body }: TemplatePreviewProps) {
  if (!body) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Enter template body to see preview...
      </p>
    );
  }

  const injected = injectVariables(body, sampleData);
  const sanitized = DOMPurify.sanitize(injected, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "p", "br", "ul", "ol", "li", "a"],
    ALLOWED_ATTR: ["href"],
  });

  return (
    <div className="rounded-md border bg-muted/50 p-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">
        Preview (with sample data):
      </p>
      <div
        className="text-sm whitespace-pre-wrap"
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    </div>
  );
}
