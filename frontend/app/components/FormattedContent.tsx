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

export function FormattedContent({ content }: FormattedContentProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check if text has a Markdown table pattern
  const lines = content.split("\n");
  const blocks: Array<
    | { type: "text"; text: string }
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
        // flush text
        if (currentTextBuffer.length > 0) {
          blocks.push({ type: "text", text: currentTextBuffer.join("\n") });
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
        // finalize table
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
    blocks.push({ type: "text", text: currentTextBuffer.join("\n") });
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
            <div key={idx} className="whitespace-pre-wrap">
              {block.text}
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="my-3 rounded-xl border border-white/10 bg-[#121214] overflow-hidden"
          >
            {/* Table Header with Copy Button */}
            <div className="flex items-center justify-between px-3.5 py-2 bg-neutral-900/60 border-b border-white/10 text-xs">
              <span className="font-medium text-neutral-400">
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
                        {h}
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
                          {cell}
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
