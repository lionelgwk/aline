import fs from "fs";
import path from "path";

export class DebugSaver {
  private baseDir: string;

  constructor(subdir: string = "temp") {
    this.baseDir = path.resolve(__dirname, "../../", subdir);
    this.ensureDirExists();
  }

  private ensureDirExists() {
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  save(content: string, filename: string) {
    const filePath = path.join(this.baseDir, filename);
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`[DebugSaver] Saved to: ${filePath}`);
  }
}
