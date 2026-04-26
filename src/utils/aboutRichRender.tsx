import React from 'react';
import type { AboutContent, DesignTeamContent } from '../types';
import { sanitizeHtml, isHtmlString } from './sanitizeHtml';
import { repairMidWordBreaks, normalizeParagraphText } from './textWrapNormalize';

/** Render paragraph: HTML (rich editor) or plain text with optional "visit this link". */
export function renderAboutParagraph(content: string | undefined, linkUrl?: string): React.ReactNode {
  const c = content ?? '';
  const normalized = normalizeParagraphText(c);
  if (isHtmlString(c)) {
    const repairedHtml = repairMidWordBreaks(c);
    return (
      <div className="about-rich-content about-copy prose prose-p:my-2 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(repairedHtml) }} />
    );
  }
  if (linkUrl && normalized.includes('visit this link')) {
    const parts = normalized.split('visit this link');
    return (
      <>
        {parts[0]}
        <a href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          visit this link
        </a>
        {parts.slice(1).join('visit this link')}
      </>
    );
  }
  return normalized;
}

/** Render title that may be HTML from rich editor. */
export function renderAboutTitle(content: string | undefined, fallback: string): React.ReactNode {
  const c = content ?? fallback;
  if (!c) return fallback;
  if (isHtmlString(c)) {
    return <span className="about-rich-content" dangerouslySetInnerHTML={{ __html: sanitizeHtml(c) }} />;
  }
  return c;
}

/** Design Team intro block — matches public /about/designteam. */
export function renderDesignTeamIntroBlock(
  mergedDesignBlock: Pick<
    DesignTeamContent,
    | 'introParagraph1'
    | 'introParagraph2'
    | 'introParagraph3'
    | 'introParagraph4'
    | 'introLinkUrl'
  >,
  aboutContent: Pick<AboutContent, 'aboutParagraph1' | 'aboutParagraph2' | 'aboutLinkUrl'>
): React.ReactNode {
  if (mergedDesignBlock.introParagraph1 != null && mergedDesignBlock.introParagraph1 !== '') {
    return (
      <>
        <div className="font-jost">
          {isHtmlString(mergedDesignBlock.introParagraph1) ? (
            <div className="about-rich-content prose prose-p:my-2 max-w-none" dangerouslySetInnerHTML={{ __html: sanitizeHtml(mergedDesignBlock.introParagraph1) }} />
          ) : mergedDesignBlock.introParagraph1.includes('85,000 members') ? (
            mergedDesignBlock.introParagraph1.split('85,000 members').reduce<React.ReactNode[]>((acc, part, i, arr) => {
              acc.push(part);
              if (i < arr.length - 1) acc.push(<span key={i} className="text-asme-red font-bold">85,000 members</span>);
              return acc;
            }, [])
          ) : (
            mergedDesignBlock.introParagraph1
          )}
        </div>
        {mergedDesignBlock.introParagraph2 != null && mergedDesignBlock.introParagraph2 !== '' && (
          <div className="font-jost">{renderAboutParagraph(mergedDesignBlock.introParagraph2)}</div>
        )}
        {mergedDesignBlock.introParagraph3 != null && mergedDesignBlock.introParagraph3 !== '' && (
          <div className="font-jost">{renderAboutParagraph(mergedDesignBlock.introParagraph3, mergedDesignBlock.introLinkUrl)}</div>
        )}
        {mergedDesignBlock.introParagraph4 != null && mergedDesignBlock.introParagraph4 !== '' && (
          <div className="font-jost">{renderAboutParagraph(mergedDesignBlock.introParagraph4)}</div>
        )}
      </>
    );
  }
  return (
    <>
      <div className="font-jost">{renderAboutParagraph(aboutContent.aboutParagraph1)}</div>
      <div className="font-jost">{renderAboutParagraph(aboutContent.aboutParagraph2, aboutContent.aboutLinkUrl)}</div>
    </>
  );
}
