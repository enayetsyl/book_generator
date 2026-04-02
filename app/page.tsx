"use client";
/* eslint-disable @next/next/no-img-element */

import {
  ChangeEvent,
  CSSProperties,
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  BORDER_PRESETS,
  FONT_OPTIONS,
  LANGUAGE_OPTIONS,
  PAGE_COUNT_LIMIT,
  createBookDocument,
  getDefaultFontForLanguage,
  getFontFamilyStack,
  getImageBlock,
  getLanguageDirection,
  getPageDimensionsMm,
  getPrintableAreaMm,
  getSampleCopy,
  getTextBlock,
  normalizePageLayout,
  rebuildBookDocument,
  type BookDocument,
  type BookPage,
  type BorderPresetId,
  type FontFamilyId,
  type ImageBlock,
  type MmRect,
  type PageMarginsMm,
  type PageOrientation,
  type SupportedLanguage,
  type TextBlock,
} from "@/lib/book";

const marginFields: Array<{ key: keyof PageMarginsMm; label: string }> = [
  { key: "top", label: "Top" },
  { key: "right", label: "Right" },
  { key: "bottom", label: "Bottom" },
  { key: "left", label: "Left" },
];

const imageFields: Array<{ key: keyof MmRect; label: string; min: number }> = [
  { key: "xMm", label: "X", min: 0 },
  { key: "yMm", label: "Y", min: 0 },
  { key: "widthMm", label: "Width", min: 24 },
  { key: "heightMm", label: "Height", min: 16 },
];

export default function Home() {
  const [book, setBook] = useState<BookDocument>(() => createBookDocument());
  const [selectedPageId, setSelectedPageId] = useState<string>("page-1");
  const objectUrlsRef = useRef<Set<string>>(new Set());


  useEffect(() => {
    const objectUrls = objectUrlsRef.current;

    return () => {
      for (const url of objectUrls) {
        URL.revokeObjectURL(url);
      }

      objectUrls.clear();
    };
  }, []);

  const selectedPage =
    book.pages.find((page) => page.id === selectedPageId) ?? book.pages[0];
  const headingBlock = selectedPage ? getTextBlock(selectedPage, "heading") : undefined;
  const bodyBlock = selectedPage ? getTextBlock(selectedPage, "body") : undefined;
  const imageBlock = selectedPage ? getImageBlock(selectedPage) : undefined;
  const pageDimensions = getPageDimensionsMm(book.orientation);
  const printableArea = selectedPage
    ? getPrintableAreaMm(pageDimensions, selectedPage.marginsMm)
    : getPrintableAreaMm(pageDimensions, book.defaultMarginsMm);
  const modelSnapshot = {
    pageSize: book.pageSize,
    orientation: book.orientation,
    pageCount: book.pages.length,
    defaultMarginsMm: book.defaultMarginsMm,
    borderPreset: book.defaultBorderPresetId,
    selectedPage: selectedPage
      ? {
          id: selectedPage.id,
          pageNumber: selectedPage.pageNumber,
          blocks: selectedPage.blocks.map((block) => ({
            id: block.id,
            type: block.type,
            role: block.role,
            xMm: Math.round(block.xMm),
            yMm: Math.round(block.yMm),
            widthMm: Math.round(block.widthMm),
            heightMm: Math.round(block.heightMm),
          })),
        }
      : null,
  };

  function rebuildLayout(next: {
    orientation?: PageOrientation;
    marginsMm?: PageMarginsMm;
    pageCount?: number;
  }) {
    setBook((current) => rebuildBookDocument(current, next));
  }

  function handleOrientationChange(orientation: PageOrientation) {
    rebuildLayout({ orientation });
  }

  function handleMarginChange(
    key: keyof PageMarginsMm,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const nextValue = Number(event.target.value);

    if (!Number.isFinite(nextValue)) {
      return;
    }

    rebuildLayout({
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

    rebuildLayout({ pageCount: nextValue });
  }

  function handleBorderPresetChange(borderPresetId: BorderPresetId) {
    setBook((current) => ({
      ...current,
      defaultBorderPresetId: borderPresetId,
      pages: current.pages.map((page) => ({
        ...page,
        borderPresetId,
      })),
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateSelectedPage(updater: (page: BookPage) => BookPage) {
    setBook((current) => {
      const effectiveSelectedPageId = current.pages.some(
        (page) => page.id === selectedPageId,
      )
        ? selectedPageId
        : current.pages[0]?.id ?? "";

      return {
        ...current,
        pages: current.pages.map((page) =>
          page.id === effectiveSelectedPageId ? updater(page) : page,
        ),
        updatedAt: new Date().toISOString(),
      };
    });
  }

  function updateTextBlock(
    role: TextBlock["role"],
    updater: (block: TextBlock, page: BookPage) => TextBlock,
  ) {
    updateSelectedPage((page) => ({
      ...page,
      blocks: page.blocks.map((block) => {
        if (block.type === "text" && block.role === role) {
          return updater(block, page);
        }

        return block;
      }),
    }));
  }

  function updateImageBlock(updater: (block: ImageBlock, page: BookPage) => ImageBlock) {
    updateSelectedPage((page) =>
      normalizePageLayout(
        {
          ...page,
          blocks: page.blocks.map((block) => {
            if (block.type === "image") {
              return clampImageBlock(
                updater(block, page),
                book.orientation,
                page.marginsMm,
              );
            }

            return block;
          }),
        },
        book.orientation,
      ),
    );
  }

  function handleLanguageChange(
    role: TextBlock["role"],
    language: SupportedLanguage,
  ) {
    updateTextBlock(role, (block) => ({
      ...block,
      language,
      fontFamilyId: getDefaultFontForLanguage(language),
      align: language === "arabic" ? "end" : "start",
    }));
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !imageBlock) {
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    objectUrlsRef.current.add(objectUrl);
    releaseObjectUrl(imageBlock.src);

    updateImageBlock((block) => ({
      ...block,
      src: objectUrl,
      alt: file.name,
    }));

    event.target.value = "";
  }

  function clearImage() {
    if (!imageBlock?.src) {
      return;
    }

    releaseObjectUrl(imageBlock.src);

    updateImageBlock((block) => ({
      ...block,
      src: undefined,
      alt: `Illustration placeholder for page ${selectedPage?.pageNumber ?? 1}`,
    }));
  }

  function releaseObjectUrl(url?: string) {
    if (!url?.startsWith("blob:")) {
      return;
    }

    URL.revokeObjectURL(url);
    objectUrlsRef.current.delete(url);
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <section className="rounded-[2rem] border border-white/60 bg-white/85 p-6 shadow-[0_30px_90px_rgba(120,98,53,0.12)] backdrop-blur">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-700">
              Phase 2
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
              Multilingual content editor with borders and image placement
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">
              The editor now supports Bengali, English, and Arabic text controls,
              font styling, border presets, and page-specific image uploads with
              position and size adjustments inside the printable A4 area.
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/80 px-4 py-3 text-sm text-stone-700 sm:grid-cols-4">
            <Metric label="Page size" value="A4 locked" />
            <Metric label="Orientation" value={book.orientation} />
            <Metric label="Pages" value={String(book.pages.length)} />
            <Metric
              label="Printable area"
              value={`${Math.round(printableArea.widthMm)} x ${Math.round(printableArea.heightMm)} mm`}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[440px_minmax(0,1fr)]">
        <div className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <Panel
            title="Document setup"
            description="Orientation, margins, border preset, and page count are still global controls and rebuild the draft layout."
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
                  className={fieldClassName}
                />
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
                            ? "Classic book proportions"
                            : "Wider editorial spread"}
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
                      <label htmlFor={`margin-${key}`} className="text-sm font-medium text-stone-700">
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
                        className={fieldClassName}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <Label>Border preset</Label>
                <div className="grid gap-3">
                  {BORDER_PRESETS.map((preset) => {
                    const active = book.defaultBorderPresetId === preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleBorderPresetChange(preset.id)}
                        className={`rounded-[1.25rem] border px-4 py-3 text-left transition ${
                          active
                            ? "border-amber-500 bg-amber-50 shadow-[0_12px_30px_rgba(245,158,11,0.14)]"
                            : "border-stone-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        <span className="block font-semibold text-stone-900">
                          {preset.label}
                        </span>
                        <span className="mt-1 block text-sm leading-6 text-stone-600">
                          {preset.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </Panel>

          <Panel
            title="Page content"
            description="Pick a page, then edit its heading, body, and illustration. Text direction adjusts automatically for Arabic."
          >
            <div className="space-y-5">
              <div className="space-y-3">
                <Label>Current page</Label>
                <div className="flex flex-wrap gap-2">
                  {book.pages.map((page) => {
                    const active = page.id === selectedPage?.id;

                    return (
                      <button
                        key={page.id}
                        type="button"
                        onClick={() => setSelectedPageId(page.id)}
                        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-stone-900 text-white"
                            : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                        }`}
                      >
                        Page {page.pageNumber}
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedPage && headingBlock && (
                <TextBlockEditor
                  key={`${selectedPage.id}-heading`}
                  title="Heading block"
                  block={headingBlock}
                  pageNumber={selectedPage.pageNumber}
                  onLanguageChange={(language) => handleLanguageChange("heading", language)}
                  onContentChange={(content) =>
                    updateTextBlock("heading", (block) => ({ ...block, content }))
                  }
                  onFontChange={(fontFamilyId) =>
                    updateTextBlock("heading", (block) => ({ ...block, fontFamilyId }))
                  }
                  onFontSizeChange={(fontSizePt) =>
                    updateTextBlock("heading", (block) => ({ ...block, fontSizePt }))
                  }
                  onColorChange={(color) =>
                    updateTextBlock("heading", (block) => ({ ...block, color }))
                  }
                  onAlignChange={(align) =>
                    updateTextBlock("heading", (block) => ({ ...block, align }))
                  }
                  onUseSample={() =>
                    updateTextBlock("heading", (block, page) => ({
                      ...block,
                      content: getSampleCopy("heading", block.language, page.pageNumber),
                    }))
                  }
                />
              )}

              {selectedPage && bodyBlock && (
                <TextBlockEditor
                  key={`${selectedPage.id}-body`}
                  title="Body block"
                  block={bodyBlock}
                  pageNumber={selectedPage.pageNumber}
                  onLanguageChange={(language) => handleLanguageChange("body", language)}
                  onContentChange={(content) =>
                    updateTextBlock("body", (block) => ({ ...block, content }))
                  }
                  onFontChange={(fontFamilyId) =>
                    updateTextBlock("body", (block) => ({ ...block, fontFamilyId }))
                  }
                  onFontSizeChange={(fontSizePt) =>
                    updateTextBlock("body", (block) => ({ ...block, fontSizePt }))
                  }
                  onColorChange={(color) =>
                    updateTextBlock("body", (block) => ({ ...block, color }))
                  }
                  onAlignChange={(align) =>
                    updateTextBlock("body", (block) => ({ ...block, align }))
                  }
                  onUseSample={() =>
                    updateTextBlock("body", (block, page) => ({
                      ...block,
                      content: getSampleCopy("body", block.language, page.pageNumber),
                    }))
                  }
                />
              )}

              {selectedPage && imageBlock && (
                <ImageBlockEditor
                  block={imageBlock}
                  printableArea={printableArea}
                  onUpload={handleImageUpload}
                  onFitChange={(fit) =>
                    updateImageBlock((block) => ({ ...block, fit }))
                  }
                  onAltChange={(alt) =>
                    updateImageBlock((block) => ({ ...block, alt }))
                  }
                  onRectChange={(key, value) =>
                    updateImageBlock((block) => ({ ...block, [key]: value }))
                  }
                  onClear={clearImage}
                />
              )}
            </div>
          </Panel>

          <Panel
            title="Document model"
            description="Current serialized shape for the selected page. This is useful while Phase 3 wiring for PDF export is still pending."
          >
            <pre className="overflow-x-auto rounded-[1.5rem] bg-stone-950 px-4 py-4 text-xs leading-6 text-stone-100">
              {JSON.stringify(modelSnapshot, null, 2)}
            </pre>
          </Panel>
        </div>

        <Panel
          title="Preview workspace"
          description="Every page stays in A4 ratio. Borders, typography, and image placement update immediately. Click a page to focus its controls."
        >
          <div className="mb-4 flex flex-wrap gap-2">
            {book.pages.map((page) => (
              <button
                key={`${page.id}-thumb`}
                type="button"
                onClick={() => setSelectedPageId(page.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  page.id === selectedPage?.id
                    ? "bg-amber-500 text-white"
                    : "bg-amber-50 text-amber-900 hover:bg-amber-100"
                }`}
              >
                Page {page.pageNumber}
              </button>
            ))}
          </div>
          <div className="grid gap-6 xl:grid-cols-2">
            {book.pages.map((page) => (
              <PreviewPage
                key={page.id}
                page={page}
                orientation={book.orientation}
                selected={page.id === selectedPage?.id}
                onSelect={() => setSelectedPageId(page.id)}
              />
            ))}
          </div>
        </Panel>
      </section>
    </main>
  );
}

function TextBlockEditor({
  title,
  block,
  pageNumber,
  onLanguageChange,
  onContentChange,
  onFontChange,
  onFontSizeChange,
  onColorChange,
  onAlignChange,
  onUseSample,
}: Readonly<{
  title: string;
  block: TextBlock;
  pageNumber: number;
  onLanguageChange: (language: SupportedLanguage) => void;
  onContentChange: (content: string) => void;
  onFontChange: (fontFamilyId: FontFamilyId) => void;
  onFontSizeChange: (fontSizePt: number) => void;
  onColorChange: (color: string) => void;
  onAlignChange: (align: TextBlock["align"]) => void;
  onUseSample: () => void;
}>) {
  const direction = getLanguageDirection(block.language);

  return (
    <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-stone-900">{title}</h3>
          <p className="text-sm text-stone-500">Page {pageNumber}</p>
        </div>
        <button
          type="button"
          onClick={onUseSample}
          className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 transition hover:bg-stone-100"
        >
          Sample text
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Language">
          <select
            value={block.language}
            onChange={(event) => onLanguageChange(event.target.value as SupportedLanguage)}
            className={fieldClassName}
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language.id} value={language.id}>
                {language.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Font family">
          <select
            value={block.fontFamilyId}
            onChange={(event) => onFontChange(event.target.value as FontFamilyId)}
            className={fieldClassName}
          >
            {FONT_OPTIONS.map((font) => (
              <option key={font.id} value={font.id}>
                {font.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Font size">
          <input
            type="number"
            min={10}
            max={40}
            step={1}
            value={block.fontSizePt}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
            className={fieldClassName}
          />
        </Field>

        <Field label="Font color">
          <div className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2.5">
            <input
              type="color"
              value={block.color}
              onChange={(event) => onColorChange(event.target.value)}
              className="h-10 w-12 rounded-lg border-0 bg-transparent p-0"
            />
            <input
              type="text"
              value={block.color}
              onChange={(event) => onColorChange(event.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-stone-700 outline-none"
            />
          </div>
        </Field>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-4">
          <Label>Alignment</Label>
          <span className="text-xs uppercase tracking-[0.18em] text-stone-400">
            {direction === "rtl" ? "right-to-left" : "left-to-right"}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {([
            ["start", "Start"],
            ["center", "Center"],
            ["end", "End"],
          ] as const).map(([align, label]) => {
            const active = block.align === align;

            return (
              <button
                key={align}
                type="button"
                onClick={() => onAlignChange(align)}
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-stone-900 text-white"
                    : "bg-white text-stone-600 hover:bg-stone-100"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Content">
        <textarea
          value={block.content}
          dir={direction}
          onChange={(event) => onContentChange(event.target.value)}
          className={`${fieldClassName} min-h-32 resize-y py-3 leading-7`}
          style={{
            fontFamily: getFontFamilyStack(block.fontFamilyId, block.language),
            textAlign: mapAlignment(block.align),
          }}
        />
      </Field>
    </section>
  );
}

function ImageBlockEditor({
  block,
  printableArea,
  onUpload,
  onFitChange,
  onAltChange,
  onRectChange,
  onClear,
}: Readonly<{
  block: ImageBlock;
  printableArea: MmRect;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
  onFitChange: (fit: ImageBlock["fit"]) => void;
  onAltChange: (alt: string) => void;
  onRectChange: (key: keyof MmRect, value: number) => void;
  onClear: () => void;
}>) {
  return (
    <section className="space-y-4 rounded-[1.5rem] border border-stone-200 bg-stone-50/70 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-stone-900">Illustration block</h3>
          <p className="text-sm leading-6 text-stone-500">
            Upload a local image and tune its placement within the printable area.
          </p>
        </div>
        {block.src && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-full bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-stone-600 transition hover:bg-stone-100"
          >
            Clear
          </button>
        )}
      </div>

      <Field label="Image file">
        <input type="file" accept="image/*" onChange={onUpload} className={fieldClassName} />
      </Field>

      <Field label="Alt text">
        <input
          type="text"
          value={block.alt}
          onChange={(event) => onAltChange(event.target.value)}
          className={fieldClassName}
        />
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Fit mode">
          <select
            value={block.fit}
            onChange={(event) => onFitChange(event.target.value as ImageBlock["fit"])}
            className={fieldClassName}
          >
            <option value="contain">Contain</option>
            <option value="cover">Cover</option>
          </select>
        </Field>

        <div className="rounded-[1.25rem] border border-dashed border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-500">
          Safe area: {Math.round(printableArea.widthMm)} x {Math.round(printableArea.heightMm)} mm
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {imageFields.map(({ key, label, min }) => (
          <Field key={key} label={`${label} (mm)`}>
            <input
              type="number"
              min={min}
              step={1}
              value={Math.round(block[key])}
              onChange={(event) => onRectChange(key, Number(event.target.value))}
              className={fieldClassName}
            />
          </Field>
        ))}
      </div>
    </section>
  );
}

function PreviewPage({
  page,
  orientation,
  selected,
  onSelect,
}: Readonly<{
  page: BookPage;
  orientation: PageOrientation;
  selected: boolean;
  onSelect: () => void;
}>) {
  const pageDimensions = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, page.marginsMm);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-[1.75rem] border p-4 text-left shadow-[0_18px_48px_rgba(57,45,24,0.08)] transition ${
        selected
          ? "border-amber-500 bg-amber-50/60 shadow-[0_20px_60px_rgba(245,158,11,0.16)]"
          : "border-stone-200 bg-[#fffdf8] hover:border-amber-300"
      }`}
    >
      <div className="mb-4 flex items-center justify-between text-sm text-stone-500">
        <span className="font-medium text-stone-700">Page {page.pageNumber}</span>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-[0.2em]">
            {orientation}
          </span>
          {selected && (
            <span className="rounded-full bg-amber-500 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white">
              Editing
            </span>
          )}
        </div>
      </div>

      <div
        className="relative mx-auto w-full max-w-[31rem] overflow-hidden rounded-[1.4rem] border border-stone-300 bg-[linear-gradient(180deg,#fffefb_0%,#faf5ea_100%)] shadow-[0_24px_60px_rgba(88,65,31,0.12)]"
        style={{ aspectRatio: `${pageDimensions.width} / ${pageDimensions.height}` }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(245,158,11,0.14),transparent_33%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_30%)]" />
        <BorderOverlay presetId={page.borderPresetId} />
        <div
          className="absolute rounded-[1rem] border border-dashed border-sky-500/70 bg-sky-50/35"
          style={toRelativeRectStyle(printableArea, pageDimensions)}
        />

        {page.blocks.map((block) => {
          if (block.type === "text") {
            return (
              <div
                key={block.id}
                className="absolute overflow-hidden rounded-[0.9rem] border border-stone-200/80 bg-white/85 px-3 py-2 shadow-sm"
                style={toRelativeRectStyle(block, pageDimensions)}
              >
                <p
                  dir={getLanguageDirection(block.language)}
                  className="whitespace-pre-wrap leading-[1.45]"
                  style={{
                    color: block.color,
                    fontFamily: getFontFamilyStack(block.fontFamilyId, block.language),
                    fontSize: `${Math.max(block.fontSizePt * 0.82, 10)}px`,
                    textAlign: mapAlignment(block.align),
                  }}
                >
                  {block.content}
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
              {block.src ? (
                <img
                  src={block.src}
                  alt={block.alt}
                  className="h-full w-full"
                  style={{ objectFit: block.fit }}
                />
              ) : (
                <div className="flex h-full items-center justify-center px-3 text-center text-xs font-medium uppercase tracking-[0.18em] text-amber-800/80">
                  Image slot
                </div>
              )}
            </div>
          );
        })}

        <div className="absolute bottom-3 left-3 rounded-full bg-stone-900 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-white">
          A4
        </div>
      </div>
    </button>
  );
}

function BorderOverlay({ presetId }: Readonly<{ presetId: BorderPresetId }>) {
  if (presetId === "none") {
    return null;
  }

  if (presetId === "classic") {
    return (
      <div
        className="absolute inset-[4.4%] rounded-[1.1rem] border-[1.5px] border-stone-500/80"
        aria-hidden
      />
    );
  }

  if (presetId === "double") {
    return (
      <>
        <div
          className="absolute inset-[3.8%] rounded-[1.2rem] border-[1.5px] border-stone-500/80"
          aria-hidden
        />
        <div
          className="absolute inset-[5.3%] rounded-[0.95rem] border border-stone-400/80"
          aria-hidden
        />
      </>
    );
  }

  return (
    <>
      <div
        className="absolute inset-[4.4%] rounded-[1.15rem] border-[1.5px] border-amber-700/60"
        aria-hidden
      />
      {[
        "top-6 left-6 border-t border-l",
        "top-6 right-6 border-t border-r",
        "bottom-6 left-6 border-b border-l",
        "bottom-6 right-6 border-b border-r",
      ].map((className) => (
        <div
          key={className}
          className={`absolute h-10 w-10 border-amber-700/70 ${className}`}
          aria-hidden
        />
      ))}
    </>
  );
}

function Panel({
  title,
  description,
  children,
}: Readonly<{
  title: string;
  description: string;
  children: ReactNode;
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

function Field({
  label,
  children,
}: Readonly<{
  label: string;
  children: ReactNode;
}>) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-stone-400">{label}</p>
      <p className="mt-1 font-semibold capitalize text-stone-900">{value}</p>
    </div>
  );
}

function Label({
  htmlFor,
  children,
}: Readonly<{
  htmlFor?: string;
  children: ReactNode;
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

function clampImageBlock(
  block: ImageBlock,
  orientation: PageOrientation,
  marginsMm: PageMarginsMm,
): ImageBlock {
  const pageDimensions = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, marginsMm);
  const widthMm = clampNumber(block.widthMm, 24, printableArea.widthMm);
  const heightMm = clampNumber(block.heightMm, 16, printableArea.heightMm);

  return {
    ...block,
    widthMm,
    heightMm,
    xMm: clampNumber(
      block.xMm,
      printableArea.xMm,
      printableArea.xMm + printableArea.widthMm - widthMm,
    ),
    yMm: clampNumber(
      block.yMm,
      printableArea.yMm,
      printableArea.yMm + printableArea.heightMm - heightMm,
    ),
  };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

const fieldClassName =
  "w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base text-stone-900 outline-none transition focus:border-amber-500 focus:ring-4 focus:ring-amber-100";



