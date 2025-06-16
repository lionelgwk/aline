export const CommonProcessors = {
  // Author name processors
  getInterviewingIOBlogAuthor: (rawText: string): string => {
    // NOTE: Follows this pattern: "By John Doe | Published..." -> "John Doe"
    const match = rawText.match(/^By\s+(.+?)\s+\|/);
    return match ? match[1].trim() : rawText.trim();
  },

  getQuillBlogAuthorName(rawText: string): string {
    if (!rawText) return "";

    // Split on the dot (·) and take the first part
    const parts = rawText.split("·");
    if (parts.length > 0) {
      return parts[0].trim();
    }

    // If no separators found, return cleaned text 
    return rawText.trim();
  },

  removeInterviewingIONestedNav: (rawHtml: string): string => {
    // Remove nav tag
    return rawHtml.replace(/<nav\b[^>]*>.*?<\/nav>/gis, "");
  },

  cleanInterviewingIOContent: (rawText: string): string => {
    return rawText
      .replace(/\n\s*\n\s*\n/g, "\n\n") // Remove excessive newlines
      .replace(/^\s*Share this post\s*$/gm, "") // Remove "Share this post"
      .replace(/^\s*Tags?:.*$/gm, "") // Remove tag lines
      .trim();
  },

  // Date processors
  extractDateFromText: (rawText: string): string => {
    const dateMatch = rawText.match(
      /\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}/i
    );
    return dateMatch ? dateMatch[0] : "";
  },
};
