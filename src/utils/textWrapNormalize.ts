export function repairMidWordBreaks(text: string): string {
  return text
    .replace(/([A-Za-z])\s*<br\s*\/?>\s*([A-Za-z])/g, '$1$2')
    .replace(/([A-Za-z])\r?\n\s*([A-Za-z])/g, '$1$2');
}

export function normalizeParagraphText(text: string): string {
  return repairMidWordBreaks(text).replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
