import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* shadcn/ui */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/* icons */
import { FiLayers, FiLoader, FiFileText } from "react-icons/fi";

type Slide = { title?: string; bullets?: string[] };
type SlidesJson = { slides?: Slide[] };

export type SlidePreviewProps = {
  slides?: SlidesJson | null;
  slidesRaw?: string | null;
  loading?: boolean;
  className?: string;

  /** optional run switcher buttons */
  runs?: Array<{ id: string; active: boolean; onClick: () => void }>;
};

function SlideCard({ title, bullets }: Slide) {
  return (
    <Card>
      <CardHeader className="pb-2">
        {title ? <CardTitle className="text-base">{title}</CardTitle> : <div className="h-5" />}
      </CardHeader>
      <CardContent className="pt-0">
        {Array.isArray(bullets) && bullets.length > 0 ? (
          <ul className="list-disc pl-5 space-y-1">
            {bullets.map((b, i) => (
              <li key={i} className="text-[15px] leading-relaxed">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{b}</ReactMarkdown>
              </li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}

const SkeletonCard = () => (
  <Card className="animate-pulse">
    <CardContent className="p-5">
      <div className="h-5 w-48 bg-gray-200 rounded mb-3" />
      <div className="h-3 w-80 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-72 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-64 bg-gray-200 rounded" />
    </CardContent>
  </Card>
);

export default function SlidePreview({ slides, slidesRaw, loading, className, runs }: SlidePreviewProps) {
  const cards = useMemo(() => slides?.slides ?? [], [slides]);

  const headerRight = loading ? (
    <Badge variant="outline" className="gap-1"><FiLoader className="animate-spin" /> preparing…</Badge>
  ) : cards.length > 0 ? (
    <Badge variant="secondary">{cards.length} slide{cards.length > 1 ? "s" : ""}</Badge>
  ) : (
    <Badge variant="outline">Markdown</Badge>
  );

  return (
    <section className={["min-w-0 flex flex-col", className].filter(Boolean).join(" ")}>
      <Card className="h-[84vh] flex flex-col">
        <CardHeader className="py-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                <FiLayers />
              </div>
              <CardTitle className="text-sm font-semibold">Slides</CardTitle>
            </div>
            {headerRight}
          </div>

          {/* Run Switcher inside header */}
          {runs && runs.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex gap-1.5 min-w-max pb-1">
                {runs.map((r) => (
                  <Button
                    key={r.id}
                    variant={r.active ? "secondary" : "outline"}
                    size="sm"
                    className="h-7 px-2 whitespace-nowrap"
                    onClick={r.onClick}
                    title={`Show slides for ${r.id}`}
                  >
                    run-{r.id.slice(-5)}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardHeader>

        <Separator />

        <CardContent className="p-0 flex-1 min-h-0">
          <ScrollArea className="h-full">
            <div className="p-3 sm:p-4 space-y-3">
              {loading ? (
                <>
                  <SkeletonCard />
                  <SkeletonCard />
                </>
              ) : cards.length > 0 ? (
                cards.map((s, idx) => <SlideCard key={idx} {...s} />)
              ) : slidesRaw ? (
                <Card>
                  <CardContent className="prose prose-sm max-w-none p-5">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{slidesRaw}</ReactMarkdown>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-2xl border bg-gray-50 text-gray-600 p-4 text-sm flex items-center gap-2">
                  <FiFileText className="text-gray-500" />
                  No slides yet. Ask for a presentation or include “slides”.
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </section>
  );
}
