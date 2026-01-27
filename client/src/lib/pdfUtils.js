/**
 * Client-side PDF text extraction using pdfjs-dist.
 * Used for work order parsing before auto-fill.
 */

import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;
  } catch (error) {
    console.error('Failed to set PDF.js worker:', error);
    // Fallback to CDN worker if local worker fails
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
  }
}

/** Max pages to extract from start (header / vendor / site). */
const MAX_HEADER_PAGES = 10;
/** Max pages to extract from end (total value, signatures). */
const MAX_TAIL_PAGES = 5;

/**
 * Extract raw text from a PDF file.
 * Uses first N pages (header) + last M pages (totals) to cover variable layouts.
 * @param {File} file - PDF file
 * @param {object} opts - { maxHeaderPages, maxTailPages, fullDocument }
 * @returns {Promise<string>} Concatenated text from processed pages
 */
export async function extractTextFromPdf(file, opts = {}) {
  const fullDocument = opts.fullDocument === true;
  const maxHeader = opts.maxHeaderPages ?? MAX_HEADER_PAGES;
  const maxTail = opts.maxTailPages ?? MAX_TAIL_PAGES;

  try {
    const bytes = await file.arrayBuffer();
    
    // Configure PDF.js with error handling
    const loadingTask = pdfjsLib.getDocument({ 
      data: bytes,
      verbosity: 0,
      isEvalSupported: false,
    });
    
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    if (numPages === 0) {
      throw new Error('PDF has no pages');
    }

    const pageIndices = new Set();
    if (fullDocument) {
      const cap = typeof opts.maxPages === 'number' ? opts.maxPages : 150;
      for (let i = 1; i <= Math.min(numPages, cap); i++) pageIndices.add(i);
    } else {
      for (let i = 1; i <= Math.min(numPages, maxHeader); i++) pageIndices.add(i);
      for (let i = Math.max(1, numPages - maxTail + 1); i <= numPages; i++) pageIndices.add(i);
    }

    const preserveLines = opts.preserveLines === true;
    const chunks = [];
    
    for (const i of [...pageIndices].sort((a, b) => a - b)) {
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        
        if (preserveLines) {
          const byLine = new Map();
          for (const item of content.items) {
            if (!item || typeof item.str !== 'string') continue;
            const t = item.transform;
            const y = t && t[5] != null ? Number(t[5]) : 0;
            const x = t && t[4] != null ? Number(t[4]) : 0;
            const k = Math.round(y * 50) / 50;
            if (!byLine.has(k)) byLine.set(k, []);
            byLine.get(k).push({ x, str: item.str });
          }
          const lines = [...byLine.entries()]
            .sort((a, b) => b[0] - a[0])
            .map(([, pts]) => pts.sort((a, b) => a.x - b.x).map((p) => p.str).join(' ').trim());
          chunks.push(lines.filter(Boolean).join('\n'));
        } else {
          const strings = content.items.map((it) => it.str ?? '').filter(Boolean);
          chunks.push(strings.join(' '));
        }
      } catch (error) {
        console.warn(`Failed to extract text from page ${i}:`, error);
        // Continue with other pages
        chunks.push('');
      }
    }

    const result = chunks.join('\n');
    if (!result || result.trim().length === 0) {
      console.warn('No text extracted from PDF - PDF might be image-based or scanned');
    }
    
    return result;
  } catch (error) {
    console.error('PDF text extraction error:', error);
    throw new Error(`Failed to extract text from PDF: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Extract a single PDF page as an image (canvas -> data URL).
 * @param {object} page - PDF.js page object
 * @param {number} scale - Scale factor for rendering (default: 2 for better quality)
 * @returns {Promise<string>} Data URL of the rendered page
 */
async function extractPageAsImage(page, scale = 2) {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({
    canvasContext: context,
    viewport: viewport,
  }).promise;

  return canvas.toDataURL('image/png');
}

/**
 * Extract all pages from a PDF as images.
 * @param {File} file - PDF file
 * @param {object} opts - { scale, maxPages, pageRange }
 * @returns {Promise<Array<{ pageNumber: number, imageDataUrl: string, width: number, height: number }>>}
 */
export async function extractImagesFromPdf(file, opts = {}) {
  const scale = opts.scale ?? 2; // Higher scale = better quality
  const maxPages = opts.maxPages ?? 150;
  const pageRange = opts.pageRange; // e.g., { start: 1, end: 10 }

  try {
    const bytes = await file.arrayBuffer();
    
    // Configure PDF.js with error handling
    const loadingTask = pdfjsLib.getDocument({ 
      data: bytes,
      verbosity: 0, // Suppress warnings
      isEvalSupported: false, // Security: disable eval
    });
    
    const doc = await loadingTask.promise;
    const numPages = doc.numPages;

    if (numPages === 0) {
      throw new Error('PDF has no pages');
    }

    const images = [];
    let startPage = 1;
    let endPage = numPages;

    if (pageRange) {
      startPage = Math.max(1, pageRange.start ?? 1);
      endPage = Math.min(numPages, pageRange.end ?? numPages);
    } else {
      endPage = Math.min(numPages, maxPages);
    }

    for (let i = startPage; i <= endPage; i++) {
      try {
        const page = await doc.getPage(i);
        const viewport = page.getViewport({ scale });
        
        // Create canvas with proper error handling
        const canvas = document.createElement('canvas');
        if (!canvas || !canvas.getContext) {
          throw new Error('Canvas not supported');
        }
        
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('2D context not available');
        }
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Render page with timeout
        await Promise.race([
          page.render({
            canvasContext: context,
            viewport: viewport,
          }).promise,
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Page render timeout')), 30000)
          )
        ]);

        const imageDataUrl = canvas.toDataURL('image/png');
        
        if (!imageDataUrl || imageDataUrl === 'data:,') {
          console.warn(`Page ${i} produced empty image`);
          continue;
        }
        
        images.push({
          pageNumber: i,
          imageDataUrl,
          width: viewport.width,
          height: viewport.height,
        });
      } catch (error) {
        console.warn(`Failed to extract page ${i}:`, error);
        // Continue with other pages even if one fails
      }
    }

    if (images.length === 0) {
      throw new Error('No pages could be extracted as images');
    }

    return images;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error(`Failed to extract PDF: ${error.message || 'Unknown error'}`);
  }
}
