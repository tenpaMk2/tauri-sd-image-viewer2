# Tauri SD Image Viewer

A desktop image viewer application built with Tauri v2, specifically designed for viewing and managing images with Stable Diffusion metadata.

## Features

- **Image Viewing**: Support for PNG, JPEG, and WebP formats
- **Stable Diffusion Metadata**: Extract and display SD parameters from generated images
- **EXIF Support**: View basic EXIF information
- **Rating System**: Rate images with star ratings (writes to both EXIF and XMP metadata)
- **Thumbnail Grid**: Browse images in a grid layout
- **Keyboard Navigation**: Navigate images with arrow keys
- **SD Tag Filtering**: Filter images by Stable Diffusion tags
- **Cross-Platform**: Works on macOS and Windows

## Technology Stack

- **Frontend**: SvelteKit 5, TypeScript, Tailwind CSS 4, DaisyUI
- **Backend**: Tauri v2 with Rust
- **Build Tool**: Bun

## Development

### Prerequisites

- [Bun](https://bun.sh/) - JavaScript runtime and package manager
- [Rust](https://rustup.rs/) - Required for Tauri backend

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/tenpaMk2/tauri-sd-image-viewer2.git
cd tauri-sd-image-viewer2
```

2. Install dependencies:
```bash
bun install
```

3. Start development server:
```bash
bun run tauri:dev
```

### Build Commands

- `bun run tauri:dev` - Start development server (frontend + Tauri app)
- `bun run tauri:build` - Build production Tauri app
- `bun run dev` - Start frontend-only development server
- `bun run build` - Build frontend only
- `bun run check` - Run TypeScript type checking
- `bun run format` - Format code with Prettier

### Recommended Development Flow

1. Start development: `bun run tauri:dev`
2. Make changes to the code
3. Run type checking: `bun run check`
4. Format code before commit: `bun run format`

## Image Format Support

| Format | Features |
|--------|----------|
| **PNG** | Full support: SD metadata, EXIF, EXIF+XMP Rating writing |
| **JPEG** | Limited support: EXIF, EXIF+XMP Rating writing (no SD metadata) |
| **WebP** | Basic support: EXIF reading only |

## Architecture

- **SPA Architecture**: Single Page Application with SvelteKit
- **Three View Modes**: Welcome → Grid → Viewer
- **Unified Metadata Service**: Efficient metadata caching and management
- **Performance Optimized**: Single I/O operations, image preloading, and caching

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Contributing

Issues and pull requests are welcome on [GitHub](https://github.com/tenpaMk2/tauri-sd-image-viewer2/issues).