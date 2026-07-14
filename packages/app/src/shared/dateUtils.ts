export function formatDate(d: Date | undefined): string {
  if (!d) {
    return '';
  }
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

export function parseDate(text: string): Date | null {
  const t = text.trim();
  if (!t) {
    return null;
  }
  if (!/^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{1,2}-\d{1,2})$/.test(t)) {
    return null;
  }
  const d = t.includes('-') ? new Date(t + 'T12:00:00') : new Date(t);
  return isNaN(d.getTime()) ? null : d;
}

export const shortDate = (d?: Date) => (d ? `${d.getMonth() + 1}/${d.getDate()}` : '');
