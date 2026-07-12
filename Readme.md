# ZyncPDF - Professional PDF Workspace

> **Open-source, privacy-first PDF toolkit for the browser. Edit, annotate, merge, split, compress PDFs entirely in your browser. 100% private, no uploads, completely free.**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-orange.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-purple.svg)](https://vitejs.dev/)
[![PWA](https://img.shields.io/badge/PWA-ready-green.svg)](https://web.dev/progressive-web-apps/)

---

## 🌟 Features

### 🔒 **Privacy-First Architecture**
- **100% Client-Side** - All processing happens in your browser
- **Zero Uploads** - Files never leave your device
- **No Tracking** - No analytics, no cookies, no user accounts
- **Offline-First** - Works completely offline after first load

### 🎨 **Professional PDF Editor**
- **Click-to-Edit Text** - Click any text to edit directly in the PDF
- **Rich Annotations** - Highlight, underline, strikethrough, sticky notes, text boxes
- **Drawing Tools** - Freehand, rectangles, ellipses, lines, arrows
- **Digital Signatures** - Draw, type, or upload signature images
- **Image Insertion** - Add, resize, and reposition images
- **Text Search** - Find and navigate through document text

### 📄 **Document Operations**
- **Merge PDFs** - Combine multiple PDFs with drag-and-drop reordering
- **Split PDFs** - Split by pages, ranges, or extract specific pages
- **Compress PDFs** - Intelligent compression with quality slider
- **Rotate Pages** - Rotate individual pages or entire documents
- **Extract Pages** - Save selected pages as new PDFs
- **Delete/Rearrange Pages** - Visual page management

### 🔄 **Format Conversion**
- **PDF ↔ Images** - PDF to PNG/JPEG, Images to PDF
- **Office to PDF** - Word, Excel, PowerPoint to PDF
- **Text/Markdown/HTML** - Convert to/from PDF
- **Image Conversion** - WebP, SVG, HEIC, JPEG, PNG interconversion

### 🛡️ **Security & Metadata**
- **Password Protection** - Encrypt/decrypt PDFs
- **Metadata Editor** - View/edit title, author, subject, keywords
- **Metadata Removal** - Strip all metadata for privacy
- **Form Flattening** - Lock form fields permanently

### 🎯 **Professional UX**
- **Command Palette** - `⌘K` for instant access to all features
- **Keyboard Shortcuts** - Full keyboard navigation
- **Multi-Tab Editing** - Work on multiple PDFs simultaneously
- **Drag & Drop** - Everywhere - files, pages, thumbnails
- **Dark/Light/System Themes** - Automatic or manual
- **Multi-Language** - Extensible i18n support

---

## 🚀 Quick Start

### Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Deploy to GitHub Pages
```bash
# Build
npm run build

# Deploy dist/ folder to GitHub Pages
# Or use the included GitHub Actions workflow
```

---

## 🏗️ Architecture

```
src/
├── core/                 # Core application logic
│   ├── app.ts           # Main application controller
│   ├── document-manager.ts   # PDF document lifecycle
│   ├── annotation-manager.ts # Annotation system
│   ├── history-manager.ts    # Undo/redo system
│   └── workspace-manager.ts  # Multi-tab workspaces
├── components/          # Reusable UI components
│   ├── toolbar.ts       # Professional toolbar
│   ├── sidebar.ts       # Left sidebar (thumbnails, bookmarks, etc.)
│   ├── panel.ts         # Right panel (properties, styles, layers)
│   ├── tab-bar.ts       # Multi-document tabs
│   ├── modal.ts         # Accessible modals
│   ├── toast.ts         # Toast notifications
│   ├── command-palette.ts  # ⌘K command palette
│   ├── dropdown.ts      # Accessible dropdowns
│   ├── navbar.ts        # Top navigation
│   └── footer.ts        # Footer component
├── pages/               # Page-specific tools
│   ├── merge/           # Merge PDF
│   ├── split/           # Split PDF
│   ├── compress/        # Compress PDF
│   ├── editor/          # PDF Text Editor
│   ├── convert/         # Format converters
│   ├── security/        # Password, metadata
│   └── ...              # Other tools
├── utils/               # Shared utilities
│   ├── event-emitter.ts     # Event system
│   ├── theme-manager.ts     # Dark/light/system themes
│   ├── shortcut-manager.ts  # Keyboard shortcuts
│   ├── uuid.ts              # ID generation
│   └── ...
├── storage/             # Persistence layer
│   └── storage-manager.ts   # IndexedDB/localStorage
├── workers/             # Web Workers
│   └── pdf-worker.ts        # PDF rendering in worker
├── types/               # TypeScript definitions
└── styles/              # Design system
    └── design-system.css    # CSS variables, components
```

---

## 🎨 Design System

### Colors
```css
/* Primary - Indigo */
--accent-primary: #4f46e5;
--accent-primary-hover: #4338ca;

/* Success - Emerald */
--accent-success: #10b981;

/* Warning - Amber */
--accent-warning: #f59e0b;

/* Danger - Rose */
--accent-danger: #f43f5e;
```

### Spacing Scale
```css
--space-1: 0.25rem;  --space-2: 0.5rem;
--space-3: 0.75rem;  --space-4: 1rem;
--space-5: 1.25rem;  --space-6: 1.5rem;
--space-8: 2rem;     --space-10: 2.5rem;
```

### Typography
- **Font**: Inter (variable weight 300-800)
- **Scale**: `text-xs` (0.75rem) → `text-6xl` (3.75rem)
- **Line Heights**: Tight (1.1) → Relaxed (1.6)

### Effects
- **Glassmorphism**: `backdrop-filter: blur(20px) saturate(180%)`
- **Shadows**: 6 levels from `xs` to `2xl` + glow variants
- **Transitions**: Spring physics (`cubic-bezier(0.34, 1.56, 0.64, 1)`)
- **Reduced Motion**: Full `prefers-reduced-motion` support

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `⌘K` / `Ctrl+K` | Open Command Palette |
| `⌘N` | New Document |
| `⌘O` | Open File |
| `⌘S` / `⌘⇧S` | Save / Save As |
| `⌘Z` / `⌘⇧Z` | Undo / Redo |
| `⌘F` | Find in Document |
| `⌘⇧G` / `⌘G` | Find Previous / Next |
| `⌘,` | Open Settings |
| `⌘/` | Show Shortcuts |
| `⌘⇧T` | Toggle Theme |
| `V` / `H` | Select / Pan Tool |
| `T` | Text Tool |
| `⇧H` | Highlight |
| `U` | Underline |
| `⇧S` | Strikethrough |
| `N` | Sticky Note |
| `X` | Text Box |
| `P` | Freehand |
| `R` / `E` | Rectangle / Ellipse |
| `L` / `A` | Line / Arrow |
| `I` | Insert Image |
| `G` | Signature |
| `⌘←/→` | Prev/Next Page |
| `⌘Home/End` | First/Last Page |
| `⌘+/-` / `⌘0` | Zoom In/Out / Reset |
| `⌘1` / `⌘2` | Fit Width / Fit Page |
| `Escape` | Close Modal/Cancel |
| `Tab` / `⇧Tab` | Next/Previous Field |

---

## 🔧 Configuration

### Environment Variables
```env
# .env.local
VITE_APP_TITLE=ZyncPDF
VITE_ENABLE_ANALYTICS=false
VITE_PDF_WORKER_URL=/vendor/pdfjs/pdf.worker.min.mjs
```

### Vite Config Highlights
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-pdf': ['pdf-lib', 'pdfjs-dist'],
          'vendor-utils': ['jszip'],
          // ... more chunks
        }
      }
    }
  }
});
```

---

## 📦 Building Extensions

### Creating a New Tool
```typescript
// src/pages/my-tool/my-tool.ts
import { EventEmitter } from '../../utils/event-emitter.js';

export class MyTool extends EventEmitter {
  async render() {
    // Tool UI
  }
  
  destroy() {
    // Cleanup
  }
}

// Register in app.ts
const tool = new MyTool({ tool, state, utils });
await tool.render();
```

### Adding a Command
```typescript
// In app.ts or command-palette.ts
commands.push({
  id: 'my-action',
  title: 'My Action',
  description: 'Description',
  icon: '<svg>...</svg>',
  shortcut: '⌘M',
  section: 'Tools',
  action: () => this.doSomething(),
  keywords: ['my', 'action', 'tool']
});
```

---

## 📱 PWA Features

- **Installable** - Add to home screen on mobile/desktop
- **Offline Support** - Full functionality offline
- **Background Sync** - Auto-sync when online
- **App Shortcuts** - Quick actions from home screen
- **File Handling** - Open PDFs directly from OS

---

## 🔐 Security

- **Content Security Policy** - Strict CSP headers
- **Subresource Integrity** - All external resources
- **COEP/COOP** - Required for PDF.js worker
- **No External Dependencies** at runtime
- **Memory Management** - Explicit cleanup, no leaks

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# Type checking
npm run typecheck

# Linting
npm run lint

# Format code
npm run format
```

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0** - see the [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

---

## 🙏 Acknowledgments

- **[PDF-lib](https://pdf-lib.js.org/)** - PDF creation/modification
- **[PDF.js](https://mozilla.github.io/pdf.js/)** - PDF rendering
- **[JSZip](https://stuk.github.io/jszip/)** - ZIP file creation
- **[Font Awesome](https://fontawesome.com/)** - Icons
- **[Inter Font](https://rsms.me/inter/)** - Typography

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/alanjollyc/ZyncPDF/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alanjollyc/ZyncPDF/discussions)
- **Email**: adm.converto@gmail.com

---

**Built with ❤️ for privacy-conscious users everywhere.**

*Your files. Your device. Your privacy.* 
 1 2   J u l y   2 0 2 6   1 4 : 0 8 : 4 8  
  
  
 