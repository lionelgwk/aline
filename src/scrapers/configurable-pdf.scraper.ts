import * as fs from "fs-extra";
import * as path from "path";
import pdf from "pdf-parse";
import axios from "axios";
import { ContentItem } from "../types";
import { Logger } from "../utils";

export class ConfigurablePDFScraper {
  private config: any;
  private customConfig: any;
  private tempDir = path.join(process.cwd(), "temp", "pdfs");

  constructor(config: any, customConfig?: any) {
    this.config = config;
    this.customConfig = customConfig || {};
    fs.ensureDirSync(this.tempDir);
  }

  async scrape(url: string, userId: string = ""): Promise<ContentItem[]> {
    Logger.info(
      `[ConfigurablePDFScraper] Processing PDF with configuration rules: ${url}`
    );

    try {
      let dataBuffer: Buffer;
      let downloadedFilePath: string | null = null;

      if (url.startsWith("http")) {
        downloadedFilePath = await this.secureDownload(url);
        dataBuffer = await fs.readFile(downloadedFilePath);
      } else {
        const fileExists = await fs.pathExists(url);
        if (!fileExists) throw new Error(`PDF file not found: ${url}`);
        dataBuffer = await fs.readFile(url);
      }

      const data = await pdf(dataBuffer);
      Logger.info(
        `[ConfigurablePDFScraper] PDF parsed. Pages: ${data.numpages}, Text length: ${data.text.length}`
      );

      const fileName = downloadedFilePath
        ? path.basename(downloadedFilePath)
        : path.basename(url);

      // Use config-based chapter splitting if available, otherwise use basic approach
      const chapters = this.config.pdfRules
        ? this.splitIntoChaptersWithConfig(data.text, fileName)
        : this.basicSplit(data.text, fileName);

      const items = chapters
        .map((chapter, index) => ({
          title: chapter.title || `Chapter ${index + 1}`,
          content: this.cleanContentWithConfig(chapter.content),
          content_type: this.config.behavior?.contentType || "book",
          source_url: url,
          author: "",
          user_id: userId,
        }))
        .filter((item) => this.validateItemWithConfig(item));

      if (downloadedFilePath) await this.cleanup([downloadedFilePath]);
      return items;
    } catch (error) {
      Logger.error(
        `[ConfigurablePDFScraper] Failed to process PDF: ${url}`,
        error
      );
      return [];
    }
  }

  private splitIntoChaptersWithConfig(
    text: string,
    fileName: string
  ): Array<{ title: string; content: string }> {
    if (!this.config.pdfRules) {
      return this.basicSplit(text, fileName);
    }

    const lines = text.split("\n");
    const tocEnd = this.findTableOfContentsEnd(lines);
    const contentLines = lines.slice(tocEnd);

    const chapterAnchors: { index: number; title: string }[] = [];

    for (let i = 0; i < contentLines.length; i++) {
      const line = contentLines[i].trim();
      if (this.config.pdfRules.chapterPattern.test(line)) {
        const globalIndex = tocEnd + i;
        const title = this.extractChapterTitle(lines, globalIndex);
        chapterAnchors.push({ index: globalIndex, title });
      }
    }

    if (chapterAnchors.length === 0) {
      return [{ title: fileName.replace(".pdf", ""), content: text }];
    }

    const chapters: Array<{ title: string; content: string }> = [];

    for (let i = 0; i < chapterAnchors.length; i++) {
      const start = chapterAnchors[i].index;
      const end =
        i + 1 < chapterAnchors.length
          ? chapterAnchors[i + 1].index
          : lines.length;
      const chapterContent = lines.slice(start, end).join("\n").trim();

      if (chapterContent.length > 100) {
        chapters.push({
          title: chapterAnchors[i].title,
          content: chapterContent,
        });
      }
    }

    return chapters;
  }

  private basicSplit(
    text: string,
    fileName: string
  ): Array<{ title: string; content: string }> {
    // Simple fallback - just return the whole document
    return [{ title: fileName.replace(".pdf", ""), content: text }];
  }

  private findTableOfContentsEnd(lines: string[]): number {
    if (!this.config.pdfRules?.tableOfContentsIndicators) {
      // Default indicators
      const indicators = [
        /^ugly\s+truths/i,
        /^chapter\s+\d+/i,
        /^job\s+searches/i,
      ];

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (indicators.some((r) => r.test(line))) {
          return Math.max(0, i - 2);
        }
      }
      return 50;
    }

    // Use config indicators
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (
        this.config.pdfRules.tableOfContentsIndicators.some((r: RegExp) =>
          r.test(line)
        )
      ) {
        return Math.max(0, i - 2);
      }
    }
    return 50;
  }

  private extractChapterTitle(lines: string[], index: number): string {
    const baseLine = lines[index].trim();
    const lookAhead =
      this.config.pdfRules?.chapterTitleExtraction?.lookAheadLines || 3;
    const minLength =
      this.config.pdfRules?.chapterTitleExtraction?.minTitleLength || 5;
    const maxLength =
      this.config.pdfRules?.chapterTitleExtraction?.maxTitleLength || 120;

    for (let i = 1; i <= lookAhead; i++) {
      const nextLine = lines[index + i];
      if (
        nextLine &&
        nextLine.trim().length >= minLength &&
        nextLine.trim().length <= maxLength
      ) {
        return `${baseLine} - ${nextLine.trim()}`;
      }
    }
    return baseLine;
  }

  private cleanContentWithConfig(content: string): string {
    let cleanedContent = content;

    // Apply PDF-specific cleaning patterns from config
    if (this.config.pdfRules?.cleanReplacePatterns) {
      this.config.pdfRules.cleanReplacePatterns.forEach((rule: any) => {
        cleanedContent = cleanedContent.replace(rule.pattern, rule.replacement);
      });
    }

    // Apply ignore patterns (remove matching text)
    if (this.config.pdfRules?.ignorePatterns) {
      this.config.pdfRules.ignorePatterns.forEach((pattern: RegExp) => {
        cleanedContent = cleanedContent.replace(pattern, "");
      });
    }

    // Apply general processing cleanup rules
    if (this.config.processing?.cleanupRules?.replacePatterns) {
      this.config.processing.cleanupRules.replacePatterns.forEach(
        (rule: any) => {
          cleanedContent = cleanedContent.replace(
            rule.pattern,
            rule.replacement
          );
        }
      );
    }

    // Default cleaning if no config
    if (!this.config.pdfRules) {
      cleanedContent = cleanedContent
        .replace(/\f/g, "\n")
        .replace(/\r\n|\r/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .replace(/^\s+|\s+$/gm, "")
        .replace(/\s+/g, " ")
        .trim();
    }

    return cleanedContent;
  }

  private validateItemWithConfig(item: ContentItem): boolean {
    // Check minimum word count from PDF rules
    if (this.config.pdfRules?.minWordCount) {
      const wordCount = item.content.split(/\s+/).length;
      if (wordCount < this.config.pdfRules.minWordCount) {
        Logger.warn(
          `[ConfigurablePDFScraper] Item "${item.title}" below minimum word count: ${wordCount} < ${this.config.pdfRules.minWordCount}`
        );
        return false;
      }
    }

    // Check minimum content length from general processing rules
    if (
      this.config.processing?.minContentLength &&
      item.content.length < this.config.processing.minContentLength
    ) {
      Logger.warn(
        `[ConfigurablePDFScraper] Item "${item.title}" below minimum content length: ${item.content.length} < ${this.config.processing.minContentLength}`
      );
      return false;
    }

    // Default validation (10 words) if no config
    if (!this.config.pdfRules && !this.config.processing) {
      const wordCount = item.content.split(/\s+/).length;
      if (wordCount < 10) {
        Logger.warn(
          `[ConfigurablePDFScraper] Item "${item.title}" below default word count: ${wordCount} < 10`
        );
        return false;
      }
    }

    return true;
  }

  // Download and file handling methods (same as original PDFScraper)
  private async secureDownload(url: string): Promise<string> {
    const downloadUrl = this.convertToDirectDownloadUrl(url);
    const fileId = this.extractFileId(url);
    const fileName = `temp_${fileId}_${Date.now()}.pdf`;
    const filePath = path.join(this.tempDir, fileName);

    const response = await axios.get(downloadUrl, {
      responseType: "stream",
      headers: { "User-Agent": "Mozilla/5.0" },
      timeout: 60000,
    });

    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    await new Promise((res, rej) => {
      writer.on("finish", () => res(true));
      writer.on("error", rej);
    });

    await this.verifyPDFFile(filePath);
    return filePath;
  }

  private convertToDirectDownloadUrl(url: string): string {
    const fileId = this.extractFileId(url);
    return `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
  }

  private extractFileId(url: string): string {
    const match1 = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (match1) return match1[1];
    const match2 = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (match2) return match2[1];
    throw new Error(`Cannot extract file ID from URL: ${url}`);
  }

  private async verifyPDFFile(filePath: string): Promise<void> {
    const buffer = Buffer.alloc(5);
    const fd = await fs.open(filePath, "r");
    try {
      await fs.read(fd, buffer, 0, 5, 0);
      const header = buffer.toString("ascii");
      if (!header.startsWith("%PDF-"))
        throw new Error("File is not a valid PDF");
      const full = await fs.readFile(filePath);
      await pdf(full);
    } finally {
      await fs.close(fd);
    }
  }

  private async cleanup(filePaths: string[]): Promise<void> {
    for (const filePath of filePaths) {
      try {
        if (fs.existsSync(filePath)) {
          await fs.remove(filePath);
        }
      } catch (error) {
        Logger.warn(
          `[ConfigurablePDFScraper] Failed to delete ${filePath}`,
          error
        );
      }
    }
  }
}
