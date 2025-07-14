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
    // Safety check for layer frame
    if (!layer.frame || typeof layer.frame.x !== 'number' || typeof layer.frame.y !== 'number') {
        console.log(`Warning: Layer ${layer.name} has invalid frame, using fallback`);
        return new sketch_1.default.Rectangle(0, 0, 100, 100);
    }
    // Special handling for virtual layers from Symbol Instances
    if (layer._isSymbolInstanceLayer) {
        // Virtual layers already have coordinates mapped to the artboard space
        return new sketch_1.default.Rectangle(layer.frame.x, layer.frame.y, layer.frame.width, layer.frame.height);
    }
    // Regular layer handling with parent chain traversal
    let currentLayer = layer;
    let absoluteX = layer.frame.x;
    let absoluteY = layer.frame.y;
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

function default_1() {
    const document = sketch_1.default.getSelectedDocument();
    if (!document) {
        sketch_1.default.UI.message("Error: No Sketch document open.");
        return;
    }
    const selectedLayers = document.selectedLayers;
    if (selectedLayers.length !== 1 || selectedLayers.layers[0].type !== sketch_1.default.Types.Artboard) {
        sketch_1.default.UI.message("Please select a single Artboard to generate anatomy specs.");
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
                    // Special handling for Symbol Instances - get their master's layers
                    if (layer.type === 'SymbolInstance') {
                        const symbolMasterLayers = getSymbolInstanceLayers(layer);
                        layers = layers.concat(symbolMasterLayers);
                    }
                    // Recursively get nested layers for other types
                    else if (layer.type === sketch_1.default.Types.Group ||
                        layer.type === sketch_1.default.Types.Artboard ||
                        layer.type === 'Frame' ||
                        layer.type === 'SymbolMaster') {
                        layers = layers.concat(getVisibleLayersInOrder(layer));
                    }
                }
            });
        }
        return layers;
    }
    // Helper function to get Symbol Master layers mapped to Symbol Instance coordinates
    function getSymbolInstanceLayers(symbolInstance) {
        let mappedLayers = [];
        try {
            // Get the Symbol Master from the instance - try multiple approaches
            let symbolMaster = symbolInstance.symbolMaster;
            // If symbolMaster doesn't exist, try the 'master' property
            if (!symbolMaster && symbolInstance.master) {
                symbolMaster = symbolInstance.master;
            }
            if (!symbolMaster) {
                return mappedLayers;
            }
            if (!symbolMaster.layers) {
                return mappedLayers;
            }
            // Get all layers from the Symbol Master
            const masterLayers = getVisibleLayersInOrder(symbolMaster);
            // Map each master layer to the instance's coordinate space
            masterLayers.forEach((masterLayer, index) => {
                if (!masterLayer.hidden && !masterLayer.name.startsWith('#meaxure')) {
                    // Create a virtual layer that represents this master layer in the instance
                    // Calculate absolute position by traversing the symbol instance's parent chain
                    let symbolAbsoluteX = symbolInstance.frame.x;
                    let symbolAbsoluteY = symbolInstance.frame.y;
                    // Traverse parent chain to get absolute coordinates
                    let currentParent = symbolInstance.parent;
                    while (currentParent && currentParent !== originalArtboard && currentParent.frame) {
                        symbolAbsoluteX += currentParent.frame.x;
                        symbolAbsoluteY += currentParent.frame.y;
                        currentParent = currentParent.parent;
                    }
                    // Only copy essential properties to avoid issues with Sketch objects
                    const virtualLayer = {
                        name: masterLayer.name,
                        type: masterLayer.type,
                        frame: {
                            x: symbolAbsoluteX + masterLayer.frame.x,
                            y: symbolAbsoluteY + masterLayer.frame.y,
                            width: masterLayer.frame.width,
                            height: masterLayer.frame.height
                        },
                        style: masterLayer.style,
                        hidden: masterLayer.hidden,
                        // Mark it as a virtual layer from a symbol for identification
                        _isSymbolInstanceLayer: true,
                        _parentSymbolInstance: symbolInstance,
                        _originalMasterLayer: masterLayer
                    };
                    mappedLayers.push(virtualLayer);
                }
            });
        }
        catch (error) {
            // Warning: Could not access Symbol Master layers
        }
        return mappedLayers;
    }
    // Get all layers in proper order
    const orderedLayers = getVisibleLayersInOrder(originalArtboard);
    if (orderedLayers.length === 0) {
        sketch_1.default.UI.message("No visible layers found in the selected artboard.");
        return;
    }
    // --- Calculate dimensions ---
    const anatomyArtboardWidth = originalArtboard.frame.width + panelWidth + artboardSpacing;
    const panelItemHeight = 160; // Height for each spec item (increased for more specs)
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
        // Calculate position relative to the duplicated content (which starts at 0,0)
        // Both regular and virtual layers return absolute coordinates from getAbsoluteRect
        // So we always subtract the original artboard position to get relative coordinates
        const relativeX = rect.x - originalArtboard.frame.x;
        const relativeY = rect.y - originalArtboard.frame.y;
        // Ensure minimum size for tiny elements
        let highlightWidth = Math.max(rect.width, minHighlightSize);
        let highlightHeight = Math.max(rect.height, minHighlightSize);
        let highlightX = relativeX;
        let highlightY = relativeY;
        // Center small highlights on the original element
        if (rect.width < minHighlightSize) {
            highlightX = relativeX - (minHighlightSize - rect.width) / 2;
        }
        if (rect.height < minHighlightSize) {
            highlightY = relativeY - (minHighlightSize - rect.height) / 2;
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
        const badgeY = highlightY; // Align to top edge for consistency
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
        // Move highlight group to front and ensure it's visible
        highlightGroup.moveToFront();
        highlightGroup.locked = false;
        highlightGroup.hidden = false;
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
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 60, entryY + 8, panelWidth - panelPadding * 2 - 72, 20),
            style: {
                fontSize: 16,
                textColor: textPrimaryColor,
                alignment: 'left'
            },
        });
        // Layer type and dimensions
        let typeLabel = layer.type.replace('MSLayer', '').replace('Group', 'Group');
        if (layer.type === 'SymbolInstance') {
            typeLabel = 'Symbol Instance';
        }
        else if (layer.type === 'SymbolMaster') {
            typeLabel = 'Symbol Master';
        }
        else if (layer._isSymbolInstanceLayer) {
            // This is a virtual layer from a Symbol Instance
            const originalType = layer._originalMasterLayer.type.replace('MSLayer', '').replace('Group', 'Group');
            typeLabel = `${originalType} (in Symbol)`;
        }
        const dimensions = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
        new sketch_1.default.Text({
            text: `${typeLabel} • ${dimensions}`,
            parent: anatomyArtboard,
            frame: new sketch_1.default.Rectangle(panelX + panelPadding + 60, entryY + 28, panelWidth - panelPadding * 2 - 72, 16),
            style: {
                fontSize: 12,
                textColor: textSecondaryColor,
                alignment: 'left'
            },
        });
        // Extract detailed specifications
        const style = layer.style || {};
        const fills = style.fills || [];
        const borders = style.borders || [];
        const shadows = style.shadows || [];
        // Background Color
        const backgroundColor = fills.length && fills[0].enabled ?
            (typeof fills[0].color === 'string' ? fills[0].color : rgbaToHex(fills[0].color)) :
            'None';
        // Border properties
        const borderColor = borders.length && borders[0].enabled ?
            (typeof borders[0].color === 'string' ? borders[0].color : rgbaToHex(borders[0].color)) :
            'None';
        const borderWidth = borders.length && borders[0].enabled ? `${borders[0].thickness}px` : 'None';
        // Corner radius - check multiple possible properties including smart layout frames
        let borderRadius = '0px';
        // Try Sketch object corner radius first (most reliable from logs)
        if (layer.sketchObject && layer.sketchObject.cornerRadius) {
            try {
                const radius = layer.sketchObject.cornerRadius();
                if (radius > 0) {
                    borderRadius = `${radius}px`;
                }
            }
            catch (e) {
                // Corner radius method doesn't exist or failed
            }
        }
        // If no radius found yet, try other methods
        if (borderRadius === '0px') {
            if (style.borderRadius !== undefined && style.borderRadius > 0) {
                borderRadius = `${style.borderRadius}px`;
            }
            else if (layer.style?.borderRadius !== undefined && layer.style.borderRadius > 0) {
                borderRadius = `${layer.style.borderRadius}px`;
            }
            else if (layer.cornerRadius !== undefined && layer.cornerRadius > 0) {
                borderRadius = `${layer.cornerRadius}px`;
            }
            else if (layer.fixedRadius !== undefined && layer.fixedRadius > 0) {
                borderRadius = `${layer.fixedRadius}px`;
            }
            else if (layer.points && layer.points.length > 0 && layer.points[0].cornerRadius !== undefined && layer.points[0].cornerRadius > 0) {
                borderRadius = `${layer.points[0].cornerRadius}px`;
            }
        }
        // For Smart Layout stacks (MSLayerGroup), try additional methods
        if (borderRadius === '0px' && layer.sketchObject && layer.sketchObject.className() === 'MSLayerGroup') {
            try {
                // Check if it's a smart layout with background layer
                if (layer.sketchObject.hasBackgroundColor && layer.sketchObject.hasBackgroundColor()) {
                    // Smart layouts might store radius in style
                    const style = layer.sketchObject.style();
                    if (style && style.contextSettings && style.contextSettings()) {
                        const contextSettings = style.contextSettings();
                        if (contextSettings.borderRadius) {
                            const radius = contextSettings.borderRadius();
                            if (radius > 0) {
                                borderRadius = `${radius}px`;
                            }
                        }
                    }
                }
                // Check background layers for radius
                if (layer.sketchObject.layers && layer.sketchObject.layers()) {
                    const layers = layer.sketchObject.layers();
                    for (let i = 0; i < layers.count(); i++) {
                        const childLayer = layers.objectAtIndex(i);
                        if (childLayer.cornerRadius && childLayer.cornerRadius() > 0) {
                            borderRadius = `${childLayer.cornerRadius()}px`;
                            break;
                        }
                    }
                }
            }
            catch (e) {
                // Smart layout radius detection failed
            }
        }
        // Opacity
        const opacity = layer.style?.opacity !== undefined ? `${Math.round(layer.style.opacity * 100)}%` : '100%';
        // Shadow
        const shadowInfo = shadows.length && shadows[0].enabled ?
            `${shadows[0].x}px ${shadows[0].y}px ${shadows[0].blur}px ${shadows[0].color || '#000'}` :
            'None';
        let specY = entryY + 48;
        const specLineHeight = 14;
        // Create specification lines
        function addSpecLine(label, value, yOffset) {
            new sketch_1.default.Text({
                text: `${label}: ${value}`,
                parent: anatomyArtboard,
                frame: new sketch_1.default.Rectangle(panelX + panelPadding + 60, specY + yOffset, panelWidth - panelPadding * 2 - 72, 12),
                style: {
                    fontSize: 10,
                    textColor: textSecondaryColor,
                    alignment: 'left'
                },
            });
        }
        // Add specifications based on layer type
        if (layer.type === sketch_1.default.Types.Text || (layer._isSymbolInstanceLayer && layer._originalMasterLayer.type === sketch_1.default.Types.Text)) {
            // Text-specific properties
            const textStyle = layer.style || {};
            const fontFamily = textStyle.fontFamily || layer.fontFamily || 'Unknown';
            const fontSize = textStyle.fontSize || layer.fontSize || 'Unknown';
            // Get actual font style name (e.g. "Bold", "Medium Italic", "Light")
            let fontWeight = 'Regular';
            // First try to get the actual font style name from Sketch object (most reliable)
            if (layer.sketchObject && layer.sketchObject.font && layer.sketchObject.font()) {
                const font = layer.sketchObject.font();
                if (font.displayName && font.displayName()) {
                    // Extract style from display name (e.g., "SF Pro Medium Italic" -> "Medium Italic")
                    const displayName = font.displayName();
                    const familyName = font.familyName ? font.familyName() : '';
                    if (familyName && displayName.startsWith(familyName)) {
                        fontWeight = displayName.substring(familyName.length).trim();
                        if (!fontWeight)
                            fontWeight = 'Regular';
                    }
                    else {
                        fontWeight = displayName;
                    }
                }
                else if (font.fontName && font.fontName()) {
                    // Extract style from font name (e.g., "SFPro-MediumItalic" -> "MediumItalic")
                    const fontName = font.fontName();
                    const parts = fontName.split('-');
                    if (parts.length > 1) {
                        fontWeight = parts[parts.length - 1];
                    }
                }
            }
            // Fallback to numeric weight if no style name found
            if (fontWeight === 'Regular') {
                let numericWeight = undefined;
                if (textStyle.fontWeight !== undefined) {
                    numericWeight = textStyle.fontWeight;
                }
                else if (layer.fontWeight !== undefined) {
                    numericWeight = layer.fontWeight;
                }
                else if (layer.font && layer.font.fontWeight !== undefined) {
                    numericWeight = layer.font.fontWeight;
                }
                if (numericWeight !== undefined) {
                    if (typeof numericWeight === 'number') {
                        const weightMap = {
                            100: 'Thin',
                            200: 'ExtraLight',
                            300: 'Light',
                            400: 'Regular',
                            500: 'Medium',
                            600: 'SemiBold',
                            700: 'Bold',
                            800: 'ExtraBold',
                            900: 'Black'
                        };
                        fontWeight = weightMap[numericWeight] || `${numericWeight}`;
                    }
                    else {
                        fontWeight = `${numericWeight}`;
                    }
                }
            }
            const textColor = textStyle.textColor ?
                (typeof textStyle.textColor === 'string' ? textStyle.textColor : rgbaToHex(textStyle.textColor)) :
                textPrimaryColor;
            const lineHeight = textStyle.lineHeight || layer.lineHeight || 'Auto';
            const textAlign = textStyle.alignment || layer.alignment || 'Left';
            addSpecLine('Font', `${fontFamily}`, 0);
            addSpecLine('Weight', `${fontWeight}`, specLineHeight);
            addSpecLine('Size', `${fontSize}px`, specLineHeight * 2);
            addSpecLine('Color', textColor, specLineHeight * 3);
            addSpecLine('Line Height', `${lineHeight}`, specLineHeight * 4);
            addSpecLine('Align', textAlign, specLineHeight * 5);
            if (opacity !== '100%')
                addSpecLine('Opacity', opacity, specLineHeight * 6);
        }
        else if (layer._isSymbolInstanceLayer) {
            // Virtual layer from Symbol Instance - show original layer info + symbol context
            const originalLayer = layer._originalMasterLayer;
            const parentSymbol = layer._parentSymbolInstance;
            addSpecLine('Source', `${originalLayer.type} in Symbol`, 0);
            addSpecLine('Symbol', parentSymbol.name, specLineHeight);
            addSpecLine('Layer Name', originalLayer.name, specLineHeight * 2);
            // Show standard layer properties
            if (backgroundColor !== 'None') {
                addSpecLine('Background', backgroundColor, specLineHeight * 3);
            }
            if (borderColor !== 'None') {
                addSpecLine('Border', `${borderWidth} ${borderColor}`, specLineHeight * 4);
                addSpecLine('Radius', borderRadius, specLineHeight * 5);
            }
            else if (borderRadius !== '0px') {
                addSpecLine('Radius', borderRadius, specLineHeight * 4);
            }
            if (opacity !== '100%')
                addSpecLine('Opacity', opacity, specLineHeight * 6);
        }
        else if (layer.type === 'SymbolInstance' || layer.type === 'SymbolMaster') {
            // Symbol-specific properties
            const symbolType = layer.type === 'SymbolInstance' ? 'Instance' : 'Master';
            addSpecLine('Type', symbolType, 0);
            // For Symbol Instances, show master information
            if (layer.type === 'SymbolInstance') {
                const masterName = layer.symbolMaster ? layer.symbolMaster.name : 'Unknown';
                const symbolId = layer.symbolId || 'Unknown';
                addSpecLine('Master', masterName, specLineHeight);
                addSpecLine('Symbol ID', symbolId, specLineHeight * 2);
                // Check for overrides
                let overrideCount = 0;
                if (layer.overrides && Array.isArray(layer.overrides)) {
                    overrideCount = layer.overrides.filter((override) => !override.isDefault).length;
                }
                addSpecLine('Overrides', `${overrideCount} active`, specLineHeight * 3);
                if (opacity !== '100%')
                    addSpecLine('Opacity', opacity, specLineHeight * 4);
            }
            else {
                // For Symbol Masters, show usage information
                addSpecLine('Master Name', layer.name, specLineHeight);
                // Symbol Master properties
                const masterSymbolId = layer.symbolId || 'Unknown';
                addSpecLine('Symbol ID', masterSymbolId, specLineHeight * 2);
                if (opacity !== '100%')
                    addSpecLine('Opacity', opacity, specLineHeight * 3);
            }
        }
        else {
            // Shape/Group properties
            addSpecLine('Background', backgroundColor, 0);
            if (borderColor !== 'None') {
                addSpecLine('Border', `${borderWidth} ${borderColor}`, specLineHeight);
                addSpecLine('Radius', borderRadius, specLineHeight * 2);
            }
            else {
                addSpecLine('Radius', borderRadius, specLineHeight);
            }
            if (opacity !== '100%')
                addSpecLine('Opacity', opacity, specLineHeight * (borderColor !== 'None' ? 3 : 2));
            if (shadowInfo !== 'None')
                addSpecLine('Shadow', shadowInfo, specLineHeight * (borderColor !== 'None' ? 4 : 3));
        }
    });
    // Clean up any temporary data
    if (globalThis._badgePositions) {
        delete globalThis._badgePositions;
    }
    // Select the new anatomy artboard
    anatomyArtboard.selected = true;
    sketch_1.default.UI.message(`✓ Anatomy specs generated for ${orderedLayers.length} layers`);
} 