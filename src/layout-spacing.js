const sketch = require('sketch');

// Get absolute position of a layer within an artboard (FIXED coordinates)
function getAbsoluteRect(layer, artboard) {
    if (!layer.frame || typeof layer.frame.x !== 'number' || typeof layer.frame.y !== 'number') {
        // Keep this warning as it's useful for error diagnosis
        console.log(`Warning: Layer ${layer.name} has invalid frame, using fallback`);
        return new sketch.Rectangle(0, 0, 100, 100);
    }
    
    // For artboard itself, use its frame directly but relative to (0,0)
    if (layer === artboard) {
        return new sketch.Rectangle(0, 0, artboard.frame.width, artboard.frame.height);
    }
    
    // Use the layer's frame directly - it should already be relative to the artboard
    return new sketch.Rectangle(layer.frame.x, layer.frame.y, layer.frame.width, layer.frame.height);
}

// Get visible layers in order
function getVisibleLayersInOrder(container) {
    let layers = [];
    if (container.layers && Array.isArray(container.layers)) {
        container.layers.forEach((layer) => {
            if (!layer.hidden && !layer.name.startsWith('#meaxure')) {
                layers.push(layer);
                if (layer.type === sketch.Types.Group ||
                    layer.type === sketch.Types.Artboard ||
                    layer.type === 'Frame' ||
                    layer.type === 'SymbolMaster') {
                    layers = layers.concat(getVisibleLayersInOrder(layer));
                }
            }
        });
    }
    return layers;
}

// Function to check if a layer is a stack layout
function isStackLayer(layer) {
    if (!layer || !layer.layers) {
        return false;
    }
    
    // Check for native layout properties (Smart Layout)
    if (layer.layout && (layer.layout.direction || layer.layout.spacing !== undefined)) {
        return true;
    }
    
    // Check for Smart Layout via class name
    if (layer.sketchObject && layer.sketchObject.className() === 'MSLayerGroup') {
        const sketchObject = layer.sketchObject;
        if (sketchObject.hasLayout && sketchObject.hasLayout()) {
            return true;
        }
    }
    
    // TEMP: Debug detection for layers named "Stack" with children
    if (layer.name === 'Stack' && layer.layers && layer.layers.length > 0) {
        return true;
    }
    
    // Check if children are aligned in a stack-like manner
    if (layer.layers && layer.layers.length >= 2) {
        const children = layer.layers;
        
        // Check for vertical alignment
        const verticalAlignment = children.every((child, index) => {
            if (index === 0) return true;
            const prevChild = children[index - 1];
            return Math.abs(child.frame.x - prevChild.frame.x) < 5; // 5px tolerance
        });
        
        if (verticalAlignment) {
            return true;
        }
    }
    
    return false;
}

// NEW: Function to detect if a layer is inside a stack layout
function findParentStack(layer) {
    console.log(`Looking for parent stack of: ${layer.name} (${layer.type})`);
    let currentLayer = layer;
    
    // Traverse up the parent chain looking for a stack
    while (currentLayer && currentLayer.parent) {
        const parent = currentLayer.parent;
        console.log(`  Checking parent: ${parent.name || 'Unnamed'} (${parent.type})`);
        
        // Skip artboard - we don't want to consider artboard as a stack
        if (parent.type === sketch.Types.Artboard) {
            console.log(`  -> Reached artboard, stopping search`);
            break;
        }
        
        if (isStackLayer(parent)) {
            console.log(`  -> Found parent stack: ${parent.name}`);
            return parent;
        }
        
        currentLayer = parent;
    }
    
    console.log(`  -> No parent stack found`);
    return null;
}

// NEW: Function to get siblings of a layer within a stack
function getStackSiblings(layer, parentStack) {
    if (!parentStack || !parentStack.layers) {
        console.log('No parent stack or layers found');
        return [];
    }
    
    // Get all content children (excluding backgrounds)
    const contentChildren = parentStack.layers.filter(child => {
        // Keep text layers and other content
        if (child.type === sketch.Types.Text) return true;
        if (child.type === sketch.Types.Group) return true;
        if (child.type === sketch.Types.Image) return true;
        if (child.type === 'SymbolInstance') return true;
        
        // For Shape layers, exclude if they seem to be backgrounds
        if (child.type === sketch.Types.Shape) {
            const sizeRatio = (child.frame.width * child.frame.height) / (parentStack.frame.width * parentStack.frame.height);
            if (sizeRatio > 0.8) {
                return false; // Likely a background
            }
        }
        
        return true;
    });
    
    return contentChildren;
}

// NEW: Function to calculate spacing between siblings in a stack
function calculateSiblingSpacing(focusedLayer, parentStack) {
    const siblings = getStackSiblings(focusedLayer, parentStack);
    const stackProps = getStackProperties(parentStack);
    
    if (!stackProps || siblings.length < 2) {
        return null;
    }
    
    // Sort siblings by position based on stack direction
    const sortedSiblings = siblings.slice().sort((a, b) => {
        if (stackProps.direction === 'horizontal') {
            return a.frame.x - b.frame.x;
        } else {
            return a.frame.y - b.frame.y;
        }
    });
    
    // Find the focused layer's position in the sorted list
    const focusedIndex = sortedSiblings.findIndex(sibling => sibling.name === focusedLayer.name && sibling.type === focusedLayer.type);
    
    if (focusedIndex === -1) {
        return null;
    }
    
    const spacing = {};
    
    // Calculate spacing to previous sibling
    if (focusedIndex > 0) {
        const prevSibling = sortedSiblings[focusedIndex - 1];
        const focusedRect = getAbsoluteRect(focusedLayer, parentStack);
        const prevRect = getAbsoluteRect(prevSibling, parentStack);
        
        if (stackProps.direction === 'horizontal') {
            spacing.previous = {
                distance: focusedRect.x - (prevRect.x + prevRect.width),
                direction: 'left',
                targetName: prevSibling.name,
                targetLayer: prevSibling
            };
        } else {
            spacing.previous = {
                distance: focusedRect.y - (prevRect.y + prevRect.height),
                direction: 'top',
                targetName: prevSibling.name,
                targetLayer: prevSibling
            };
        }
    }
    
    // Calculate spacing to next sibling
    if (focusedIndex < sortedSiblings.length - 1) {
        const nextSibling = sortedSiblings[focusedIndex + 1];
        const focusedRect = getAbsoluteRect(focusedLayer, parentStack);
        const nextRect = getAbsoluteRect(nextSibling, parentStack);
        
        if (stackProps.direction === 'horizontal') {
            spacing.next = {
                distance: nextRect.x - (focusedRect.x + focusedRect.width),
                direction: 'right',
                targetName: nextSibling.name,
                targetLayer: nextSibling
            };
        } else {
            spacing.next = {
                distance: nextRect.y - (focusedRect.y + focusedRect.height),
                direction: 'bottom',
                targetName: nextSibling.name,
                targetLayer: nextSibling
            };
        }
    }
    
    return {
        parentStackName: parentStack.name,
        stackDirection: stackProps.direction,
        totalSiblings: siblings.length,
        focusedIndex: focusedIndex,
        spacing: spacing
    };
}

// NEW: Function to draw sibling spacing measurements
function drawSiblingSpacing(measurementsGroup, focusedLayer, parentStack, originalArtboard) {
    const siblingInfo = calculateSiblingSpacing(focusedLayer, parentStack);
    
    if (!siblingInfo) {
        return;
    }
    
    const focusedRect = getAbsoluteRect(focusedLayer, originalArtboard);
    const lineColor = '#00FF00'; // Bright green for sibling spacing
    const lineThickness = 2; // Clean, simple line
    
    // Draw spacing to previous sibling
    if (siblingInfo.spacing.previous) {
        const spacing = siblingInfo.spacing.previous;
        const targetRect = getAbsoluteRect(spacing.targetLayer, originalArtboard);
        const distance = Math.round(spacing.distance);
        
        // FIXED: Use absolute coordinates for the duplicated artboard
        // Since the duplicated content is at (0,0) in the new artboard, we use coordinates directly
        const focusedX = focusedRect.x;
        const focusedY = focusedRect.y;
        const targetX = targetRect.x;
        const targetY = targetRect.y;
        
        let lineX1, lineY1, lineX2, lineY2, textX, textY;
        
        if (spacing.direction === 'left') {
            // Horizontal spacing (previous sibling to the left) - simple line between elements
            lineX1 = targetX + targetRect.width;
            lineY1 = targetY + targetRect.height / 2;
            lineX2 = focusedX;
            lineY2 = lineY1;
            textX = lineX1 + distance / 2;
            textY = lineY1 - 8;
        } else {
            // Vertical spacing (previous sibling above) - simple line between elements
            lineX1 = targetX + targetRect.width / 2;
            lineY1 = targetY + targetRect.height;
            lineX2 = lineX1;
            lineY2 = focusedY;
            textX = lineX1 + 8; // Small offset to the right
            textY = lineY1 + distance / 2;
        }
        
        console.log(`Drawing line to previous sibling: ${spacing.targetLayer.name}`);
        console.log(`Using coordinates directly: focused(${focusedX},${focusedY}), target(${targetX},${targetY})`);
        console.log(`Line coordinates: (${lineX1},${lineY1}) to (${lineX2},${lineY2}), distance: ${distance}px`);
        
        // Draw the spacing line
        if (distance > 0) {
            // For vertical lines, we need proper width/height
            let lineWidth, lineHeight;
            if (lineX1 === lineX2) {
                // Vertical line
                lineWidth = lineThickness;
                lineHeight = Math.abs(lineY2 - lineY1);
            } else {
                // Horizontal line
                lineWidth = Math.abs(lineX2 - lineX1);
                lineHeight = lineThickness;
            }
            
            const rectX = Math.min(lineX1, lineX2) - (lineX1 === lineX2 ? lineThickness/2 : 0);
            const rectY = Math.min(lineY1, lineY2) - (lineY1 === lineY2 ? lineThickness/2 : 0);
            
            console.log(`Creating shape: x=${rectX}, y=${rectY}, width=${lineWidth}, height=${lineHeight}`);
            
            // SOLUTION: Create measurement directly at artboard level instead of in a group
            const measurementLine = new sketch.Shape({
                parent: measurementsGroup.parent, // Use artboard as parent instead of measurementsGroup
                frame: new sketch.Rectangle(rectX, rectY, lineWidth, lineHeight),
                style: {
                    fills: [{ color: lineColor, fillType: sketch.Style.FillType.Color, enabled: true }],
                    borders: [],
                },
            });
            
            console.log(`DEBUG: Line created at actual frame: x=${measurementLine.frame.x}, y=${measurementLine.frame.y}, width=${measurementLine.frame.width}, height=${measurementLine.frame.height}`);
            
            // Move to front to ensure visibility
            measurementLine.moveToFront();
            
            // Draw distance label at artboard level
            const distanceLabel1 = new sketch.Text({
                text: `${distance}px`,
                parent: measurementsGroup.parent, // Use artboard as parent instead of measurementsGroup
                frame: new sketch.Rectangle(textX - 15, textY - 6, 30, 12),
                style: {
                    fontSize: 10,
                    textColor: lineColor,
                    alignment: 'center'
                },
            });
            
            console.log(`DEBUG: Distance label created at: x=${distanceLabel1.frame.x}, y=${distanceLabel1.frame.y}, width=${distanceLabel1.frame.width}, height=${distanceLabel1.frame.height}`);
            
            // Move to front to ensure visibility
            distanceLabel1.moveToFront();
        }
    }
    
    // Draw spacing to next sibling
    if (siblingInfo.spacing.next) {
        const spacing = siblingInfo.spacing.next;
        const targetRect = getAbsoluteRect(spacing.targetLayer, originalArtboard);
        const distance = Math.round(spacing.distance);
        
        // FIXED: Use absolute coordinates for the duplicated artboard
        const focusedX = focusedRect.x;
        const focusedY = focusedRect.y;
        const targetX = targetRect.x;
        const targetY = targetRect.y;
        
        let lineX1, lineY1, lineX2, lineY2, textX, textY;
        
        if (spacing.direction === 'right') {
            // Horizontal spacing (next sibling to the right) - simple line between elements
            lineX1 = focusedX + focusedRect.width;
            lineY1 = focusedY + focusedRect.height / 2;
            lineX2 = targetX;
            lineY2 = lineY1;
            textX = lineX1 + distance / 2;
            textY = lineY1 - 8;
        } else {
            // Vertical spacing (next sibling below) - simple line between elements
            lineX1 = focusedX + focusedRect.width / 2;
            lineY1 = focusedY + focusedRect.height;
            lineX2 = lineX1;
            lineY2 = targetY;
            textX = lineX1 + 8; // Small offset to the right
            textY = lineY1 + distance / 2;
        }
        
        // Draw the spacing line
        if (distance > 0) {
            // For vertical lines, we need proper width/height
            let lineWidth, lineHeight;
            if (lineX1 === lineX2) {
                // Vertical line
                lineWidth = lineThickness;
                lineHeight = Math.abs(lineY2 - lineY1);
            } else {
                // Horizontal line
                lineWidth = Math.abs(lineX2 - lineX1);
                lineHeight = lineThickness;
            }
            
            // SOLUTION: Create measurement directly at artboard level instead of in a group
            const measurementLine2 = new sketch.Shape({
                parent: measurementsGroup.parent, // Use artboard as parent instead of measurementsGroup
                frame: new sketch.Rectangle(
                    Math.min(lineX1, lineX2) - (lineX1 === lineX2 ? lineThickness/2 : 0),
                    Math.min(lineY1, lineY2) - (lineY1 === lineY2 ? lineThickness/2 : 0),
                    lineWidth,
                    lineHeight
                ),
                style: {
                    fills: [{ color: lineColor, fillType: sketch.Style.FillType.Color, enabled: true }],
                    borders: [],
                },
            });
            
            // Move to front to ensure visibility
            measurementLine2.moveToFront();
            
            // Draw distance label at artboard level
            const distanceLabel2 = new sketch.Text({
                text: `${distance}px`,
                parent: measurementsGroup.parent, // Use artboard as parent instead of measurementsGroup
                frame: new sketch.Rectangle(textX - 15, textY - 6, 30, 12),
                style: {
                    fontSize: 10,
                    textColor: lineColor,
                    alignment: 'center'
                },
            });
            
            // Move to front to ensure visibility
            distanceLabel2.moveToFront();
        }
    }
    
    return siblingInfo;
}

// Function to get tight content bounds for a layer
function getTightContentBounds(layer) {
    // For text layers, calculate actual text bounds
    if (layer.type === sketch.Types.Text) {
        // Use the layer's frame as-is for text - Sketch should handle text bounds correctly
        return {
            x: layer.frame.x,
            y: layer.frame.y,
            width: layer.frame.width,
            height: layer.frame.height
        };
    }
    
    // For other layers, use frame bounds
    return {
        x: layer.frame.x,
        y: layer.frame.y,
        width: layer.frame.width,
        height: layer.frame.height
    };
}

// Function to get stack properties including calculated padding
function getStackProperties(layer) {
    if (!isStackLayer(layer)) {
        return null;
    }
    
    const stackFrame = layer.frame;
    
    // Get all immediate children, excluding background layers
    const allChildren = layer.layers || [];
    
    // Filter out background layers (typically Shape layers at the bottom)
    const contentChildren = allChildren.filter(child => {
        // Keep text layers and other content
        if (child.type === sketch.Types.Text) return true;
        if (child.type === sketch.Types.Group) return true;
        if (child.type === sketch.Types.Image) return true;
        if (child.type === 'SymbolInstance') return true;
        
        // For Shape layers, exclude if they seem to be backgrounds
        if (child.type === sketch.Types.Shape) {
            // If it's roughly the same size as the parent, it's likely a background
            const sizeRatio = (child.frame.width * child.frame.height) / (stackFrame.width * stackFrame.height);
            if (sizeRatio > 0.8) {
                return false; // Likely a background
            }
        }
        
        return true;
    });
    
    if (contentChildren.length === 0) {
        return null;
    }
    
    // Calculate content bounding box using tight bounds
    let contentMinX = Infinity;
    let contentMinY = Infinity;
    let contentMaxX = -Infinity;
    let contentMaxY = -Infinity;
    
    contentChildren.forEach(child => {
        const tightBounds = getTightContentBounds(child);
        
        // Convert to absolute coordinates within the stack
        const childX = tightBounds.x;
        const childY = tightBounds.y;
        
        contentMinX = Math.min(contentMinX, childX);
        contentMinY = Math.min(contentMinY, childY);
        contentMaxX = Math.max(contentMaxX, childX + tightBounds.width);
        contentMaxY = Math.max(contentMaxY, childY + tightBounds.height);
    });
    
    const contentWidth = contentMaxX - contentMinX;
    const contentHeight = contentMaxY - contentMinY;
    const containerWidth = stackFrame.width;
    const containerHeight = stackFrame.height;
    
    // Detect if this is a "Fit" mode container (much wider than content)
    let effectiveWidth = containerWidth;
    
    // If container is much wider than content, assume "Fit" mode
    if (containerWidth > contentWidth + 100) {
        effectiveWidth = contentWidth + (contentMinX * 2); // content width + padding on both sides
    }
    
    // Calculate padding
    const topPadding = contentMinY;
    const leftPadding = contentMinX;
    const bottomPadding = containerHeight - contentMaxY;
    const rightPadding = effectiveWidth - contentMaxX;
    
    // Snap to common padding values
    const snapToPadding = (value) => {
        const commonPaddings = [0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64];
        return commonPaddings.find(p => Math.abs(value - p) <= 2) || Math.round(value);
    };
    
    const snappedTop = snapToPadding(topPadding);
    const snappedLeft = snapToPadding(leftPadding);
    const snappedBottom = snapToPadding(bottomPadding);
    const snappedRight = snapToPadding(rightPadding);
    
    // Determine direction based on layout
    let direction = 'vertical';
    if (contentChildren.length >= 2) {
        const firstChild = contentChildren[0];
        const secondChild = contentChildren[1];
        
        // If children are more horizontally aligned, it's horizontal
        if (Math.abs(firstChild.frame.y - secondChild.frame.y) < Math.abs(firstChild.frame.x - secondChild.frame.x)) {
            direction = 'horizontal';
        }
    }
    
    const properties = {
        direction: direction,
        padding: {
            top: snappedTop,
            left: snappedLeft,
            bottom: snappedBottom,
            right: snappedRight
        },
        spacing: 8 // Default spacing
    };
    
    return properties;
}

// Calculate spacing between layers
function calculateSpacing(focusedLayer, otherLayer, originalArtboard) {
    const focusedRect = getAbsoluteRect(focusedLayer, originalArtboard);
    const otherRect = getAbsoluteRect(otherLayer, originalArtboard);
    
    const fRect = {
        x: focusedRect.x,
        y: focusedRect.y,
        width: focusedRect.width,
        height: focusedRect.height
    };
    const oRect = {
        x: otherRect.x,
        y: otherRect.y,
        width: otherRect.width,
        height: otherRect.height
    };
    
    // Calculate minimum distances
    const distances = [];
    
    // Top
    if (oRect.y + oRect.height <= fRect.y) {
        distances.push({
            direction: 'top',
            distance: fRect.y - (oRect.y + oRect.height),
            target: 'layer',
            targetName: otherLayer.name,
            targetPosition: { x: oRect.x, y: oRect.y },
            targetSize: { width: oRect.width, height: oRect.height }
        });
    }
    
    // Bottom
    if (oRect.y >= fRect.y + fRect.height) {
        distances.push({
            direction: 'bottom',
            distance: oRect.y - (fRect.y + fRect.height),
            target: 'layer',
            targetName: otherLayer.name,
            targetPosition: { x: oRect.x, y: oRect.y },
            targetSize: { width: oRect.width, height: oRect.height }
        });
    }
    
    // Left
    if (oRect.x + oRect.width <= fRect.x) {
        distances.push({
            direction: 'left',
            distance: fRect.x - (oRect.x + oRect.width),
            target: 'layer',
            targetName: otherLayer.name,
            targetPosition: { x: oRect.x, y: oRect.y },
            targetSize: { width: oRect.width, height: oRect.height }
        });
    }
    
    // Right
    if (oRect.x >= fRect.x + fRect.width) {
        distances.push({
            direction: 'right',
            distance: oRect.x - (fRect.x + fRect.width),
            target: 'layer',
            targetName: otherLayer.name,
            targetPosition: { x: oRect.x, y: oRect.y },
            targetSize: { width: oRect.width, height: oRect.height }
        });
    }
    
    return distances;
}

// Helper function to draw a spacing line with proper styling
function drawSpacingLine(measurementsGroup, direction, distance, targetName, color) {
    // Colors for different target types
    const lineColor = targetName === 'artboard edge' ? '#9966FF' : '#FF0000'; // Purple for artboard, red for layers
    const lineThickness = 2;
    
    // This is a placeholder - the actual visual drawing will be implemented in drawDirectionalSpacing
    // where we have access to the coordinates
}

// Function to draw directional spacing measurements
function drawDirectionalSpacing(measurementsGroup, focusedLayer, otherLayers, originalArtboard) {
    const focusedRect = getAbsoluteRect(focusedLayer, originalArtboard);
    const artboardRect = { x: 0, y: 0, width: originalArtboard.frame.width, height: originalArtboard.frame.height };
    
    // Find closest layers/edges in each direction
    const directions = {
        top: { distance: focusedRect.y, target: 'artboard', targetName: 'artboard edge' },
        bottom: { distance: artboardRect.height - (focusedRect.y + focusedRect.height), target: 'artboard', targetName: 'artboard edge' },
        left: { distance: focusedRect.x, target: 'artboard', targetName: 'artboard edge' },
        right: { distance: artboardRect.width - (focusedRect.x + focusedRect.width), target: 'artboard', targetName: 'artboard edge' }
    };
    
    // Check for closer layers
    otherLayers.forEach(layer => {
        if (layer !== focusedLayer) {
            const spacings = calculateSpacing(focusedLayer, layer, originalArtboard);
            spacings.forEach(spacing => {
                if (!directions[spacing.direction] || spacing.distance < directions[spacing.direction].distance) {
                    directions[spacing.direction] = spacing;
                }
            });
        }
    });
    
    // Draw visual spacing lines for each direction
    Object.keys(directions).forEach(direction => {
        const spacing = directions[direction];
        if (spacing && spacing.distance >= 0) {
            drawSpacingLine(measurementsGroup, direction, Math.round(spacing.distance), spacing.targetName, '#FF0000');
            
            // Draw the actual visual spacing line
            const lineColor = spacing.target === 'artboard' ? '#9966FF' : '#FF0000'; // Purple for artboard, red for layers
            const lineThickness = 2;
            const distance = Math.round(spacing.distance);
            
            // Calculate line coordinates based on direction
            let lineX1, lineY1, lineX2, lineY2, textX, textY;
            
            switch (direction) {
                case 'top':
                    lineX1 = focusedRect.x + focusedRect.width / 2;
                    lineY1 = focusedRect.y;
                    lineX2 = lineX1;
                    lineY2 = focusedRect.y - distance;
                    textX = lineX1 + 10;
                    textY = lineY1 - distance / 2;
                    break;
                case 'bottom':
                    lineX1 = focusedRect.x + focusedRect.width / 2;
                    lineY1 = focusedRect.y + focusedRect.height;
                    lineX2 = lineX1;
                    lineY2 = lineY1 + distance;
                    textX = lineX1 + 10;
                    textY = lineY1 + distance / 2;
                    break;
                case 'left':
                    lineX1 = focusedRect.x;
                    lineY1 = focusedRect.y + focusedRect.height / 2;
                    lineX2 = focusedRect.x - distance;
                    lineY2 = lineY1;
                    textX = lineX1 - distance / 2;
                    textY = lineY1 - 10;
                    break;
                case 'right':
                    lineX1 = focusedRect.x + focusedRect.width;
                    lineY1 = focusedRect.y + focusedRect.height / 2;
                    lineX2 = lineX1 + distance;
                    lineY2 = lineY1;
                    textX = lineX1 + distance / 2;
                    textY = lineY1 - 10;
                    break;
            }
            
            // Draw the spacing line
            if (distance > 0) {
                new sketch.Shape({
                    parent: measurementsGroup,
                    frame: new sketch.Rectangle(
                        Math.min(lineX1, lineX2) - lineThickness/2,
                        Math.min(lineY1, lineY2) - lineThickness/2,
                        Math.abs(lineX2 - lineX1) + lineThickness,
                        Math.abs(lineY2 - lineY1) + lineThickness
                    ),
                    style: {
                        fills: [{ color: lineColor, fillType: sketch.Style.FillType.Color, enabled: true }],
                        borders: [],
                    },
                });
                
                // Draw distance label
                new sketch.Text({
                    text: `${distance}px`,
                    parent: measurementsGroup,
                    frame: new sketch.Rectangle(textX - 20, textY - 8, 40, 16),
                    style: {
                        fontSize: 11,
                        textColor: lineColor,
                        alignment: 'center'
                    },
                });
            }
        }
    });
    
    return directions;
}

// Generate focused layer specs
function generateFocusedLayerSpecs(focusedLayer, allLayers, originalArtboard) {
    const focusedRect = getAbsoluteRect(focusedLayer, originalArtboard);
    const artboardRect = { x: 0, y: 0, width: originalArtboard.frame.width, height: originalArtboard.frame.height };
    
    // Calculate directional spacing
    const directionalSpacing = {};
    const otherLayers = allLayers.filter(layer => layer !== focusedLayer);
    
    // Find closest elements in each direction
    const directions = ['top', 'bottom', 'left', 'right'];
    
    directions.forEach(direction => {
        let closest = null;
        let minDistance = Infinity;
        
        // Check artboard edges
        let edgeDistance;
        switch (direction) {
            case 'top':
                edgeDistance = focusedRect.y;
                break;
            case 'bottom':
                edgeDistance = artboardRect.height - (focusedRect.y + focusedRect.height);
                break;
            case 'left':
                edgeDistance = focusedRect.x;
                break;
            case 'right':
                edgeDistance = artboardRect.width - (focusedRect.x + focusedRect.width);
                break;
        }
        
        if (edgeDistance < minDistance) {
            minDistance = edgeDistance;
            closest = {
                target: 'artboard',
                targetName: 'artboard edge',
                distance: Math.round(edgeDistance)
            };
        }
        
        // Check other layers
        otherLayers.forEach(layer => {
            const spacings = calculateSpacing(focusedLayer, layer, originalArtboard);
            const directionSpacing = spacings.find(s => s.direction === direction);
            if (directionSpacing && directionSpacing.distance < minDistance) {
                minDistance = directionSpacing.distance;
                closest = {
                    target: 'layer',
                    targetName: directionSpacing.targetName,
                    distance: Math.round(directionSpacing.distance),
                    targetPosition: directionSpacing.targetPosition,
                    targetSize: directionSpacing.targetSize
                };
            }
        });
        
        directionalSpacing[direction] = closest;
    });
    
    const specs = {
        artboard: {
            name: originalArtboard.name,
            width: originalArtboard.frame.width,
            height: originalArtboard.frame.height
        },
        focusedLayer: {
            name: focusedLayer.name,
            type: focusedLayer.type,
            position: {
                x: focusedRect.x,
                y: focusedRect.y
            },
            size: {
                width: focusedRect.width,
                height: focusedRect.height
            },
            directionalSpacing: directionalSpacing
        }
    };
    
    return specs;
}

// Draw Stack specifications panel with beautiful design
function drawStackSpecificationsPanel(artboard, stackLayers, originalArtboard, debugMode = false, focusedLayer = null, siblingInfo = null) {
    const panelWidth = 360;
    const panelHeight = 320;
    const panelX = originalArtboard.frame.width + 60;
    const panelY = 50;
    
    // Modern gradient background
    new sketch.Shape({
        parent: artboard,
        frame: new sketch.Rectangle(panelX, panelY, panelWidth, panelHeight),
        style: {
            fills: [{ 
                color: '#FFFFFF', 
                fillType: sketch.Style.FillType.Color, 
                enabled: true 
            }],
            borders: [{ 
                color: '#E8E8E8', 
                thickness: 1, 
                enabled: true 
            }],
            shadows: [{
                color: '#00000015',
                x: 0,
                y: 8,
                blur: 24,
                spread: 0,
                enabled: true
            }]
        },
    });
    
    // Header gradient bar
    new sketch.Shape({
        parent: artboard,
        frame: new sketch.Rectangle(panelX, panelY, panelWidth, 4),
        style: {
            fills: [{ 
                color: '#007AFF', 
                fillType: sketch.Style.FillType.Color, 
                enabled: true 
            }],
            borders: []
        },
    });
    
    // Panel title with modern typography
    const title = focusedLayer ? 'Stack Layout Analysis' : 'Stack Layout Properties';
    const subtitle = focusedLayer ? 
        `"${focusedLayer.name}" • Stack Layout` : 
        `${stackLayers.length} stack layout${stackLayers.length !== 1 ? 's' : ''} detected`;
    
    new sketch.Text({
        text: title,
        parent: artboard,
        frame: new sketch.Rectangle(panelX + 24, panelY + 32, panelWidth - 48, 28),
        style: {
            fontSize: 20,
            fontWeight: 600,
            textColor: '#1D1D1F',
            alignment: 'left'
        },
    });
    
    new sketch.Text({
        text: subtitle,
        parent: artboard,
        frame: new sketch.Rectangle(panelX + 24, panelY + 64, panelWidth - 48, 18),
        style: {
            fontSize: 13,
            textColor: '#86868B',
            alignment: 'left'
        },
    });
    
    // Stack entries with modern card design
    let entryY = panelY + 110;
    const layersToShow = focusedLayer ? [focusedLayer] : stackLayers;
    
    layersToShow.forEach((stack, index) => {
        const stackProps = getStackProperties(stack);
        
        if (stackProps) {
            // Stack card background
            new sketch.Shape({
                parent: artboard,
                frame: new sketch.Rectangle(panelX + 24, entryY, panelWidth - 48, 180),
                style: {
                    fills: [{ 
                        color: '#F8F9FA', 
                        fillType: sketch.Style.FillType.Color, 
                        enabled: true 
                    }],
                    borders: [{ 
                        color: '#E9ECEF', 
                        thickness: 1, 
                        enabled: true 
                    }],
                },
            });
            
            // Stack icon and name
            new sketch.Text({
                text: '📦',
                parent: artboard,
                frame: new sketch.Rectangle(panelX + 40, entryY + 20, 20, 20),
                style: {
                    fontSize: 16,
                    alignment: 'left'
                },
            });
            
            new sketch.Text({
                text: stack.name,
                parent: artboard,
                frame: new sketch.Rectangle(panelX + 68, entryY + 20, panelWidth - 92, 20),
                style: {
                    fontSize: 16,
                    fontWeight: 500,
                    textColor: '#1D1D1F',
                    alignment: 'left'
                },
            });
            
            // Properties section
            let propY = entryY + 56;
            
            // Padding section header
            new sketch.Text({
                text: '📐 Padding',
                parent: artboard,
                frame: new sketch.Rectangle(panelX + 40, propY, 120, 16),
                style: {
                    fontSize: 12,
                    fontWeight: 500,
                    textColor: '#495057',
                    alignment: 'left'
                },
            });
            propY += 24;
            
            // Padding grid (2x2)
            const paddingProps = [
                { label: 'Top', value: `${stackProps.padding.top}px`, x: 0, y: 0 },
                { label: 'Right', value: `${stackProps.padding.right}px`, x: 1, y: 0 },
                { label: 'Bottom', value: `${stackProps.padding.bottom}px`, x: 0, y: 1 },
                { label: 'Left', value: `${stackProps.padding.left}px`, x: 1, y: 1 }
            ];
            
            paddingProps.forEach((prop) => {
                const x = panelX + 40 + (prop.x * 120);
                const y = propY + (prop.y * 28);
                
                // Padding label
                new sketch.Text({
                    text: prop.label,
                    parent: artboard,
                    frame: new sketch.Rectangle(x, y, 60, 14),
                    style: {
                        fontSize: 11,
                        textColor: '#6C757D',
                        alignment: 'left'
                    },
                });
                
                // Padding value with accent color
                new sketch.Text({
                    text: prop.value,
                    parent: artboard,
                    frame: new sketch.Rectangle(x + 60, y, 50, 14),
                    style: {
                        fontSize: 11,
                        fontWeight: 500,
                        textColor: '#007AFF',
                        alignment: 'left'
                    },
                });
            });
            
            // Add sibling spacing information if available
            if (siblingInfo && focusedLayer) {
                propY += 80; // Space after padding grid
                
                // Sibling spacing section header
                new sketch.Text({
                    text: '🔗 Sibling Spacing',
                    parent: artboard,
                    frame: new sketch.Rectangle(panelX + 40, propY, 150, 16),
                    style: {
                        fontSize: 12,
                        fontWeight: 500,
                        textColor: '#495057',
                        alignment: 'left'
                    },
                });
                propY += 24;
                
                // Stack info
                new sketch.Text({
                    text: `In "${siblingInfo.parentStackName}" (${siblingInfo.stackDirection})`,
                    parent: artboard,
                    frame: new sketch.Rectangle(panelX + 40, propY, panelWidth - 80, 14),
                    style: {
                        fontSize: 11,
                        textColor: '#6C757D',
                        alignment: 'left'
                    },
                });
                propY += 20;
                
                // Position info
                new sketch.Text({
                    text: `Position: ${siblingInfo.focusedIndex + 1} of ${siblingInfo.totalSiblings}`,
                    parent: artboard,
                    frame: new sketch.Rectangle(panelX + 40, propY, panelWidth - 80, 14),
                    style: {
                        fontSize: 11,
                        textColor: '#6C757D',
                        alignment: 'left'
                    },
                });
                propY += 24;
                
                // Spacing to previous sibling
                if (siblingInfo.spacing.previous) {
                    new sketch.Text({
                        text: `← ${siblingInfo.spacing.previous.targetName}`,
                        parent: artboard,
                        frame: new sketch.Rectangle(panelX + 40, propY, 120, 14),
                        style: {
                            fontSize: 11,
                            textColor: '#6C757D',
                            alignment: 'left'
                        },
                    });
                    
                    new sketch.Text({
                        text: `${siblingInfo.spacing.previous.distance}px`,
                        parent: artboard,
                        frame: new sketch.Rectangle(panelX + 160, propY, 50, 14),
                        style: {
                            fontSize: 11,
                            fontWeight: 500,
                            textColor: '#00AA00',
                            alignment: 'left'
                        },
                    });
                    propY += 20;
                }
                
                // Spacing to next sibling
                if (siblingInfo.spacing.next) {
                    new sketch.Text({
                        text: `→ ${siblingInfo.spacing.next.targetName}`,
                        parent: artboard,
                        frame: new sketch.Rectangle(panelX + 40, propY, 120, 14),
                        style: {
                            fontSize: 11,
                            textColor: '#6C757D',
                            alignment: 'left'
                        },
                    });
                    
                    new sketch.Text({
                        text: `${siblingInfo.spacing.next.distance}px`,
                        parent: artboard,
                        frame: new sketch.Rectangle(panelX + 160, propY, 50, 14),
                        style: {
                            fontSize: 11,
                            fontWeight: 500,
                            textColor: '#00AA00',
                            alignment: 'left'
                        },
                    });
                    propY += 20;
                }
                
                // Note about green lines
                new sketch.Text({
                    text: '📍 Green lines show sibling spacing',
                    parent: artboard,
                    frame: new sketch.Rectangle(panelX + 40, propY, panelWidth - 80, 14),
                    style: {
                        fontSize: 10,
                        textColor: '#00AA00',
                        alignment: 'left'
                    },
                });
            }
            
            entryY += 200; // Space between entries
        }
    });
}

// Main function to create layout spacing specs
function createLayoutSpacingSpecs(originalArtboard, focusedLayer = null) {
    const allLayers = getVisibleLayersInOrder(originalArtboard);
    
    // Detect stack layers
    const stackLayers = [];
    
    if (focusedLayer) {        
        if (isStackLayer(focusedLayer)) {
            stackLayers.push(focusedLayer);
        }
    } else {
        // Check all layers
        allLayers.forEach(layer => {
            if (isStackLayer(layer)) {
                stackLayers.push(layer);
            }
        });
    }
    
    // Create spacing artboard with proper height to fit the panel
    const panelWidth = 360;
    const panelHeight = 320;
    const panelY = 50;
    const bottomMargin = 100; // Extra space at bottom
    const panelX = originalArtboard.frame.width + 60;
    const rightMargin = 40; // Extra space after panel
    const minArtboardHeight = Math.max(
        originalArtboard.frame.height, 
        panelY + panelHeight + bottomMargin
    );
    
    // Calculate artboard width to accommodate the panel properly
    const artboardWidth = panelX + panelWidth + rightMargin;
    
    const spacingArtboard = new sketch.Artboard({
        name: `Spacing: ${originalArtboard.name}`,
        parent: originalArtboard.parent,
        frame: new sketch.Rectangle(
            originalArtboard.frame.x + originalArtboard.frame.width + 120,
            originalArtboard.frame.y,
            artboardWidth,
            minArtboardHeight
        ),
    });
    
    // Add light grey background for better contrast
    new sketch.Shape({
        parent: spacingArtboard,
        frame: new sketch.Rectangle(0, 0, spacingArtboard.frame.width, spacingArtboard.frame.height),
        style: {
            fills: [{ color: '#F8F9FA', fillType: sketch.Style.FillType.Color, enabled: true }],
            borders: [],
        },
    });
    
    // Duplicate original artboard content
    const duplicatedContent = originalArtboard.duplicate();
    duplicatedContent.parent = spacingArtboard;
    duplicatedContent.frame.x = 0;
    duplicatedContent.frame.y = 0;
    duplicatedContent.selected = false;
    
    // Initialize siblingInfo for use in panel
    let siblingInfo = null;
    
    // Draw spacing measurements if focused layer is provided
    if (focusedLayer) {
        // Create measurements group at the top level, completely separate from any layout influence
        const measurementsGroup = new sketch.Group({
            name: 'Spacing Measurements',
            parent: spacingArtboard,
        });
        
        // Move the measurements group to the front and ensure it's not affected by any layout
        measurementsGroup.moveToFront();
        measurementsGroup.locked = false;
        
        // CRITICAL: Apply absolute positioning constraints to the measurements group itself
        // This prevents Stack Layout from repositioning the entire group
        
        // SOLUTION: Set "ignore stack layout" programmatically 
        if (measurementsGroup.sketchObject) {
            // Try different possible property names for "ignore stack layout"
            if (measurementsGroup.sketchObject.setIsIgnoredForStackLayout) {
                measurementsGroup.sketchObject.setIsIgnoredForStackLayout(true);
                console.log(`DEBUG: Set isIgnoredForStackLayout to true`);
            } else if (measurementsGroup.sketchObject.setIgnoreStackLayout) {
                measurementsGroup.sketchObject.setIgnoreStackLayout(true);
                console.log(`DEBUG: Set ignoreStackLayout to true`);
            } else if (measurementsGroup.sketchObject.setIsExcludedFromLayout) {
                measurementsGroup.sketchObject.setIsExcludedFromLayout(true);
                console.log(`DEBUG: Set isExcludedFromLayout to true`);
            } else if (measurementsGroup.sketchObject.setExcludeFromLayout) {
                measurementsGroup.sketchObject.setExcludeFromLayout(true);
                console.log(`DEBUG: Set excludeFromLayout to true`);
            } else {
                console.log(`DEBUG: Could not find ignore stack layout property`);
            }
        }
        
        if (measurementsGroup.sketchObject && measurementsGroup.sketchObject.setConstrainProportions) {
            measurementsGroup.sketchObject.setConstrainProportions(false);
        }
        if (measurementsGroup.sketchObject && measurementsGroup.sketchObject.hasFixedLeft) {
            measurementsGroup.sketchObject.setHasFixedLeft(true);
            measurementsGroup.sketchObject.setHasFixedTop(true);
            measurementsGroup.sketchObject.setHasFixedRight(false);
            measurementsGroup.sketchObject.setHasFixedBottom(false);
            measurementsGroup.sketchObject.setHasFixedWidth(true);
            measurementsGroup.sketchObject.setHasFixedHeight(true);
        }
        
        // Add cyan highlight for the focused layer
        const focusedRect = getAbsoluteRect(focusedLayer, originalArtboard);
        // Use coordinates directly since duplicated content is at (0,0) in new artboard
        const highlightX = focusedRect.x;
        const highlightY = focusedRect.y;
        const highlightShape = new sketch.Shape({
            parent: spacingArtboard, // Use artboard as parent instead of measurementsGroup
            frame: new sketch.Rectangle(highlightX - 2, highlightY - 2, focusedRect.width + 4, focusedRect.height + 4),
            style: {
                fills: [{ color: '#00D4FF66', fillType: sketch.Style.FillType.Color, enabled: true }], // Cyan with opacity
                borders: [{ color: '#00D4FF', thickness: 2, enabled: true }],
            },
        });
        
        // Move to front to ensure visibility
        highlightShape.moveToFront();
        
        // Find parent stack for sibling spacing analysis
        const parentStack = findParentStack(focusedLayer);
        
        console.log(`=== SIBLING SPACING DEBUG ===`);
        console.log(`Focused layer: ${focusedLayer.name} (${focusedLayer.type})`);
        console.log(`Parent stack found: ${parentStack ? parentStack.name : 'None'}`);
        
        if (parentStack) {
            console.log(`Parent stack type: ${parentStack.type}`);
            console.log(`Parent stack children count: ${parentStack.layers ? parentStack.layers.length : 0}`);
            
            // Draw sibling spacing measurements (green lines)
            siblingInfo = drawSiblingSpacing(measurementsGroup, focusedLayer, parentStack, originalArtboard);
            console.log(`Sibling info calculated:`, siblingInfo ? 'Yes' : 'No');
            
            // Add the parent stack to our stack layers list if not already there
            if (!stackLayers.includes(parentStack)) {
                stackLayers.push(parentStack);
            }
        } else {
            console.log(`No parent stack - checking if focused layer itself is a stack`);
            if (isStackLayer(focusedLayer)) {
                console.log(`Focused layer IS a stack - using directional spacing`);
            }
            // Draw regular directional spacing measurements (red/purple lines)
            const directionalSpacing = drawDirectionalSpacing(measurementsGroup, focusedLayer, allLayers, originalArtboard);
        }
        
        // Generate developer specs
        const specs = generateFocusedLayerSpecs(focusedLayer, allLayers, originalArtboard);
    }
    
    // Draw specifications panel  
    const debugMode = true; // Force panel to show for testing
    const showPanel = stackLayers.length > 0 || debugMode;
    
    if (showPanel) {
        drawStackSpecificationsPanel(spacingArtboard, stackLayers, originalArtboard, debugMode, focusedLayer, siblingInfo);
    }
    
    return spacingArtboard;
}

module.exports = {
    createLayoutSpacingSpecs,
    getVisibleLayersInOrder,
    isStackLayer,
    getStackProperties,
    findParentStack,
    getStackSiblings,
    calculateSiblingSpacing,
    drawSiblingSpacing
}; 