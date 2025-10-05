# SATP Hermes Plugin - Documentation

This directory contains comprehensive documentation and high-quality architecture diagrams for the SATP (Secure Asset Transfer Protocol) Hermes plugin.

## 📊 Architecture Diagrams

Professional Mermaid diagrams showing the complete SATP Hermes architecture. All diagrams use a **high-contrast green color palette** optimized for visibility on both light and dark backgrounds.

### Available Formats

#### 🎨 **SVG** - Web-optimized vector graphics (2x scale, 19-73 KB)
#### 📄 **PDF** - Print-ready documents (3x scale, 46-140 KB, white background)
#### 🖼️ **PNG** - 4K raster images (3840px width, ultra high-res)

### Architecture Overview Diagrams

1. **architecture-overview** - Complete system architecture with all layers
2. **entrypoint-flow** - Gateway initialization sequence diagram
3. **entrypoint-use-cases** - Three deployment scenarios

### Module-Level Diagrams

4. **module-core** - SATP protocol implementation with stage handlers
5. **module-api** - REST endpoints and dispatcher routing
6. **module-cross-chain** - Bridge and oracle mechanisms
7. **module-database** - Persistence layer and repositories
8. **module-services** - Gateway orchestration and monitoring
9. **module-factory** - Component creation and dependency injection

### API Layer Diagrams

10. **api1-endpoints** - BLO REST endpoints (admin, transactions, oracle)
11. **api3-satp-protocol** - SATP gRPC/ConnectRPC protocol interactions

### Color Palette (High Contrast)

| Component | Color | Hex | Visibility |
|-----------|-------|-----|------------|
| Entry Points | Bright Emerald | `#22c55e` | White text, 4px borders |
| Core Services | Medium Green | `#4ade80` | Dark text, high contrast |
| Cross-Chain | Light Green | `#86efac` | Visible connections |
| Data Layer | Pale Green | `#bbf7d0` | Subtle hierarchy |
| Protocol Stages | Ice Green | `#dcfce7` | Light backgrounds |

**Features:** 4px borders • White text on dark BG • Light green lines (#86efac) • Rounded corners • Works on light/dark themes

## 🛠️ Generating Diagrams

```bash
# Generate SVG (default, recommended)
yarn docs:diagrams

# Generate 4K PNG (presentations)
yarn docs:diagrams:png

# Generate PDF (print/reports)
yarn docs:diagrams:pdf

# Generate ALL formats (SVG + PNG + PDF)
yarn docs:diagrams:all
```

## 📖 Complete Documentation Workflow

```bash
# Clean previous builds
yarn docs:clean

# Generate diagrams + TypeDoc
yarn docs:generate

# Serve at http://localhost:8080
yarn docs:serve

# Open in browser
yarn docs:open

# Watch for changes
yarn docs:watch

# Validate completeness
yarn docs:validate
```

## 📁 Directory Structure

```
docs/
├── README.md                           # This file
├── diagrams/                          # Mermaid source (.mmd)
│   ├── architecture-overview.mmd      # System overview
│   ├── entrypoint-flow.mmd            # Initialization sequence
│   ├── entrypoint-use-cases.mmd       # Deployment scenarios
│   ├── module-core.mmd                # Core protocol module
│   ├── module-api.mmd                 # REST API layer
│   ├── module-cross-chain.mmd         # Bridge & oracle
│   ├── module-database.mmd            # Persistence layer
│   ├── module-services.mmd            # Gateway services
│   ├── module-factory.mmd             # Component factory
│   ├── api1-endpoints.mmd             # BLO REST endpoints
│   └── api3-satp-protocol.mmd         # SATP protocol gRPC
└── architecture/
    └── satp-hermes.md                 # Main architecture doc

assets/                                # Package root assets
└── diagrams/                          # Generated outputs (11 diagrams)
    ├── *.svg  (2x scale, transparent, 19-73 KB)
    ├── *.png  (4K, 3840px, large files)
    └── *.pdf  (3x scale, white BG, 46-140 KB)
```

## 🎨 Customizing Diagrams

Edit `.mmd` files in `docs/diagrams/`, then regenerate:

```bash
yarn docs:diagrams
```

**Resources:**
- [Mermaid Docs](https://mermaid.js.org/)
- [Flowchart Syntax](https://mermaid.js.org/syntax/flowchart.html)
- [Sequence Diagrams](https://mermaid.js.org/syntax/sequenceDiagram.html)

## 📚 Available Scripts

| Script | Output | Description |
|--------|--------|-------------|
| `docs:diagrams` | SVG | Web-optimized (2x scale) |
| `docs:diagrams:png` | PNG | 4K high-res (3840px) |
| `docs:diagrams:pdf` | PDF | Print-ready (3x scale) |
| `docs:diagrams:all` | All | SVG + PNG + PDF |
| `docs:generate` | TypeDoc | Complete docs + diagrams |
| `docs:serve` | Server | http://localhost:8080 |
| `docs:validate` | Check | Documentation completeness |
| `docs:build` | Full | Clean + generate + validate |

## 🚀 Quick Tips

- ✅ **Web docs**: Use SVG (best quality/size)
- ✅ **Presentations**: Use PNG (4K, universal)
- ✅ **Print/Reports**: Use PDF (professional)

## 🔧 Configuration

- **TypeDoc**: `typedoc.json` in root
- **Main Doc**: `docs/architecture/satp-hermes.md`
- **Mermaid CLI**: Puppeteer renderer, custom green theme
- **Quality**: SVG (2x), PNG (4K @ 2x), PDF (3x, white BG)

## ✅ Status

- 3 professional diagrams with high-contrast colors
- Multiple export formats (SVG/PNG/PDF)
- Optimized for light/dark backgrounds
- Integrated with TypeDoc build
- Production-ready

---

**Tip**: SVG is recommended for web (infinite scalability, small size). Generate PNG/PDF only when specifically needed.
