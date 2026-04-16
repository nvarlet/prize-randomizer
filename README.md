# IFYS Prize Randomiser

A small web app for drawing winners from a participant spreadsheet. Built for clear, professional use in meetings or events.

## Features

- Import **.xlsx**, **.xls**, or **.csv** (drag-and-drop or file picker)
- Download a ready-made **template** with the expected columns
- Random draw with a scroll animation; optional **fullscreen** for projection
- **Duplicate** rows removed automatically (matched on name + email)
- Optional exclusion of previous winners from later draws
- Light sound feedback and a subtle **confetti** moment on selection

## Requirements

- **Node.js** 18 or newer (LTS recommended)

## Getting started

```bash
git clone https://github.com/nvarlet/prize-randomizer.git
cd prize-randomizer
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview
```

Output is written to `dist/`. The app is a static SPA and can be hosted on any static host (for example **Vercel**) with the default Vite build output.

## Spreadsheet format

Use a header row with at least:

| Name | Email |
|------|--------|

**Name** is required. **Email** is optional but recommended for duplicate detection.

## Tech stack

React, TypeScript, Vite, SheetJS (`xlsx`), `canvas-confetti`, Lucide icons.
