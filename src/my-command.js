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
    // --- Visual Design Constants ---
    const highlightColor = '#00D4FF'; // Cyan color for highlights
    const highlightOpacity = '66'; // 40% opacity in hex (66 = 102/255)
    const numberBgColor = '#FF3366'; // Vibrant red for number badges
    const panelBgColor = '#FFFFFF';
    const panelBorderColor = '#E0E0E0';
    const textPrimaryColor = '#1A1A1A';
    const textSecondaryColor = '#666666';
    // --- Layout Constants ---
    const artboardSpacing = 120;
    const panelWidth = 420;
    const panelPadding = 32;
    const panelItemSpacing = 24;
    const numberBadgeSize = 32;
    const minHighlightSize = 20; // Minimum size for small elements
    // --- Get all visible layers in layer panel order ---
    function getVisibleLayersInOrder(container) {
        let layers = [];
        // Process layers from top to bottom (as they appear in layers panel)
        if (container.layers && Array.isArray(container.layers)) {
            // Sketch layers are in reverse order (bottom layer is index 0)
            // So we need to reverse to get top-to-bottom order
            const reversedLayers = Array.from(container.layers).reverse();
            reversedLayers.forEach((layer) => {
                // Skip hidden layers and meaxure annotations
                if (!layer.hidden && !layer.name.startsWith('#meaxure')) {
                    layers.push(layer);
                    // Recursively get nested layers
                    if (layer.type === sketch_1.default.Types.Group ||
                        layer.type === sketch_1.default.Types.Artboard ||
                        layer.type === 'Frame' ||
                        layer.type === 'SymbolInstance') {
                        layers = layers.concat(getVisibleLayersInOrder(layer));
                    }
                }
            });
        }
        return layers;
    }
    // Get all layers in proper order
    const orderedLayers = getVisibleLayersInOrder(originalArtboard);
    if (orderedLayers.length === 0) {
        sketch_1.default.UI.message("No visible layers found in the selected artboard.");
        return;
    }
    // --- Calculate dimensions ---
    const anatomyArtboardWidth = originalArtboard.frame.width + panelWidth + artboardSpacing;
    const panelItemHeight = 80; // Height for each spec item
    const panelHeaderHeight = 120;
    const panelContentHeight = orderedLayers.length * panelItemHeight + (orderedLayers.length - 1) * panelItemSpacing;
    const panelTotalHeight = panelHeaderHeight + panelContentHeight + panelPadding * 2;
    const anatomyArtboardHeight = Math.max(originalArtboard.frame.height, panelTotalHeight);
    // --- Create the Anatomy Artboard ---
    const anatomyArtboard = new sketch_1.default.Artboard({
        name: `Anatomy: ${originalArtboard.name}`,
        parent: page,
        frame: new sketch_1.default.Rectangle(originalArtboard.frame.x + originalArtboard.frame.width + artboardSpacing, originalArtboard.frame.y, anatomyArtboardWidth, anatomyArtboardHeight),
    });
    // --- Add white background ---
    new sketch_1.default.Shape({
        parent: anatomyArtboard,
        frame: new sketch_1.default.Rectangle(0, 0, anatomyArtboardWidth, anatomyArtboardHeight),
        style: {
            fills: [{ color: '#FFFFFF', fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
            borders: [],
        },
    });
    // --- Duplicate original artboard content ---
    const duplicatedContent = originalArtboard.duplicate();
    duplicatedContent.parent = anatomyArtboard;
    duplicatedContent.frame.x = 0;
    duplicatedContent.frame.y = 0;
    duplicatedContent.selected = false;
    // --- Create Specifications Panel ---
    const panelX = originalArtboard.frame.width + artboardSpacing / 2;
    // Panel background
    new sketch_1.default.Shape({
        parent: anatomyArtboard,
        frame: new sketch_1.default.Rectangle(panelX, 0, panelWidth, anatomyArtboardHeight),
        style: {
            fills: [{ color: panelBgColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
            borders: [{ color: panelBorderColor, thickness: 1, enabled: true }],
        },
    });
    // Panel header
    new sketch_1.default.Text({
        text: 'Layer Specifications',
        parent: anatomyArtboard,
        frame: new sketch_1.default.Rectangle(panelX + panelPadding, panelPadding, panelWidth - panelPadding * 2, 40),
        style: {
            fontSize: 28,
            textColor: textPrimaryColor,
            alignment: 'left'
        },
    });
    // Subtitle
    new sketch_1.default.Text({
        text: `${orderedLayers.length} layers identified`,
        parent: anatomyArtboard,
        frame: new sketch_1.default.Rectangle(panelX + panelPadding, panelPadding + 48, panelWidth - panelPadding * 2, 24),
        style: {
            fontSize: 16,
            textColor: textSecondaryColor,
            alignment: 'left'
        },
    });
    // --- Create highlights and panel entries for each layer ---
    let panelY = panelHeaderHeight;
    orderedLayers.forEach((layer, index) => {
        const layerNumber = index + 1;
        const rect = getAbsoluteRect(layer, originalArtboard);
        // --- Create highlight overlay ---
        const highlightGroup = new Group({
            name: `Highlight-${layerNumber}`,
            parent: anatomyArtboard,
        });
        // Ensure minimum size for tiny elements
        let highlightWidth = Math.max(rect.width, minHighlightSize);
        let highlightHeight = Math.max(rect.height, minHighlightSize);
        let highlightX = rect.x;
        let highlightY = rect.y;
        // Center small highlights on the original element
        if (rect.width < minHighlightSize) {
            highlightX = rect.x - (minHighlightSize - rect.width) / 2;
        }
        if (rect.height < minHighlightSize) {
            highlightY = rect.y - (minHighlightSize - rect.height) / 2;
        }
        // Highlight rectangle
        const highlight = new sketch_1.default.Shape({
            parent: highlightGroup,
            frame: new sketch_1.default.Rectangle(highlightX, highlightY, highlightWidth, highlightHeight),
            style: {
                borders: [{
                        color: highlightColor,
                        thickness: 2,
                        enabled: true
                    }],
                fills: [{
                        color: highlightColor + highlightOpacity,
                        fillType: sketch_1.default.Style.FillType.Color,
                        enabled: true
                    }],
            },
        });
        // Number badge positioned at top-left of highlight
        const badgeX = highlightX + 8;
        const badgeY = highlightY + 8;
        // Badge background
        new sketch_1.default.Shape({
            parent: highlightGroup,
            frame: new sketch_1.default.Rectangle(badgeX, badgeY, numberBadgeSize, numberBadgeSize),
            style: {
                fills: [{ color: numberBgColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [{ color: '#FFFFFF', thickness: 2, enabled: true }],
            },
        });
        // Badge number
        new sketch_1.default.Text({
            text: `${layerNumber}`,
            parent: highlightGroup,
            frame: new sketch_1.default.Rectangle(badgeX, badgeY, numberBadgeSize, numberBadgeSize),
            style: {
                fontSize: 16,
                textColor: '#FFFFFF',
                alignment: 'center'
            },
        });
        // Move highlight group to front
        highlightGroup.moveToFront();
        // --- Create panel entry ---
        const entryY = panelY + (index * (panelItemHeight + panelItemSpacing));
        // Entry background (subtle hover effect simulation)
        new sketch_1.default.Shape({
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding, entryY, panelWidth - panelPadding * 2, panelItemHeight),
            style: {
                fills: [{ color: '#FAFAFA', fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [{ color: '#EEEEEE', thickness: 1, enabled: true }],
            },
        });
        // Entry number badge
        new sketch_1.default.Shape({
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 12, entryY + (panelItemHeight - numberBadgeSize) / 2, numberBadgeSize, numberBadgeSize),
            style: {
                fills: [{ color: numberBgColor, fillType: sketch_1.default.Style.FillType.Color, enabled: true }],
                borders: [],
            },
        });
        new sketch_1.default.Text({
            text: `${layerNumber}`,
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 12, entryY + (panelItemHeight - numberBadgeSize) / 2, numberBadgeSize, numberBadgeSize),
            style: {
                fontSize: 14,
                textColor: '#FFFFFF',
                alignment: 'center'
            },
        });
        // Layer name
        new sketch_1.default.Text({
            text: layer.name,
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 60, entryY + 12, panelWidth - panelPadding * 2 - 72, 24),
            style: {
                fontSize: 16,
                textColor: textPrimaryColor,
                alignment: 'left'
            },
        });
        // Layer type and dimensions
        const typeLabel = layer.type.replace('MSLayer', '').replace('Group', 'Group');
        const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
        new sketch_1.default.Text({
            text: `${typeLabel} • ${dimensions}`,
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 60, entryY + 40, panelWidth - panelPadding * 2 - 72, 20),
            style: {
                fontSize: 14,
                textColor: textSecondaryColor,
                alignment: 'left'
            },
        });
    });
    // Clean up any temporary data
    if (globalThis._badgePositions) {
        delete globalThis._badgePositions;
    }
    // Select the new anatomy artboard
    anatomyArtboard.selected = true;
    sketch_1.default.UI.message(`✓ Anatomy specs generated for ${orderedLayers.length} layers`);
}
