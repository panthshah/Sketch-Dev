"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const sketch_1 = __importDefault(require("sketch"));
// @ts-ignore
const Group = sketch_1.default.Group || (require('sketch/dom').Group);
function rgbaToHex(rgba) {
    const r = Math.round(rgba.red * 255).toString(16).padStart(2, '0');
    const g = Math.round(rgba.green * 255).toString(16).padStart(2, '0');
    const b = Math.round(rgba.blue * 255).toString(16).padStart(2, '0');
    const a = Math.round(rgba.alpha * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}${a}`.toUpperCase();
}
// Helper function to get a layer's absolute position using modern Sketch API, safely traversing parent chain
function getAbsoluteRect(layer, artboard) {
    let currentLayer = layer;
    let absoluteX = layer.frame.x;
    let absoluteY = layer.frame.y;
    // Safety check for layer frame
    if (!layer.frame || typeof layer.frame.x !== 'number' || typeof layer.frame.y !== 'number') {
        console.log(`Warning: Layer ${layer.name} has invalid frame, using fallback`);
        return new sketch_1.default.Rectangle(0, 0, 100, 100);
    }
    while (currentLayer.parent &&
        currentLayer.parent !== artboard &&
        currentLayer.parent.frame &&
        typeof currentLayer.parent.frame.x === 'number' &&
        typeof currentLayer.parent.frame.y === 'number') {
        absoluteX += currentLayer.parent.frame.x;
        absoluteY += currentLayer.parent.frame.y;
        currentLayer = currentLayer.parent;
    }
    return new sketch_1.default.Rectangle(absoluteX, absoluteY, layer.frame.width, layer.frame.height);
}
// Helper function to draw a simple rectangle representing a layer
function drawLayerRepresentation(parent, x, y, width, height, fillColor = '#D8D8D8') {
    new sketch_1.default.Shape({
        parent: parent,
        frame: new sketch_1.default.Rectangle(x, y, width, height),
        style: {
            fills: [{ color: fillColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
            borders: [{ color: '#979797', thickness: 1, enabled: true }],
        },
    });
}
// Helper function to draw a measurement line using rectangles instead of Path
function drawMeasurement(parent, x1, y1, x2, y2, text, textOffset = 10) {
    const lineColor = '#666666';
    const lineThickness = 1;
    const lineExtension = 5;
    // Draw the main line using a thin rectangle
    if (x1 === x2) {
        // Vertical line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x1 - lineThickness / 2, y1, lineThickness, y2 - y1),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
    }
    else if (y1 === y2) {
        // Horizontal line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x1, y1 - lineThickness / 2, x2 - x1, lineThickness),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
    }
    // Draw perpendicular lines at ends using thin rectangles
    if (x1 === x2) {
        // Top perpendicular line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x1 - lineExtension, y1 - lineThickness / 2, lineExtension * 2, lineThickness),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
        // Bottom perpendicular line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x1 - lineExtension, y2 - lineThickness / 2, lineExtension * 2, lineThickness),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
    }
    else if (y1 === y2) {
        // Left perpendicular line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x1 - lineThickness / 2, y1 - lineExtension, lineThickness, lineExtension * 2),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
        // Right perpendicular line
        new sketch_1.default.Shape({
            parent: parent,
            frame: new sketch_1.default.Rectangle(x2 - lineThickness / 2, y1 - lineExtension, lineThickness, lineExtension * 2),
            style: {
                fills: [{ color: lineColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
    }
    let textX = Math.min(x1, x2) + Math.abs(x2 - x1) / 2;
    let textY = Math.min(y1, y2) + Math.abs(y2 - y1) / 2;
    if (x1 === x2) {
        textX += textOffset;
    }
    else if (y1 === y2) {
        textY -= textOffset;
    }
    new sketch_1.default.Text({
        text: text,
        parent: parent,
        frame: new sketch_1.default.Rectangle(textX - 20, textY - 10, 40, 20),
        style: {
            textColor: lineColor,
            fontSize: 10,
            alignment: sketch_1.default.Text.Alignment.Center,
        },
    });
}
function duplicateArtboard(originalArtboard, suffix) {
    const page = originalArtboard.parent;
    const newArtboard = originalArtboard.duplicate();
    newArtboard.name = `Specs: ${originalArtboard.name} - ${suffix}`;
    newArtboard.parent = page;
    // Unlock all child layers for annotation
    newArtboard.layers.forEach((layer) => { layer.locked = false; });
    return newArtboard;
}
function createSpecsGroup(artboard, groupName) {
    const group = new Group({
        name: groupName,
        parent: artboard,
        frame: new sketch_1.default.Rectangle(0, 0, artboard.frame.width, artboard.frame.height),
    });
    return group;
}
function getAllLayers(layerContainer) {
    let layers = [];
    if (layerContainer.layers) {
        layerContainer.layers.forEach((layer) => {
            if (!layer.name.startsWith('#meaxure')) {
                layers.push(layer);
                if (layer.type === sketch_1.default.Types.Group || layer.type === sketch_1.default.Types.Artboard) {
                    layers = layers.concat(getAllLayers(layer));
                }
            }
        });
    }
    return layers;
}
function drawLayoutSpecs(artboard, specsGroup) {
    // For each layer, draw dimension lines and spacing callouts, offset from the design
    const layers = getAllLayers(artboard);
    const offset = 32; // px offset for callouts
    const colorBox = '#1E90FF';
    const colorText = '#1E90FF';
    // Draw bounding boxes and dimension labels
    layers.forEach((layer, idx) => {
        console.log(`Annotating layer: ${layer.name} (${layer.type})`);
        const rect = getAbsoluteRect(layer, artboard);
        // Bounding box
        new sketch_1.default.Shape({
            parent: specsGroup,
            frame: new sketch_1.default.Rectangle(rect.x, rect.y, rect.width, rect.height),
            style: {
                borders: [{ color: colorBox, thickness: 2, enabled: true }],
                fills: [],
            },
        });
        // Width label (above)
        new sketch_1.default.Text({
            text: `${Math.round(rect.width)}px`,
            parent: specsGroup,
            frame: new sketch_1.default.Rectangle(rect.x + rect.width / 2 - 24, rect.y - offset, 48, 18),
            style: { fontSize: 13, textColor: colorText, alignment: sketch_1.default.Text.Alignment.Center },
        });
        // Height label (right)
        new sketch_1.default.Text({
            text: `${Math.round(rect.height)}px`,
            parent: specsGroup,
            frame: new sketch_1.default.Rectangle(rect.x + rect.width + 8, rect.y + rect.height / 2 - 9, 48, 18),
            style: { fontSize: 13, textColor: colorText, alignment: sketch_1.default.Text.Alignment.Center },
        });
        // Spacing to next layer (if not last)
        if (idx < layers.length - 1) {
            const nextRect = getAbsoluteRect(layers[idx + 1], artboard);
            // Horizontal spacing (if aligned vertically)
            if (rect.y === nextRect.y && rect.height === nextRect.height) {
                const spacing = nextRect.x - (rect.x + rect.width);
                if (spacing > 0) {
                    // Draw line
                    new sketch_1.default.Shape({
                        parent: specsGroup,
                        frame: new sketch_1.default.Rectangle(rect.x + rect.width, rect.y + rect.height / 2 - 1, spacing, 2),
                        style: {
                            fills: [{ color: colorBox, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                            borders: [],
                        },
                    });
                    // Label
                    new sketch_1.default.Text({
                        text: `${spacing}px`,
                        parent: specsGroup,
                        frame: new sketch_1.default.Rectangle(rect.x + rect.width + spacing / 2 - 16, rect.y + rect.height / 2 - 12, 32, 16),
                        style: { fontSize: 12, textColor: colorText, alignment: sketch_1.default.Text.Alignment.Center },
                    });
                }
            }
            // Vertical spacing (if aligned horizontally)
            if (rect.x === nextRect.x && rect.width === nextRect.width) {
                const spacing = nextRect.y - (rect.y + rect.height);
                if (spacing > 0) {
                    // Draw line
                    new sketch_1.default.Shape({
                        parent: specsGroup,
                        frame: new sketch_1.default.Rectangle(rect.x + rect.width / 2 - 1, rect.y + rect.height, 2, spacing),
                        style: {
                            fills: [{ color: colorBox, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                            borders: [],
                        },
                    });
                    // Label
                    new sketch_1.default.Text({
                        text: `${spacing}px`,
                        parent: specsGroup,
                        frame: new sketch_1.default.Rectangle(rect.x + rect.width / 2 - 16, rect.y + rect.height + spacing / 2 - 8, 32, 16),
                        style: { fontSize: 12, textColor: colorText, alignment: sketch_1.default.Text.Alignment.Center },
                    });
                }
            }
        }
    });
}
// Helper: Recursively build a tree of all layers, with type and children
function buildLayerTree(layer, depth = 0, parentIndex = '') {
    let result = [];
    // Detect type
    let type = layer.type;
    let isStack = false;
    let isFrame = false;
    let isSymbol = false;
    let isGroup = false;
    let isGraphic = false;
    // Try to detect modern types (Frame, Stack, Symbol, Graphic)
    if (type === 'Artboard' || type === 'Frame') {
        isFrame = true;
        // Stacks are Frames with layout properties
        if (layer.layout && (layer.layout.direction || layer.layout.spacing !== undefined)) {
            isStack = true;
        }
    }
    else if (type === 'Group') {
        isGroup = true;
        // Stacks can also be Groups with layout
        if (layer.layout && (layer.layout.direction || layer.layout.spacing !== undefined)) {
            isStack = true;
        }
    }
    else if (type === 'SymbolInstance' || type === 'SymbolMaster') {
        isSymbol = true;
    }
    else if (type === 'Graphic') {
        isGraphic = true;
    }
    // Compose node
    const node = {
        layer,
        type,
        isStack,
        isFrame,
        isSymbol,
        isGroup,
        isGraphic,
        depth,
        parentIndex,
        children: [],
    };
    // Recursively add children
    if (layer.layers && Array.isArray(layer.layers) && layer.layers.length > 0) {
        node.children = layer.layers.map((child, i) => buildLayerTree(child, depth + 1, parentIndex + (parentIndex ? '.' : '') + (i + 1))).flat();
    }
    result.push(node);
    if (node.children.length > 0) {
        result = result.concat(node.children);
    }
    return result;
}
function default_1() {
    const document = sketch_1.default.getSelectedDocument();
    if (!document) {
        sketch_1.default.UI.message("Error: No Sketch document open.");
        return;
    }
    const selectedLayers = document.selectedLayers;
    if (selectedLayers.length !== 1 || selectedLayers.layers[0].type !== sketch_1.default.Types.Artboard) {
        sketch_1.default.UI.message("Please select a single Artboard to generate specs.");
        return;
    }
    const originalArtboard = selectedLayers.layers[0];
    const page = originalArtboard.parent;
    // --- Layout constants ---
    const sidebarWidth = 400;
    const sidebarX = 0;
    const sidebarY = 0;
    const sidebarPaddingX = 48;
    const sidebarPaddingY = 64;
    const rowSpacing = 48;
    const badgeSize = 40;
    const badgeColor = '#FF6F61';
    const nameFontSize = 22;
    const propFontSize = 15;
    const propSpacing = 22;
    const accentColor = badgeColor;
    // --- Main frame placement ---
    const mainFrameX = sidebarWidth + 80;
    const mainFrameY = 0;
    const mainFrameWidth = originalArtboard.frame.width;
    const mainFrameHeight = originalArtboard.frame.height;
    // --- Calculate required sidebar height ---
    const rootTree = buildLayerTree(originalArtboard, 0, '');
    const layers = rootTree;
    const sidebarRowsHeight = layers.length * (badgeSize + 8 + 5 * propSpacing) + (layers.length - 1) * rowSpacing;
    const sidebarTotalHeight = sidebarPaddingY + 64 + sidebarRowsHeight + sidebarPaddingY;
    const specsFrameHeight = Math.max(mainFrameHeight, sidebarTotalHeight);
    // Create the new specs artboard (wide, to fit sidebar and main frame, and tall enough for all specs)
    const specsFrame = new sketch_1.default.Artboard({
        name: `Specs: ${originalArtboard.name}`,
        parent: originalArtboard.parent,
        frame: new sketch_1.default.Rectangle(originalArtboard.frame.x + originalArtboard.frame.width + 120, originalArtboard.frame.y, sidebarWidth + 80 + mainFrameWidth + 80, specsFrameHeight),
    });
    // --- Duplicate the original artboard/frame and its children into the specs artboard ---
    // Place the duplicate in the main frame area
    const duplicatedArtboard = originalArtboard.duplicate();
    duplicatedArtboard.parent = specsFrame;
    duplicatedArtboard.frame.x = mainFrameX;
    duplicatedArtboard.frame.y = mainFrameY;
    duplicatedArtboard.selected = false;
    // Optionally, lock the duplicate to prevent accidental edits
    duplicatedArtboard.locked = true;
    console.log(`[Specs] Parent artboard frame: (${originalArtboard.frame.x},${originalArtboard.frame.y},${originalArtboard.frame.width},${originalArtboard.frame.height})`);
    console.log(`[Specs] Duplicated artboard frame: (${duplicatedArtboard.frame.x},${duplicatedArtboard.frame.y},${duplicatedArtboard.frame.width},${duplicatedArtboard.frame.height})`);
    console.log(`[Specs] Duplicated artboard layer count before: ${duplicatedArtboard.layers.length}`);
    layers.forEach((node, idx) => {
        const { layer } = node;
        const rect = getAbsoluteRect(layer, originalArtboard);
        const offsetX = rect.x - originalArtboard.frame.x;
        const offsetY = rect.y - originalArtboard.frame.y;
        // Smart badge placement: place badge 40px above highlight for small layers
        let badgeX = offsetX;
        let badgeY = offsetY;
        const isSmall = rect.width < 40 || rect.height < 40;
        if (isSmall) {
            badgeX = offsetX;
            badgeY = offsetY - 40; // 40px above highlight
        }
        else {
            badgeX = offsetX + 4;
            badgeY = offsetY + 4;
        }
        // Subtle fill for highlight
        const highlightFill = { color: accentColor + '22', fillType: sketch_1.default.Style.FillType.Color, enabled: true };
        console.log(`[Specs] Creating highlight for: ${layer.name} at (${offsetX},${offsetY},${rect.width},${rect.height})`);
        const highlight = new sketch_1.default.Shape({
            parent: duplicatedArtboard,
            frame: new sketch_1.default.Rectangle(offsetX, offsetY, rect.width, rect.height),
            style: {
                borders: [{ color: accentColor, thickness: 2, enabled: true }],
                fills: [highlightFill],
            },
        });
        highlight.moveToFront();
        highlight.locked = false;
        highlight.hidden = false;
        console.log(`[Specs] Highlight created and moved to front for: ${layer.name}`);
        console.log(`[Specs] Highlight absolute frame: (${highlight.frame.x},${highlight.frame.y},${highlight.frame.width},${highlight.frame.height}) locked: ${highlight.locked} hidden: ${highlight.hidden}`);
        // --- Badge stacking and margin logic ---
        const badgeMargin = 12;
        const badgeStackSpacing = badgeSize + 4;
        // Keep track of previous badge positions
        if (!globalThis._badgePositions)
            globalThis._badgePositions = [];
        let stackOffsetY = 0;
        let badgeTargetX = badgeX;
        let badgeTargetY = badgeY;
        // Ensure margin from artboard edge
        if (badgeTargetX < badgeMargin)
            badgeTargetX = badgeMargin;
        if (badgeTargetY < badgeMargin)
            badgeTargetY = badgeMargin;
        // Stack if overlapping with previous badges
        globalThis._badgePositions.forEach(pos => {
            if (Math.abs(pos.x - badgeTargetX) < badgeSize && Math.abs(pos.y - badgeTargetY) < badgeSize) {
                stackOffsetY += badgeStackSpacing;
            }
        });
        badgeTargetY += stackOffsetY;
        globalThis._badgePositions.push({ x: badgeTargetX, y: badgeTargetY });
        // Use drawMeasurement helper for leader line
        if (isSmall) {
            const x1 = badgeTargetX + badgeSize / 2;
            const y1 = badgeTargetY + badgeSize / 2;
            const x2 = offsetX;
            const y2 = offsetY;
            drawMeasurement(duplicatedArtboard, x1, y1, x2, y2, '');
        }
        // Numbered badge (smaller, inside or outside top-left, white border)
        console.log(`[Specs] Creating badge for: ${layer.name} at (${badgeTargetX},${badgeTargetY})`);
        const badgeShape = new sketch_1.default.Shape({
            parent: duplicatedArtboard,
            frame: new sketch_1.default.Rectangle(badgeTargetX, badgeTargetY, badgeSize, badgeSize),
            style: {
                fills: [{ color: accentColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [{ color: '#FFF', thickness: 2, enabled: true }],
            },
        });
        badgeShape.moveToFront();
        badgeShape.locked = false;
        badgeShape.hidden = false;
        const badgeText = new sketch_1.default.Text({
            text: `${idx + 1}`,
            parent: duplicatedArtboard,
            frame: new sketch_1.default.Rectangle(badgeTargetX, badgeTargetY + 1, badgeSize, badgeSize),
            style: { fontSize: 14, textColor: '#FFF', alignment: 'center' },
        });
        badgeText.moveToFront();
        badgeText.locked = false;
        badgeText.hidden = false;
        console.log(`[Specs] Badge created and moved to front for: ${layer.name}`);
        console.log(`[Specs] Badge shape frame: (${badgeShape.frame.x},${badgeShape.frame.y},${badgeShape.frame.width},${badgeShape.frame.height}) locked: ${badgeShape.locked} hidden: ${badgeShape.hidden}`);
        console.log(`[Specs] Badge text frame: (${badgeText.frame.x},${badgeText.frame.y},${badgeText.frame.width},${badgeText.frame.height}) locked: ${badgeText.locked} hidden: ${badgeText.hidden}`);
    });
    console.log(`[Specs] Duplicated artboard layer count after: ${duplicatedArtboard.layers.length}`);
    // --- Sidebar: Anatomy ---
    new sketch_1.default.Text({
        text: 'Anatomy',
        parent: specsFrame,
        frame: new sketch_1.default.Rectangle(sidebarX + sidebarPaddingX, sidebarPaddingY, sidebarWidth - 2 * sidebarPaddingX, 48),
        style: { fontSize: 36, textColor: '#222', alignment: 'left' },
    });
    let sidebarYCursor = sidebarPaddingY + 64;
    layers.forEach((node, idx) => {
        const { layer, depth, isStack, isFrame, isSymbol, isGroup, isGraphic } = node;
        // Indent based on depth
        const indent = depth * 32;
        // Number badge (large, accent color, circle)
        new sketch_1.default.Shape({
            parent: specsFrame,
            frame: new sketch_1.default.Rectangle(sidebarX + sidebarPaddingX + indent, sidebarYCursor, badgeSize, badgeSize),
            style: {
                fills: [{ color: accentColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
        new sketch_1.default.Text({
            text: `${idx + 1}`,
            parent: specsFrame,
            frame: new sketch_1.default.Rectangle(sidebarX + sidebarPaddingX + indent, sidebarYCursor + 2, badgeSize, badgeSize),
            style: { fontSize: 20, textColor: '#FFF', alignment: 'center' },
        });
        // Name (large, bold, with type label)
        let typeLabel = isStack ? 'Stack' : isFrame ? 'Frame' : isSymbol ? 'Symbol' : isGroup ? 'Group' : isGraphic ? 'Graphic' : layer.type;
        new sketch_1.default.Text({
            text: `${layer.name} (${typeLabel})`,
            parent: specsFrame,
            frame: new sketch_1.default.Rectangle(sidebarX + sidebarPaddingX + badgeSize + 24 + indent, sidebarYCursor, sidebarWidth - sidebarPaddingX - badgeSize - 24 - indent, badgeSize),
            style: { fontSize: nameFontSize, textColor: '#222', alignment: 'left' },
        });
        // Properties (spaced out, left-aligned)
        let propY = sidebarYCursor + badgeSize + 8;
        const style = layer.style || {};
        const fills = style.fills || [];
        const borders = style.borders || [];
        const backgroundColor = fills.length && fills[0].enabled ? (typeof fills[0].color === 'string' ? fills[0].color : rgbaToHex(fills[0].color)) : '-';
        const borderRadius = style.borderRadius ?? '-';
        const borderColor = borders.length && borders[0].enabled ? (typeof borders[0].color === 'string' ? borders[0].color : rgbaToHex(borders[0].color)) : '-';
        const borderWeight = borders.length && borders[0].enabled ? borders[0].thickness : '-';
        const height = layer.frame?.height ?? '-';
        const width = layer.frame?.width ?? '-';
        // Text properties
        const fontFamily = style.fontFamily ?? (layer.style?.fontFamily ?? '-');
        const fontWeight = style.fontWeight ?? (layer.style?.fontWeight ?? '-');
        const fontSize = style.fontSize ?? (layer.style?.fontSize ?? '-');
        const textAlign = style.alignment ?? (layer.style?.alignment ?? '-');
        const textColor = style.textColor ? (typeof style.textColor === 'string' ? style.textColor : rgbaToHex(style.textColor)) : '-';
        function prop(label, value) {
            new sketch_1.default.Text({
                text: `${label}: ${value}`,
                parent: specsFrame,
                frame: new sketch_1.default.Rectangle(sidebarX + sidebarPaddingX + badgeSize + 24 + indent, propY, sidebarWidth - sidebarPaddingX - badgeSize - 24 - indent, propFontSize + 8),
                style: { fontSize: propFontSize, textColor: '#444', alignment: 'left' },
            });
            propY += propSpacing;
        }
        prop('Height', height);
        prop('Width', width);
        prop('Background', backgroundColor);
        prop('Border Radius', borderRadius);
        prop('Border Color', borderColor);
        prop('Border Weight', borderWeight);
        if (layer.type === sketch_1.default.Types.Text) {
            prop('Font Family', fontFamily);
            prop('Font Weight', fontWeight);
            prop('Font Size', fontSize);
            prop('Text Align', textAlign);
            prop('Text Color', textColor);
        }
        // Stack properties
        if (isStack && layer.layout) {
            prop('Stack Direction', layer.layout.direction ?? '-');
            prop('Stack Alignment', layer.layout.alignment ?? '-');
            prop('Stack Spacing', layer.layout.spacing ?? '-');
            prop('Stack Padding', layer.layout.padding ?? '-');
        }
        sidebarYCursor = propY + rowSpacing;
    });
    sketch_1.default.UI.message("Specs Frame created! Sidebar ready for details.");
}
