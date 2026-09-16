"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface FormattedContentProps {
  content: string;
}

// Inline renderer for rich text: bold, code, em
function renderInlineFormatting(text: string): React.ReactNode[] {
  // Regex to match **bold**, `code`, *italic*
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-white">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-neutral-800 border border-white/10 font-mono text-[11px] text-neutral-200"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-neutral-300">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function FormattedContent({ content }: FormattedContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const lines = content.split("\n");
  const blocks: Array<
    | { type: "text"; lines: string[] }
    | { type: "table"; headers: string[]; rows: string[][]; raw: string }
  > = [];

  let currentTextBuffer: string[] = [];
  let inTable = false;
  let tableHeaders: string[] = [];
  let tableRows: string[][] = [];
  let rawTableLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isTableRow = line.trim().startsWith("|") && line.trim().endsWith("|");
    const isDivider = line.includes("---") && isTableRow;

    if (isTableRow) {
      if (!inTable) {
        if (currentTextBuffer.length > 0) {
          blocks.push({ type: "text", lines: currentTextBuffer });
          currentTextBuffer = [];
        }
        inTable = true;
        tableHeaders = line
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        tableRows = [];
        rawTableLines = [line];
      } else if (isDivider) {
        rawTableLines.push(line);
      } else {
        const cells = line
          .split("|")
          .map((s) => s.trim())
          .filter((s) => s.length > 0);
        tableRows.push(cells);
        rawTableLines.push(line);
      }
    } else {
      if (inTable) {
        blocks.push({
          type: "table",
          headers: tableHeaders,
          rows: tableRows,
          raw: rawTableLines.join("\n"),
        });
        inTable = false;
        tableHeaders = [];
        tableRows = [];
        rawTableLines = [];
      }
      currentTextBuffer.push(line);
    }
  }

  if (inTable) {
    blocks.push({
      type: "table",
      headers: tableHeaders,
      rows: tableRows,
      raw: rawTableLines.join("\n"),
    });
  } else if (currentTextBuffer.length > 0) {
    blocks.push({ type: "text", lines: currentTextBuffer });
  }

  const handleCopyTable = (rawText: string, index: number) => {
    navigator.clipboard.writeText(rawText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-3.5 text-neutral-200 text-sm leading-relaxed">
      {blocks.map((block, idx) => {
        if (block.type === "text") {
          return (
            <div key={idx} className="space-y-1.5">
              {block.lines.map((line, lIdx) => {
                const trimmed = line.trim();

                // Blank line spacer
                if (!trimmed) {
                  return <div key={lIdx} className="h-1.5" />;
                }

                // Header ###
                if (trimmed.startsWith("### ")) {
                  return (
                    <h3
                      key={lIdx}
                      className="font-semibold text-neutral-100 text-sm mt-3 mb-1 tracking-tight"
                    >
                      {renderInlineFormatting(trimmed.slice(4))}
                    </h3>
                  );
                }

                // Header ##
                if (trimmed.startsWith("## ")) {
                  return (
                    <h2
                      key={lIdx}
                      className="font-bold text-neutral-100 text-base mt-3.5 mb-1.5 tracking-tight"
                    >
                      {renderInlineFormatting(trimmed.slice(3))}
                    </h2>
                  );
                }

                // Blockquote / Callout >
                if (trimmed.startsWith("> ")) {
                  return (
                    <blockquote
                      key={lIdx}
                      className="border-l-2 border-white/20 bg-neutral-900/50 pl-3 py-1.5 my-2 rounded-r-lg text-xs text-neutral-300 italic"
                    >
                      {renderInlineFormatting(trimmed.slice(2))}
                    </blockquote>
                  );
                }

                // Bullet List - or *
                if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                  return (
                    <div
                      key={lIdx}
                      className="flex items-start gap-2 text-xs leading-relaxed text-neutral-300 ml-1.5"
                    >
                      <span className="size-1.5 rounded-full bg-neutral-400 mt-1.5 shrink-0" />
                      <span>{renderInlineFormatting(trimmed.slice(2))}</span>
                    </div>
                  );
                }

                // Numbered list
                const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
                if (numMatch) {
                  return (
                    <div
                      key={lIdx}
                      className="flex items-start gap-2 text-xs leading-relaxed text-neutral-300 ml-1.5"
                    >
                      <span className="font-semibold text-neutral-400 text-[11px] shrink-0">
                        {numMatch[1]}.
                      </span>
                      <span>{renderInlineFormatting(numMatch[2])}</span>
                    </div>
                  );
                }

                // Regular Paragraph with inline formatting
                return (
                  <p key={lIdx} className="leading-relaxed">
                    {renderInlineFormatting(line)}
                  </p>
                );
              })}
            </div>
          );
        }

        // Table Block with shadcn Table & Copy Button
        return (
          <div
            key={idx}
            className="my-3 rounded-xl border border-white/10 bg-[#121214] overflow-hidden shadow-sm"
          >
            {/* Table Header with Copy Button */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-900/70 border-b border-white/10 text-xs">
              <span className="font-medium text-neutral-400 text-xs">
                Comparativa / Especificaciones
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => handleCopyTable(block.raw, idx)}
                className="h-6 px-2 text-neutral-400 hover:text-white gap-1 text-[11px]"
              >
                {copiedIndex === idx ? (
                  <>
                    <Check className="size-3 text-emerald-400" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    <span>Copy table</span>
                  </>
                )}
              </Button>
            </div>

            {/* shadcn Table Component */}
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-neutral-900/40">
                  <TableRow className="border-white/10 hover:bg-transparent">
                    {block.headers.map((h, hIdx) => (
                      <TableHead
                        key={hIdx}
                        className="text-xs font-semibold text-neutral-300 py-2.5 px-4"
                      >
                        {renderInlineFormatting(h)}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {block.rows.map((row, rIdx) => (
                    <TableRow
                      key={rIdx}
                      className="border-white/5 hover:bg-neutral-800/40 transition-colors"
                    >
                      {row.map((cell, cIdx) => (
                        <TableCell
                          key={cIdx}
                          className="text-xs text-neutral-200 py-2.5 px-4 font-normal"
                        >
                          {renderInlineFormatting(cell)}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        );
      })}
    </div>
  );
}
