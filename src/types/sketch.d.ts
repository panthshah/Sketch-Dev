declare module 'sketch' {
  export default class Sketch {
    static getSelectedDocument(): Document | null;
    static UI: {
      message(message: string): void;
    };
    static Shape: typeof Shape;
    static ShapePath: typeof ShapePath;
    static Text: typeof Text;
    static Artboard: typeof Artboard;
    static Rectangle: typeof Rectangle;
    static Path: typeof Path;
    static Style: {
      FillType: {
        Color: string;
      };
    };
    static Types: {
      Group: string;
      Artboard: string;
      Text: string;
    };
  }

  export class Document {
    selectedLayers: SelectedLayers;
    selectedPage: Page;
    pages: Page[];
  }

  export class Page {
    // Page properties
  }

  export class SelectedLayers {
    layers: Layer[];
    length: number;
  }

  export class Layer {
    name: string;
    type: string;
    frame: Rectangle;
    parent: any;
    document: Document;
    style?: Style;
    layers?: Layer[];
  }

  export class Rectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    constructor(x: number, y: number, width: number, height: number);
    changeBasis(options: { from: any; to: any }): Rectangle;
  }

  export class Shape {
    constructor(options: {
      parent: any;
      frame: Rectangle;
      style: Style;
    });
    frame: Rectangle;
  }

  export class ShapePath {
    constructor(options: {
      parent: any;
      path: Path;
      style: Style;
    });
  }

  export class Text {
    static Alignment: {
      Center: string;
    };
    constructor(options: {
      text: string;
      parent: any;
      frame: Rectangle;
      style?: TextStyle;
    });
    frame: Rectangle;
  }

  export class Artboard {
    constructor(options: {
      name: string;
      parent: any;
      frame: Rectangle;
    });
    frame: Rectangle;
  }

  export class Path {
    moveTo(x: number, y: number): void;
    lineTo(x: number, y: number): void;
  }

  export class Style {
    fills?: Fill[];
    borders?: Border[];
    textColor?: RGBA;
    fontSize?: number;
    lineHeight?: number;
    fontFamily?: string;
    alignment?: string;
  }

  export class TextStyle {
    textColor: RGBA | string;
    fontSize: number;
    alignment: string;
  }

  export interface Fill {
    enabled?: boolean;
    color: RGBA | string;
    fillType: string;
  }

  export interface Border {
    enabled?: boolean;
    color: RGBA | string;
    thickness: number;
  }

  export interface RGBA {
    red: number;
    green: number;
    blue: number;
    alpha: number;
  }
} 