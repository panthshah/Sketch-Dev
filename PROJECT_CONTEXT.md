# Sketch Spec Generator - Project Context

## Overview

**sketch-spec-generator** is a **Sketch plugin** that automatically generates design specifications and annotations for artboards. It creates detailed documentation showing layer anatomy, dimensions, styling properties, and visual relationships within a design.

## Project Type & Technology Stack

- **Platform**: Sketch App Plugin
- **Language**: TypeScript (transpiled to JavaScript)
- **Build System**: skpm (Sketch Plugin Manager)
- **Framework**: Sketch JavaScript API
- **Version**: 0.1.0
- **Minimum Sketch Version**: 49.0+

## Key Features

### 1. **Automatic Spec Generation**
- Takes a selected artboard and generates a comprehensive specification sheet
- Creates a new "Specs" artboard with detailed annotations

### 2. **Visual Annotations**
- **Numbered badges**: Each layer gets a numbered badge for identification
- **Highlights**: Layers are highlighted with colored overlays and borders
- **Leader lines**: Connect badges to small elements for clarity
- **Smart badge placement**: Avoids overlaps and maintains readability

### 3. **Detailed Sidebar Documentation**
- **Anatomy section**: Lists all layers with numbered references
- **Layer hierarchy**: Shows nesting with indentation
- **Type detection**: Identifies Frames, Stacks, Groups, Symbols, Graphics
- **Comprehensive properties**: 
  - Dimensions (width, height)
  - Colors (background, border, text)
  - Typography (font family, size, weight, alignment)
  - Border styling (radius, color, weight)
  - Stack/Layout properties (direction, alignment, spacing, padding)

### 4. **Layout Analysis**
- **Dimension annotations**: Shows width and height measurements
- **Spacing calculations**: Measures gaps between aligned elements
- **Absolute positioning**: Calculates positions relative to artboard

## Project Structure

```
sketch-spec-generator/
├── src/
│   ├── manifest.json         # Plugin metadata and menu configuration
│   ├── my-command.ts         # Main plugin logic (553 lines)
│   ├── my-command.js         # Compiled JavaScript version
│   └── types/
│       └── sketch.d.ts       # TypeScript definitions for Sketch API
├── assets/
│   └── icon.png             # Plugin icon
├── sketch-assets/           # Sketch-specific assets
├── package.json            # Dependencies and build scripts
├── tsconfig.json           # TypeScript configuration
└── README.md              # Installation and development guide
```

## Core Functionality

The main plugin logic (`my-command.ts`, 553 lines) implements:

1. **Validation**: Ensures user has selected exactly one artboard
2. **Layer Tree Building**: Recursively analyzes all layers and their hierarchy
3. **Specs Artboard Creation**: Creates a new wide artboard to hold specifications
4. **Design Duplication**: Copies original artboard for annotation
5. **Visual Annotation**: Adds numbered badges, highlights, and leader lines
6. **Sidebar Generation**: Creates detailed property documentation
7. **Layout Calculation**: Determines optimal spacing and positioning

## Supported Layer Types

- **Artboards**: Root containers
- **Frames**: Modern layout containers
- **Stacks**: Auto-layout containers (detected by layout properties)
- **Groups**: Traditional grouping containers
- **Symbols**: Reusable components
- **Graphics**: Shape and image layers
- **Text**: Typography elements

## Installation & Usage

### For Users
1. Download the `.sketchplugin` file
2. Double-click to install in Sketch
3. Select an artboard
4. Go to Plugins → sketch-spec-generator → "Generate Specs"

### For Developers
```bash
npm install           # Install dependencies
npm run build         # Build plugin
npm run watch         # Watch for changes
npm run start         # Build and run with auto-reload
```

## Technical Implementation

- **Design Philosophy**: Non-destructive, comprehensive, automated
- **Color Scheme**: `#FF6F61` for badges/highlights, `#1E90FF` for dimensions
- **Layout**: 400px sidebar, 40px badges, 48px spacing
- **API Usage**: Modern Sketch JavaScript API with TypeScript

## Use Cases

1. **Design Handoffs**: Provide developers with precise specifications
2. **Design Reviews**: Document design decisions and rationale
3. **Style Guides**: Create comprehensive design documentation
4. **QA Testing**: Verify implementation matches design specifications
5. **Design Archives**: Maintain historical documentation of designs

## Status

This is a **working prototype** with complete core functionality, TypeScript implementation, and professional visual output. Created by **panthshah_**.

The plugin represents a sophisticated approach to automated design documentation, bridging the gap between design and development teams.