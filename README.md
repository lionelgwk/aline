# 🛠️ Save Aline Scraper

This scraper is a rule-based and PDF-compatible content scraper designed to extract structured text (like blog articles or book chapters) into JSON format. Built with Node.js and TypeScript.

## 📦 Installation

```bash
npm run install
```

This command installs all dependencies needed to run the app.

## 🚀 Usage

Start the application with:

```bash
npm start
```

## 🧠 Features

- ✅ Rule-based HTML scraping (e.g. blogs, content sites)
- ✅ PDF chapter parsing and cleanup
- ✅ Google Drive PDF link support
- ✅ Modular config system
- ✅ Safe temp file cleanup

## 📁 Project Structure

```
src/
├── config/
|    ├── pdf/ # PDF-specific scraping configs
|       ├── btcti.config.ts # specifically for Beyond Cracking The Coding Interview's PDF
|       ├── generic.config.ts # generic PDF
|    ├── web/ # Web-specific scraping configs
|       ├── # Your different web scraping configs go here
|    ├── spa/ # SPA-specific scraping configs
|       ├── QuillBlog.config.ts # Quill Blog's configs
|       ├── # Your different SPA scraping rules go here
|    ├── scraper-configs.ts # Configs for all the different scrapers
├── scrapers/ # PDF and rule-based scraping logic
├── services/ # Integrated content scraper service
├── types/ # TypeScript interfaces and types
├── utils/ # Logger, config manager, debug tools
└── index.ts # Entry point
```
