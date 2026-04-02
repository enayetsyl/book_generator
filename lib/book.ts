export const A4_SIZE_MM = {
  width: 210,
  height: 297,
} as const;

export const PAGE_COUNT_LIMIT = 12;

export type SupportedLanguage = "bengali" | "english" | "arabic";
export type PageOrientation = "portrait" | "landscape";
export type BorderPresetId = "none" | "classic" | "double" | "frame";
export type FontFamilyId =
  | "editor-sans"
  | "editor-serif"
  | "editor-display"
  | "editor-mono"
  | "editor-bangla"
  | "editor-arabic";

export interface PageMarginsMm {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface MmRect {
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

interface BaseContentBlock extends MmRect {
  id: string;
}

export interface TextBlock extends BaseContentBlock {
  type: "text";
  role: "heading" | "body";
  content: string;
  language: SupportedLanguage;
  fontFamilyId: FontFamilyId;
  fontSizePt: number;
  color: string;
  align: "start" | "center" | "end";
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
  role: "illustration";
  src?: string;
  alt: string;
  fit: "contain" | "cover";
}

export type PageBlock = TextBlock | ImageBlock;

export interface BookPage {
  id: string;
  pageNumber: number;
  marginsMm: PageMarginsMm;
  borderPresetId: BorderPresetId;
  blocks: PageBlock[];
}

export interface BookDocument {
  id: string;
  pageSize: "A4";
  orientation: PageOrientation;
  defaultMarginsMm: PageMarginsMm;
  defaultBorderPresetId: BorderPresetId;
  pages: BookPage[];
  updatedAt: string;
}

export interface FontOption {
  id: FontFamilyId;
  label: string;
  family: string;
}

export interface BorderPresetOption {
  id: BorderPresetId;
  label: string;
  description: string;
}

export const DEFAULT_MARGINS_MM: PageMarginsMm = {
  top: 18,
  right: 18,
  bottom: 18,
  left: 18,
};

export const BORDER_PRESETS: BorderPresetOption[] = [
  {
    id: "none",
    label: "None",
    description: "No decorative border. Clean printable canvas.",
  },
  {
    id: "classic",
    label: "Classic",
    description: "Single rule border suited for text-first pages.",
  },
  {
    id: "double",
    label: "Double",
    description: "Two-line frame for more formal document styling.",
  },
  {
    id: "frame",
    label: "Frame",
    description: "Accent corners with a softer illustrated feel.",
  },
];

export const LANGUAGE_OPTIONS: Array<{
  id: SupportedLanguage;
  label: string;
  direction: "ltr" | "rtl";
}> = [
  { id: "english", label: "English", direction: "ltr" },
  { id: "bengali", label: "Bengali", direction: "ltr" },
  { id: "arabic", label: "Arabic", direction: "rtl" },
];

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "editor-sans",
    label: "Editorial Sans",
    family:
      'var(--font-geist-sans), "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  {
    id: "editor-serif",
    label: "Book Serif",
    family: '"Iowan Old Style", Georgia, Cambria, "Times New Roman", serif',
  },
  {
    id: "editor-display",
    label: "Display Sans",
    family: '"Trebuchet MS", "Avenir Next", "Segoe UI", sans-serif',
  },
  {
    id: "editor-mono",
    label: "Mono",
    family:
      'var(--font-geist-mono), "SFMono-Regular", Consolas, "Courier New", monospace',
  },
  {
    id: "editor-bangla",
    label: "Bangla Sans",
    family: '"Noto Sans Bengali", "Hind Siliguri", "Vrinda", sans-serif',
  },
  {
    id: "editor-arabic",
    label: "Arabic Naskh",
    family: '"Noto Naskh Arabic", Amiri, "Segoe UI", serif',
  },
];

const DEFAULT_FONT_BY_LANGUAGE: Record<SupportedLanguage, FontFamilyId> = {
  english: "editor-sans",
  bengali: "editor-bangla",
  arabic: "editor-arabic",
};

export function getPageDimensionsMm(
  orientation: PageOrientation,
): { width: number; height: number } {
  if (orientation === "landscape") {
    return {
      width: A4_SIZE_MM.height,
      height: A4_SIZE_MM.width,
    };
  }

  return {
    width: A4_SIZE_MM.width,
    height: A4_SIZE_MM.height,
  };
}

export function getPrintableAreaMm(
  page: { width: number; height: number },
  margins: PageMarginsMm,
): MmRect {
  return {
    xMm: margins.left,
    yMm: margins.top,
    widthMm: Math.max(page.width - margins.left - margins.right, 32),
    heightMm: Math.max(page.height - margins.top - margins.bottom, 48),
  };
}

export function clampMarginsMm(
  margins: PageMarginsMm,
  orientation: PageOrientation,
): PageMarginsMm {
  const page = getPageDimensionsMm(orientation);

  const clamped = {
    top: clampValue(margins.top, 8, 48),
    right: clampValue(margins.right, 8, 48),
    bottom: clampValue(margins.bottom, 8, 48),
    left: clampValue(margins.left, 8, 48),
  };

  const maxHorizontalMargins = page.width - 60;
  const horizontalMargins = clamped.left + clamped.right;

  if (horizontalMargins > maxHorizontalMargins) {
    const scale = maxHorizontalMargins / horizontalMargins;
    clamped.left = Math.round(clamped.left * scale);
    clamped.right = Math.round(clamped.right * scale);
  }

  const maxVerticalMargins = page.height - 80;
  const verticalMargins = clamped.top + clamped.bottom;

  if (verticalMargins > maxVerticalMargins) {
    const scale = maxVerticalMargins / verticalMargins;
    clamped.top = Math.round(clamped.top * scale);
    clamped.bottom = Math.round(clamped.bottom * scale);
  }

  return clamped;
}

export function createBookDocument(input?: {
  orientation?: PageOrientation;
  marginsMm?: PageMarginsMm;
  pageCount?: number;
  borderPresetId?: BorderPresetId;
}): BookDocument {
  const orientation = input?.orientation ?? "portrait";
  const marginsMm = clampMarginsMm(
    input?.marginsMm ?? DEFAULT_MARGINS_MM,
    orientation,
  );
  const pageCount = clampValue(input?.pageCount ?? 2, 1, PAGE_COUNT_LIMIT);
  const borderPresetId = input?.borderPresetId ?? "classic";

  return {
    id: "draft-book",
    pageSize: "A4",
    orientation,
    defaultMarginsMm: marginsMm,
    defaultBorderPresetId: borderPresetId,
    pages: Array.from({ length: pageCount }, (_, index) =>
      createBookPage(index + 1, orientation, marginsMm, borderPresetId),
    ),
    updatedAt: new Date().toISOString(),
  };
}

export function rebuildBookDocument(
  current: BookDocument,
  input?: {
    orientation?: PageOrientation;
    marginsMm?: PageMarginsMm;
    pageCount?: number;
    borderPresetId?: BorderPresetId;
  },
): BookDocument {
  const orientation = input?.orientation ?? current.orientation;
  const marginsMm = clampMarginsMm(
    input?.marginsMm ?? current.defaultMarginsMm,
    orientation,
  );
  const pageCount = clampValue(
    input?.pageCount ?? current.pages.length,
    1,
    PAGE_COUNT_LIMIT,
  );
  const borderPresetId =
    input?.borderPresetId ?? current.defaultBorderPresetId ?? "classic";

  const next = createBookDocument({
    orientation,
    marginsMm,
    pageCount,
    borderPresetId,
  });

  return {
    ...next,
    id: current.id,
    pages: next.pages.map((page, index) => {
      const existingPage = current.pages[index];

      if (!existingPage) {
        return page;
      }

      return mergePageContent(page, existingPage, orientation);
    }),
    updatedAt: new Date().toISOString(),
  };
}

export function getFontFamilyStack(
  fontFamilyId: FontFamilyId,
  language: SupportedLanguage,
): string {
  const matchedFont = FONT_OPTIONS.find((option) => option.id === fontFamilyId);
  const defaultFont = FONT_OPTIONS.find(
    (option) => option.id === DEFAULT_FONT_BY_LANGUAGE[language],
  );

  return matchedFont?.family ?? defaultFont?.family ?? FONT_OPTIONS[0].family;
}

export function getLanguageDirection(
  language: SupportedLanguage,
): "ltr" | "rtl" {
  return (
    LANGUAGE_OPTIONS.find((option) => option.id === language)?.direction ?? "ltr"
  );
}

export function getDefaultFontForLanguage(
  language: SupportedLanguage,
): FontFamilyId {
  return DEFAULT_FONT_BY_LANGUAGE[language];
}

export function getTextBlock(
  page: BookPage,
  role: TextBlock["role"],
): TextBlock | undefined {
  return page.blocks.find(
    (block): block is TextBlock => block.type === "text" && block.role === role,
  );
}

export function getImageBlock(page: BookPage): ImageBlock | undefined {
  return page.blocks.find(
    (block): block is ImageBlock =>
      block.type === "image" && block.role === "illustration",
  );
}

export function getSampleCopy(
  role: TextBlock["role"],
  language: SupportedLanguage,
  pageNumber: number,
): string {
  if (language === "bengali") {
    if (role === "heading") {
      return `[Bengali heading ${pageNumber}]`;
    }

    return "[Bengali paragraph sample]";
  }

  if (language === "arabic") {
    if (role === "heading") {
      return `[Arabic heading ${pageNumber}]`;
    }

    return "[Arabic paragraph sample]";
  }

  if (role === "heading") {
    return `Page ${pageNumber} heading`;
  }

  return "Use this body area for longer text, captions, or a short section introduction.";
}
function createBookPage(
  pageNumber: number,
  orientation: PageOrientation,
  marginsMm: PageMarginsMm,
  borderPresetId: BorderPresetId,
): BookPage {
  const page = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(page, marginsMm);
  const inset = Math.min(12, printableArea.widthMm * 0.08);
  const contentWidth = Math.max(printableArea.widthMm - inset * 2, 28);
  const headingHeight = Math.min(34, printableArea.heightMm * 0.18);
  const imageHeight = Math.min(96, printableArea.heightMm * 0.42);
  const imageTop = printableArea.yMm + headingHeight + inset * 1.6;

  return normalizePageLayout(
    {
      id: `page-${pageNumber}`,
      pageNumber,
      marginsMm,
      borderPresetId,
      blocks: [
        {
          id: `page-${pageNumber}-heading`,
          type: "text",
          role: "heading",
          xMm: printableArea.xMm + inset,
          yMm: printableArea.yMm + inset,
          widthMm: contentWidth,
          heightMm: headingHeight,
          content: getSampleCopy("heading", "english", pageNumber),
          language: "english",
          fontFamilyId: getDefaultFontForLanguage("english"),
          fontSizePt: 20,
          color: "#1f2937",
          align: "start",
        },
        {
          id: `page-${pageNumber}-image`,
          type: "image",
          role: "illustration",
          xMm: printableArea.xMm + inset,
          yMm: imageTop,
          widthMm: contentWidth,
          heightMm: imageHeight,
          alt: `Illustration placeholder for page ${pageNumber}`,
          fit: "contain",
        },
        {
          id: `page-${pageNumber}-body`,
          type: "text",
          role: "body",
          xMm: printableArea.xMm + inset,
          yMm: imageTop + imageHeight + inset * 1.2,
          widthMm: contentWidth,
          heightMm: Math.max(
            printableArea.heightMm - imageHeight - headingHeight - inset * 4.5,
            30,
          ),
          content: getSampleCopy("body", "english", pageNumber),
          language: "english",
          fontFamilyId: getDefaultFontForLanguage("english"),
          fontSizePt: 12,
          color: "#475569",
          align: "start",
        },
      ],
    },
    orientation,
  );
}

function mergePageContent(
  nextPage: BookPage,
  existingPage: BookPage,
  orientation: PageOrientation,
): BookPage {
  const pageDimensions = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, nextPage.marginsMm);

  return normalizePageLayout(
    {
      ...nextPage,
      borderPresetId: existingPage.borderPresetId,
      blocks: nextPage.blocks.map((nextBlock) => {
        if (nextBlock.type === "text") {
          const existingBlock = existingPage.blocks.find(
            (block): block is TextBlock =>
              block.type === "text" && block.role === nextBlock.role,
          );

          if (!existingBlock) {
            return nextBlock;
          }

          return {
            ...nextBlock,
            ...clampBlockToArea(existingBlock, printableArea),
            content: existingBlock.content,
            language: existingBlock.language,
            fontFamilyId: existingBlock.fontFamilyId,
            fontSizePt: existingBlock.fontSizePt,
            color: existingBlock.color,
            align: existingBlock.align,
          };
        }

        const existingBlock = existingPage.blocks.find(
          (block): block is ImageBlock =>
            block.type === "image" && block.role === nextBlock.role,
        );

        if (!existingBlock) {
          return nextBlock;
        }

        return {
          ...nextBlock,
          ...clampBlockToArea(existingBlock, printableArea),
          src: existingBlock.src,
          alt: existingBlock.alt,
          fit: existingBlock.fit,
        };
      }),
    },
    orientation,
  );
}

export function normalizePageLayout(
  page: BookPage,
  orientation: PageOrientation,
): BookPage {
  const heading = getTextBlock(page, "heading");
  const body = getTextBlock(page, "body");
  const image = getImageBlock(page);

  if (!heading || !body || !image) {
    return page;
  }

  const metrics = getPageLayoutMetrics(page.marginsMm, orientation);
  const headingHeight = clampValue(heading.heightMm, 24, Math.min(40, metrics.printableArea.heightMm * 0.22));
  const headingBlock: TextBlock = {
    ...heading,
    xMm: metrics.contentLeft,
    yMm: metrics.contentTop,
    widthMm: metrics.contentWidth,
    heightMm: headingHeight,
  };

  const imageWidth = clampValue(image.widthMm, 24, metrics.contentWidth);
  const imageX = clampValue(
    image.xMm,
    metrics.contentLeft,
    metrics.contentLeft + metrics.contentWidth - imageWidth,
  );
  const imageTopMin = headingBlock.yMm + headingBlock.heightMm + metrics.gap;
  const imageTopMax = Math.max(
    imageTopMin,
    metrics.contentBottom - metrics.minBodyHeight - metrics.gap - metrics.minImageHeight,
  );
  const imageY = clampValue(image.yMm, imageTopMin, imageTopMax);
  const imageHeightMax = Math.max(
    metrics.minImageHeight,
    metrics.contentBottom - metrics.minBodyHeight - metrics.gap - imageY,
  );
  const imageHeight = clampValue(image.heightMm, metrics.minImageHeight, imageHeightMax);
  const imageBlock: ImageBlock = {
    ...image,
    xMm: imageX,
    yMm: imageY,
    widthMm: imageWidth,
    heightMm: imageHeight,
  };

  const bodyY = imageBlock.yMm + imageBlock.heightMm + metrics.gap;
  const bodyHeight = Math.max(metrics.contentBottom - bodyY, metrics.minBodyHeight);
  const bodyBlock: TextBlock = {
    ...body,
    xMm: metrics.contentLeft,
    yMm: bodyY,
    widthMm: metrics.contentWidth,
    heightMm: bodyHeight,
  };

  return {
    ...page,
    blocks: page.blocks.map((block) => {
      if (block.type === "text" && block.role === "heading") {
        return headingBlock;
      }

      if (block.type === "text" && block.role === "body") {
        return bodyBlock;
      }

      if (block.type === "image" && block.role === "illustration") {
        return imageBlock;
      }

      return block;
    }),
  };
}

function getPageLayoutMetrics(
  marginsMm: PageMarginsMm,
  orientation: PageOrientation,
) {
  const pageDimensions = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(pageDimensions, marginsMm);
  const inset = Math.min(12, printableArea.widthMm * 0.08);
  const gap = Math.max(8, inset * 1.2);

  return {
    printableArea,
    contentLeft: printableArea.xMm + inset,
    contentTop: printableArea.yMm + inset,
    contentWidth: Math.max(printableArea.widthMm - inset * 2, 28),
    contentBottom: printableArea.yMm + printableArea.heightMm - inset,
    gap,
    minImageHeight: Math.max(32, printableArea.heightMm * 0.14),
    minBodyHeight: 42,
  };
}
function clampBlockToArea(
  block: MmRect,
  printableArea: MmRect,
): MmRect {
  const widthMm = clampValue(block.widthMm, 24, printableArea.widthMm);
  const heightMm = clampValue(block.heightMm, 16, printableArea.heightMm);
  const xMm = clampValue(
    block.xMm,
    printableArea.xMm,
    printableArea.xMm + printableArea.widthMm - widthMm,
  );
  const yMm = clampValue(
    block.yMm,
    printableArea.yMm,
    printableArea.yMm + printableArea.heightMm - heightMm,
  );

  return {
    xMm,
    yMm,
    widthMm,
    heightMm,
  };
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}


