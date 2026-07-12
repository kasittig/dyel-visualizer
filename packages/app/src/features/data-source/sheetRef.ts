export interface SheetRef {
  id: string;
  published: boolean;
}

export const EXAMPLE_CSV_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-1vRPu7N-kHeJeUVhjbL0Q9xDLXEPeC3GsvnAE4HXj2-q9pIjM25BxUwUVxHYqxVR-9uQvW9MKM4l9xNI/pub?gid=1297658251&single=true&output=csv';
export const EXAMPLE_SHEET_URL =
  'https://docs.google.com/spreadsheets/d/1Uwfzrb4wjYcBisTPdNEUGJyvfKRLwpN0tm8ciRPHB0c/edit?gid=1297658251#gid=1297658251';
export const EXAMPLE_VISUALIZER_URL = `?sheet=${encodeURIComponent(EXAMPLE_CSV_URL)}`;

export function extractSheetRef(input: string): SheetRef | null {
  // Published web URL: .../d/e/PUBLISHED_ID/pubhtml (may have /u/N/ before /d/)
  const publishedMatch = input.match(/\/d\/e\/([a-zA-Z0-9_-]+)/);
  if (publishedMatch) {
    return { id: publishedMatch[1], published: true };
  }
  // Edit/view URL: .../d/SHEET_ID/
  const regularMatch = input.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (regularMatch) {
    return { id: regularMatch[1], published: false };
  }
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(input.trim())) {
    return { id: input.trim(), published: false };
  }
  return null;
}
