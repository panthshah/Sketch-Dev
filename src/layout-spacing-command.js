"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = default_1;
const sketch = require('sketch');
const { createLayoutSpacingSpecs } = require('./layout-spacing.js');

function default_1() {
    const document = sketch.getSelectedDocument();
    if (!document) {
        sketch.UI.message("Error: No Sketch document open.");
        return;
    }
    
    const selectedLayers = document.selectedLayers;
    if (selectedLayers.length === 0) {
        sketch.UI.message("Please select a layer to generate spacing measurements.");
        return;
    }
    
    if (selectedLayers.length > 1) {
        sketch.UI.message("Please select only one layer at a time for spacing analysis.");
        return;
    }
    
    const selectedLayer = selectedLayers.layers[0];
    
    // Find the artboard containing this layer
    let artboard = selectedLayer;
    while (artboard && artboard.type !== sketch.Types.Artboard) {
        artboard = artboard.parent;
    }
    
    if (!artboard) {
        sketch.UI.message("Selected layer must be inside an artboard.");
        return;
    }
    
    // Generate spacing specs for the selected layer
    createLayoutSpacingSpecs(artboard, selectedLayer);
}

module.exports = { default: default_1 }; 