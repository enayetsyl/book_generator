export const A4_SIZE_MM = {
  width: 210,
  height: 297,
} as const;

export const PAGE_COUNT_LIMIT = 12;

export type SupportedLanguage = "bengali" | "english" | "arabic";
export type PageOrientation = "portrait" | "landscape";
export type BorderPresetId = "none";

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
  content: string;
  language: SupportedLanguage;
  fontFamily: string;
  fontSizePt: number;
  color: string;
  align: "start" | "center" | "end";
}

export interface ImageBlock extends BaseContentBlock {
  type: "image";
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
  pages: BookPage[];
  updatedAt: string;
}

export const DEFAULT_MARGINS_MM: PageMarginsMm = {
  top: 18,
  right: 18,
  bottom: 18,
  left: 18,
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
}): BookDocument {
  const orientation = input?.orientation ?? "portrait";
  const marginsMm = clampMarginsMm(
    input?.marginsMm ?? DEFAULT_MARGINS_MM,
    orientation,
  );
  const pageCount = clampValue(input?.pageCount ?? 2, 1, PAGE_COUNT_LIMIT);

  return {
    id: "draft-book",
    pageSize: "A4",
    orientation,
    defaultMarginsMm: marginsMm,
    pages: Array.from({ length: pageCount }, (_, index) =>
      createBookPage(index + 1, orientation, marginsMm),
    ),
    updatedAt: new Date().toISOString(),
  };
}

function createBookPage(
  pageNumber: number,
  orientation: PageOrientation,
  marginsMm: PageMarginsMm,
): BookPage {
  const page = getPageDimensionsMm(orientation);
  const printableArea = getPrintableAreaMm(page, marginsMm);
  const inset = Math.min(12, printableArea.widthMm * 0.08);
  const contentWidth = Math.max(printableArea.widthMm - inset * 2, 28);
  const headingHeight = Math.min(34, printableArea.heightMm * 0.18);
  const imageHeight = Math.min(96, printableArea.heightMm * 0.42);
  const imageTop = printableArea.yMm + headingHeight + inset * 1.6;

  return {
    id: `page-${pageNumber}`,
    pageNumber,
    marginsMm,
    borderPresetId: "none",
    blocks: [
      {
        id: `page-${pageNumber}-heading`,
        type: "text",
        xMm: printableArea.xMm + inset,
        yMm: printableArea.yMm + inset,
        widthMm: contentWidth,
        heightMm: headingHeight,
        content: `Page ${pageNumber} heading and paragraph area`,
        language: "english",
        fontFamily: "Geist, sans-serif",
        fontSizePt: 18,
        color: "#1f2937",
        align: "start",
      },
      {
        id: `page-${pageNumber}-image`,
        type: "image",
        xMm: printableArea.xMm + inset,
        yMm: imageTop,
        widthMm: contentWidth,
        heightMm: imageHeight,
        alt: "Image placeholder",
        fit: "contain",
      },
      {
        id: `page-${pageNumber}-body`,
        type: "text",
        xMm: printableArea.xMm + inset,
        yMm: imageTop + imageHeight + inset * 1.2,
        widthMm: contentWidth,
        heightMm: Math.max(
          printableArea.heightMm - imageHeight - headingHeight - inset * 4.5,
          30,
        ),
        content:
          "Body copy area reserved for future Bengali, English, and Arabic text input.",
        language: "english",
        fontFamily: "Geist, sans-serif",
        fontSizePt: 12,
        color: "#475569",
        align: "start",
      },
    ],
  };
}

function clampValue(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
