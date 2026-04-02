"use client";

import { ChangeEvent, CSSProperties, useState } from "react";
import {
  createBookDocument,
  getPageDimensionsMm,
  getPrintableAreaMm,
  PAGE_COUNT_LIMIT,
  type BookDocument,
  type BookPage,
  type MmRect,
  type PageMarginsMm,
  type PageOrientation,
  type TextBlock,
} from "@/lib/book";

const marginFields: Array<{ key: keyof PageMarginsMm; label: string }> = [
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
];

export default function Home() {
  const [book, setBook] = useState<BookDocument>(() => createBookDocument());

  const pageDimensions = getPageDimensionsMm(book.orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, book.defaultMarginsMm);
  const modelSnapshot = {
    pageSize: book.pageSize,
    orientation: book.orientation,
    pageCount: book.pages.length,
    defaultMarginsMm: book.defaultMarginsMm,
    firstPage: {
      borderPresetId: book.pages[0]?.borderPresetId,
      blocks: book.pages[0]?.blocks.map((block) => ({
        id: block.id,
        type: block.type,
        xMm: Math.round(block.xMm),
        yMm: Math.round(block.yMm),
        widthMm: Math.round(block.widthMm),
        heightMm: Math.round(block.heightMm),
      })),
    },
  };

  function rebuildBook(next: {
    orientation?: PageOrientation;
    marginsMm?: PageMarginsMm;
    pageCount?: number;
  }) {
    setBook((current) =>
      createBookDocument({
        orientation: next.orientation ?? current.orientation,
        marginsMm: next.marginsMm ?? current.defaultMarginsMm,
        pageCount: next.pageCount ?? current.pages.length,
      }),
    );
  }

  function handleOrientationChange(orientation: PageOrientation) {
    rebuildBook({ orientation });
  }

  function handleMarginChange(
    key: keyof PageMarginsMm,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextValue = Number(event.target.value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    rebuildBook({
      marginsMm: {
        ...book.defaultMarginsMm,
        [key]: nextValue,
      },
    });
  }

  function handlePageCountChange(event: ChangeEvent<HTMLInputElement>) {
    const nextValue = Number(event.target.value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    rebuildBook({ pageCount: nextValue });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_30px_90px_rgba(120,98,53,0.12)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Phase 1
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              A4 book setup with live page preview
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              This first implementation focuses on the foundation: a typed page
              model, document setup controls, and a layout preview that reacts
              instantly to orientation, page count, and margin changes.
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-stone-700 sm:grid-cols-3">
            <Metric label="Page size" value="A4 locked" />
            <Metric label="Preview area" value={`${pageDimensions.width} x ${pageDimensions.height} mm`} />
            <Metric label="Printable area" value={`${Math.round(printableArea.widthMm)} x ${Math.round(printableArea.heightMm)} mm`} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Panel
            title="Document setup"
            description="These settings rebuild the Phase 1 draft document and update every preview page."
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <Label htmlFor="page-count">Page count</Label>
                <input
                  id="page-count"
                  type="number"
                  min={1}
                  max={PAGE_COUNT_LIMIT}
                  step={1}
                  value={book.pages.length}
                  onChange={handlePageCountChange}
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                />
                <p className="text-sm text-stone-500">
                  Phase 1 supports building the page collection and preview stack.
                </p>
              </div>

              <div className="space-y-3">
                <Label>Orientation</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(["portrait", "landscape"] as const).map((orientation) => {
                    const active = book.orientation === orientation;

                    return (
                      <button
                        key={orientation}
                        type="button"
                        onClick={() => handleOrientationChange(orientation)}
                        className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                          active
                            ? "border-stone-900 bg-stone-900 text-white shadow-lg shadow-stone-900/15"
                            : "border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        <span className="block text-sm font-semibold capitalize">
                          {orientation}
                        </span>
                        <span className="mt-1 block text-xs opacity-80">
                          {orientation === "portrait"
                            ? "Classic book layout"
                            : "Wide layout for image-first pages"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <Label>Margins</Label>
                  <span className="text-xs uppercase tracking-[0.24em] text-stone-400">
                    millimeters
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {marginFields.map(({ key, label }) => (
                    <div key={key} className="space-y-2">
                      <label
                        htmlFor={`margin-${key}`}
                        className="text-sm font-medium text-stone-700"
                      >
                        {label}
                      </label>
                      <input
                        id={`margin-${key}`}
                        type="number"
                        min={8}
                        max={48}
                        step={1}
                        value={book.defaultMarginsMm[key]}
                        onChange={(event) => handleMarginChange(key, event)}
                        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm leading-6 text-stone-500">
                  Margin limits keep a minimum printable area so future text and
                  image blocks always have usable space.
                </p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Phase 1 document model"
            description="The editor is backed by a typed document structure for pages, margins, border placeholders, and future content blocks."
          >
            <pre className="overflow-x-auto rounded-[1.5rem] bg-stone-950 px-4 py-4 text-xs leading-6 text-stone-100">
              {JSON.stringify(modelSnapshot, null, 2)}
            </pre>
          </Panel>
        </div>

        <Panel
          title="A4 preview workspace"
          description="Each page uses a fixed A4 aspect ratio. The dashed frame shows the printable area after margins are applied."
        >
          <div className="grid gap-6 xl:grid-cols-2">
            {book.pages.map((page) => (
              <PreviewPage
                key={page.id}
                page={page}
                orientation={book.orientation}
              />
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function PreviewPage({
  page,
  orientation,
}: {
  page: BookPage;
  orientation: PageOrientation;
}) {
  const pageDimensions = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, page.marginsMm);

  return (
    <article className="rounded-[1.75rem] border border-stone-200 bg-[#fffdf8] p-4 shadow-[0_18px_48px_rgba(57,45,24,0.08)]">
      <div className="mb-4 flex items-center justify-between text-sm text-stone-500">
        <span className="font-medium text-stone-700">Page {page.pageNumber}</span>
        <span className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-[0.2em]">
          {orientation}
        </span>
      </div>

      <div
        className="relative mx-auto w-full max-w-[31rem] overflow-hidden rounded-[1.4rem] border border-stone-300 bg-[linear-gradient(180deg,#fffefb_0%,#faf5ea_100%)] shadow-[0_24px_60px_rgba(88,65,31,0.12)]"
        style={{ aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_30%)]" />
        <div
          className="absolute rounded-[1rem] border border-dashed border-sky-500/70 bg-sky-50/35"
          style={toRelativeRectStyle(printableArea, pageDimensions)}
        />

        {page.blocks.map((block) => {
          if (block.type === "text") {
            return (
              <div
                key={block.id}
                className="absolute overflow-hidden rounded-[0.9rem] border border-stone-200/80 bg-white/80 px-3 py-2 shadow-sm"
                style={toRelativeRectStyle(block, pageDimensions)}
              >
                <p
                  className="text-[0.78rem] leading-5 text-stone-800"
                  dir={block.language === "arabic" ? "rtl" : "ltr"}
                  style={{
                    color: block.color,
                    fontFamily: block.fontFamily,
                    textAlign: mapAlignment(block.align),
                  }}
                >
                  {(block as TextBlock).content}
                </p>
              </div>
            );
          }

          return (
            <div
              key={block.id}
              className="absolute overflow-hidden rounded-[1rem] border border-dashed border-amber-400/80 bg-[repeating-linear-gradient(135deg,rgba(245,158,11,0.12)_0,rgba(245,158,11,0.12)_12px,transparent_12px,transparent_24px)]"
              style={toRelativeRectStyle(block, pageDimensions)}
            >
              <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-amber-800/80">
                Image slot
              </div>
            </div>
          );
        })}

        <div className="absolute bottom-3 left-3 rounded-full bg-stone-900 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white">
          A4
        </div>
      </div>
    </article>
  );
}

function Panel({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: React.ReactNode;
}>) {
  return (
    <section className="rounded-[2rem] border border-white/70 bg-white/85 p-5 shadow-[0_24px_70px_rgba(120,98,53,0.09)] backdrop-blur sm:p-6">
      <div className="mb-5 space-y-2">
        <h2 className="text-xl font-semibold tracking-tight text-stone-900">
          {title}
        </h2>
        <p className="text-sm leading-6 text-stone-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-1 font-semibold text-stone-900">{value}</p>
    </div>
  );
}

function Label({
  htmlFor,
  children,
}: Readonly<{
  htmlFor?: string;
  children: React.ReactNode;
}>) {
  return (
    <label
      htmlFor={htmlFor}
      className="text-sm font-semibold uppercase tracking-[0.2em] text-stone-500"
    >
      {children}
    </label>
  );
}

function toRelativeRectStyle(
  rect: MmRect,
  page: { width: number; height: number },
): CSSProperties {
  return {
    left: `${(rect.xMm / page.width) * 100}%`,
    top: `${(rect.yMm / page.height) * 100}%`,
    width: `${(rect.widthMm / page.width) * 100}%`,
    height: `${(rect.heightMm / page.height) * 100}%`,
  };
}

function mapAlignment(alignment: TextBlock["align"]): CSSProperties["textAlign"] {
  if (alignment === "center") {
    return "center";
  }

  if (alignment === "end") {
    return "right";
  }

  return "left";
}
