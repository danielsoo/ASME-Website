export function repairMidWordBreaks(text: string): string {
  const cleaned = text
    // Remove invisible break characters that can split words.
    .replace(/[\u00ad\u200b\u200c\u200d\u2060\ufeff]/g, '');

  return cleaned
    .replace(/([A-Za-z])\s*<br\s*\/?>\s*([A-Za-z])/gi, '$1$2')
    // Join words split by line separators/newlines.
    .replace(/([A-Za-z])[\r\n\u2028\u2029]+\s*([A-Za-z])/g, '$1$2')
    // Join words split by tabs between letters.
    .replace(/([A-Za-z])\t+\s*([A-Za-z])/g, '$1$2');
}

export function normalizeParagraphText(text: string): string {
  return repairMidWordBreaks(text).replace(/\r?\n+/g, ' ').replace(/\s{2,}/g, ' ').trim();
}
