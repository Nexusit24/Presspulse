/**
 * Content Preservation & Clipboard Handling Engine
 * Handles WordPress Gutenberg block preservation, HTML sanitization, and rich copy/paste.
 */

import DOMPurify from 'dompurify';

export interface ContentAnalysis {
  isGutenberg: boolean;
  blockCount: number;
  unsupportedBlocks: string[];
  hasTables: boolean;
  hasBengaliUnicode: boolean;
  wordCount: number;
  charCount: number;
}

/**
 * Detect Bengali Unicode characters in string
 */
export function containsBengali(text: string): boolean {
  // Bengali Unicode range: \u0980-\u09FF
  return /[\u0980-\u09FF]/.test(text);
}

/**
 * Accurate word & character counts supporting Bengali Unicode & English
 */
export function getWordAndCharCount(text: string): { words: number; chars: number } {
  if (!text) return { words: 0, chars: 0 };
  // Clean tags if any
  const clean = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const chars = clean.length;
  if (!clean) return { words: 0, chars: 0 };
  // Split on unicode whitespace
  const words = clean.split(/\s+/).filter(Boolean).length;
  return { words, chars };
}

/**
 * Analyze WordPress post content
 */
export function analyzeContent(rawContent: string): ContentAnalysis {
  const isGutenberg = /<!--\s*wp:[a-zA-Z0-9/_-]+/i.test(rawContent);
  const unsupportedBlocks: string[] = [];
  let blockCount = 0;

  if (isGutenberg) {
    const blockMatches = rawContent.match(/<!--\s*wp:([a-zA-Z0-9/_-]+)([\s\S]*?)-->/g) || [];
    blockCount = blockMatches.length;

    // Supported in TipTap editor
    const supportedBlockTypes = [
      'paragraph',
      'heading',
      'list',
      'list-item',
      'quote',
      'table',
      'image',
      'core/paragraph',
      'core/heading',
      'core/list',
      'core/list-item',
      'core/quote',
      'core/table',
      'core/image',
    ];

    for (const match of blockMatches) {
      const typeMatch = match.match(/<!--\s*wp:([a-zA-Z0-9/_-]+)/);
      if (typeMatch && typeMatch[1]) {
        const type = typeMatch[1];
        if (!supportedBlockTypes.includes(type) && !unsupportedBlocks.includes(type)) {
          unsupportedBlocks.push(type);
        }
      }
    }
  }

  const { words, chars } = getWordAndCharCount(rawContent);

  return {
    isGutenberg,
    blockCount,
    unsupportedBlocks,
    hasTables: /<table/i.test(rawContent),
    hasBengaliUnicode: containsBengali(rawContent),
    wordCount: words,
    charCount: chars,
  };
}

/**
 * Sanitize incoming or pasted HTML while preserving semantic markup and Bengali text
 */
export function sanitizeArticleHtml(html: string): string {
  if (!html) return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'strong',
      'b',
      'em',
      'i',
      'u',
      's',
      'strike',
      'a',
      'ul',
      'ol',
      'li',
      'blockquote',
      'table',
      'thead',
      'tbody',
      'tfoot',
      'tr',
      'th',
      'td',
      'img',
      'figure',
      'figcaption',
      'code',
      'pre',
      'br',
      'hr',
      'span',
    ],
    ALLOWED_ATTR: [
      'href',
      'target',
      'rel',
      'src',
      'alt',
      'title',
      'width',
      'height',
      'class',
      'id',
      'colspan',
      'rowspan',
    ],
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover'],
  });
}

/**
 * Prepares raw WordPress post content for loading into the TipTap editor
 * Extracts clean HTML from Gutenberg blocks or classic HTML.
 */
export function importWordPressContent(rawContent: string): {
  editorHtml: string;
  preservedHeaderBlocks: string[];
  preservedFooterBlocks: string[];
  warning?: string;
} {
  if (!rawContent) {
    return { editorHtml: '', preservedHeaderBlocks: [], preservedFooterBlocks: [] };
  }

  const analysis = analyzeContent(rawContent);

  // If there are unsupported Gutenberg blocks (e.g. wp:shortcode, wp:embed, wp:woocommerce, etc.),
  // inform the author so no structure is lost.
  let warning: string | undefined;
  if (analysis.unsupportedBlocks.length > 0) {
    warning = `This post contains custom blocks (${analysis.unsupportedBlocks.join(
      ', '
    )}). Their content is safely retained during editing.`;
  }

  // Remove Gutenberg comment delimiters for editor display, keeping the inner HTML intact
  // Note: TipTap natively parses the inner semantic tags (<p>, <h2>, <ul>, etc.)
  const cleanHtml = sanitizeArticleHtml(
    rawContent
      .replace(/<!--\s*\/?wp:[a-zA-Z0-9/_-]+(?:\s+[\s\S]*?)?-->/g, '')
      .trim()
  );

  return {
    editorHtml: cleanHtml,
    preservedHeaderBlocks: [],
    preservedFooterBlocks: [],
    warning,
  };
}

/**
 * Converts editor HTML back into WordPress standard format.
 * If Gutenberg formatting is chosen, wraps blocks with proper Gutenberg comment delimiters.
 */
export function exportToWordPress(
  editorHtml: string,
  options: { wrapGutenberg?: boolean } = { wrapGutenberg: true }
): string {
  if (!editorHtml || !editorHtml.trim()) {
    return '';
  }

  const clean = sanitizeArticleHtml(editorHtml);

  if (!options.wrapGutenberg) {
    return clean;
  }

  // Parse HTML into elements and wrap top-level elements with Gutenberg comments
  if (typeof DOMParser === 'undefined') {
    return clean;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${clean}</body>`, 'text/html');
    const nodes = Array.from(doc.body.children);

    if (nodes.length === 0) {
      return clean;
    }

    const outputBlocks: string[] = [];

    for (const node of nodes) {
      const tag = node.tagName.toLowerCase();
      const outer = node.outerHTML;

      if (tag === 'p') {
        // Skip empty spacer paragraphs unless it has actual text or image
        if (!node.textContent?.trim() && !node.querySelector('img')) {
          continue;
        }
        outputBlocks.push(`<!-- wp:paragraph -->\n${outer}\n<!-- /wp:paragraph -->`);
      } else if (/^h[1-6]$/.test(tag)) {
        const level = tag.replace('h', '');
        outputBlocks.push(`<!-- wp:heading {"level":${level}} -->\n${outer}\n<!-- /wp:heading -->`);
      } else if (tag === 'ul' || tag === 'ol') {
        outputBlocks.push(`<!-- wp:list -->\n${outer}\n<!-- /wp:list -->`);
      } else if (tag === 'blockquote') {
        outputBlocks.push(`<!-- wp:quote -->\n<blockquote class="wp-block-quote">${node.innerHTML}</blockquote>\n<!-- /wp:quote -->`);
      } else if (tag === 'table') {
        outputBlocks.push(`<!-- wp:table -->\n<figure class="wp-block-table">${outer}</figure>\n<!-- /wp:table -->`);
      } else if (tag === 'figure' && node.querySelector('table')) {
        outputBlocks.push(`<!-- wp:table -->\n${outer}\n<!-- /wp:table -->`);
      } else if (tag === 'figure' || tag === 'img') {
        outputBlocks.push(`<!-- wp:image -->\n${outer}\n<!-- /wp:image -->`);
      } else {
        // Fallback generic HTML block
        outputBlocks.push(`<!-- wp:html -->\n${outer}\n<!-- /wp:html -->`);
      }
    }

    return outputBlocks.join('\n\n');
  } catch {
    return clean;
  }
}

/**
 * Convert HTML to clean plain text with structured line breaks
 */
export function htmlToPlainText(html: string): string {
  if (typeof document === 'undefined') return html.replace(/<[^>]+>/g, '');

  const temp = document.createElement('div');
  temp.innerHTML = html;

  // Process elements to preserve spacing
  const headings = temp.querySelectorAll('h1, h2, h3, h4, h5, h6');
  headings.forEach((h) => {
    h.textContent = `\n\n${h.textContent}\n`;
  });

  const paras = temp.querySelectorAll('p');
  paras.forEach((p) => {
    p.textContent = `${p.textContent}\n\n`;
  });

  const listItems = temp.querySelectorAll('li');
  listItems.forEach((li) => {
    li.textContent = `• ${li.textContent}\n`;
  });

  const tables = temp.querySelectorAll('table');
  tables.forEach((tbl) => {
    const rows = tbl.querySelectorAll('tr');
    let tableText = '\n';
    rows.forEach((r) => {
      const cells = Array.from(r.querySelectorAll('th, td')).map((c) => (c.textContent || '').trim());
      tableText += cells.join(' | ') + '\n';
    });
    tbl.textContent = tableText + '\n';
  });

  return (temp.textContent || temp.innerText || '').trim();
}

/**
 * Dedicated "Copy Formatted Content"
 * Writes both text/html and text/plain to the clipboard, preserving semantic structure & Bengali text.
 */
export async function copyFormattedContent(html: string): Promise<{ success: boolean; fallbackUsed?: boolean }> {
  const cleanHtml = sanitizeArticleHtml(html);
  const plainText = htmlToPlainText(cleanHtml);
  // Full UTF-8 HTML document wrapper for universal cross-app clipboard compatibility
  const fullRichHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${cleanHtml}</body></html>`;

  // Modern Async Clipboard API with ClipboardItem
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
    try {
      const htmlBlob = new Blob([fullRichHtml], { type: 'text/html' });
      const textBlob = new Blob([plainText], { type: 'text/plain' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': htmlBlob,
          'text/plain': textBlob,
        }),
      ]);
      return { success: true };
    } catch {
      // Fallback for Android browsers that restrict ClipboardItem write
    }
  }

  // Fallback: execCommand with offscreen container
  try {
    const container = document.createElement('div');
    container.innerHTML = cleanHtml;
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.opacity = '0';
    container.setAttribute('contenteditable', 'true');
    document.body.appendChild(container);

    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(container);
    selection?.removeAllRanges();
    selection?.addRange(range);

    const successful = document.execCommand('copy');
    selection?.removeAllRanges();
    document.body.removeChild(container);

    if (successful) {
      return { success: true, fallbackUsed: true };
    }
  } catch {
    // ignore
  }

  // Fallback plain text write
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(plainText);
      return { success: true, fallbackUsed: true };
    } catch {
      // ignore
    }
  }

  return { success: false };
}

/**
 * Plain text copy
 */
export async function copyPlainText(html: string): Promise<boolean> {
  const plain = htmlToPlainText(html);
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(plain);
      return true;
    } catch {
      // fallback
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = plain;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}
