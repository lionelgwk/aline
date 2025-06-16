import TurndownService from "turndown";
import { ContentItem } from "../types";

export class ContentProcessor {
  private turndownService: TurndownService;

  constructor() {
    this.turndownService = new TurndownService({
      headingStyle: "atx",
      bulletListMarker: "-",
      codeBlockStyle: "fenced",
    });

    this.addCustomSpacingRules();
  }

  private addCustomSpacingRules() {
    this.turndownService.addRule("customListItem", {
      filter: "li",
      replacement: function (content: string, node: any) {
        return "- " + content.trim() + "\n"; // Each item on new line
      },
    });

    // Rule for unordered lists
    this.turndownService.addRule("customUnorderedList", {
      filter: "ul",
      replacement: function (content: string) {
        const result = "\n\n" + content.trim() + "\n\n";
        return result;
      },
    });

    this.turndownService.addRule("customHeadings", {
      filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
      replacement: function (content: string, node: any) {
        const level = parseInt(node.nodeName.charAt(1));
        const hashes = "#".repeat(level);
        const result = "\n\n" + hashes + " " + content.trim() + "\n\n";
        return result;
      },
    });

    this.turndownService.addRule("customParagraph", {
      filter: "p",
      replacement: function (content: string) {
        const result = "\n\n" + content.trim() + "\n\n";
        return result;
      },
    });

    // Rule for recording cards
    this.turndownService.addRule("recordingCards", {
      filter: function (node: any) {
        const className = node.getAttribute("class") || "";
        return className.includes("recording-card");
      },
      replacement: function (content: string, node: any) {
        // Just clean up the content and add proper spacing
        const cleanContent = content
          .replace(/\s+/g, " ") // Normalize whitespace
          .trim();

        return "\n\n" + cleanContent + "\n\n---\n\n"; // Add separator between cards
      },
    });
  }

  processContent(html: string): string {
    // Convert HTML to Markdown
    return this.turndownService.turndown(html);
  }

  validateContentItem(item: ContentItem): boolean {
    return !!(
      item.title &&
      item.content &&
      item.content.length > 100 && // Minimum content length
      item.content_type &&
      item.author
    );
  }
}
