interface DateChunk {
  start: string;
  end: string;
}

export function splitDates(since: string, until: string): DateChunk[] {
  const chunks: DateChunk[] = [];
  const [sYear, sMonth, sDay] = since.split('-').map(Number);
  const [uYear, uMonth, uDay] = until.split('-').map(Number);
  let start = new Date(sYear!, sMonth! - 1, sDay!);
  const endLimit = new Date(uYear!, uMonth! - 1, uDay!);

  while (start <= endLimit) {
    const endOfMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    const chunkEnd = endOfMonth > endLimit ? endLimit : endOfMonth;
    chunks.push({ start: formatDate(start), end: formatDate(chunkEnd) });
    start = new Date(chunkEnd.getFullYear(), chunkEnd.getMonth(), chunkEnd.getDate() + 1);
  }
  return chunks;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
