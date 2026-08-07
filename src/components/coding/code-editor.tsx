"use client";

import dynamic from "next/dynamic";
import { SUPPORTED_LANGUAGES } from "@/types/coding";
import type { SupportedLanguageId } from "@/types/coding";

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#1e1e1e] text-muted-foreground text-sm">
      Loading editor...
    </div>
  ),
});

interface CodeEditorProps {
  language: SupportedLanguageId;
  value: string;
  onChange: (value: string) => void;
}

export function CodeEditor({ language, value, onChange }: CodeEditorProps) {
  const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === language);
  const monacoLang = langConfig?.monacoId || "javascript";

  return (
    <MonacoEditor
      height="100%"
      language={monacoLang}
      value={value}
      onChange={(val) => onChange(val || "")}
      theme="vs-dark"
      options={{
        fontSize: 14,
        fontFamily: "var(--font-geist-mono), 'Fira Code', monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        tabSize: 2,
        wordWrap: "on",
        automaticLayout: true,
        padding: { top: 16 },
        suggestOnTriggerCharacters: true,
        quickSuggestions: true,
      }}
    />
  );
}
