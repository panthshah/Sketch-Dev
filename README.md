# Sketch Spec Generator

A powerful Sketch plugin that generates comprehensive design specifications including layer anatomy, spacing measurements, and Stack Layout analysis with sibling spacing detection.

## ✨ Features

- **Layer Anatomy**: Generate detailed specifications for all layers with styling information
- **Smart Spacing Analysis**: Measure spacing between layers and to artboard edges  
- **Stack Layout Support**: Advanced analysis of Sketch Stack Layouts with:
  - Sibling spacing measurements between child elements
  - Directional spacing to nearest layers/edges
  - Visual green lines showing spacing between siblings
  - Comprehensive specifications panel
- **Professional Output**: Clean, organized specification artboards with visual highlights

## 🚀 Quick Installation

### Option 1: Direct Download (Recommended)
1. **[Download Latest Plugin](https://github.com/panthshah/Sketch-Dev/raw/cursor/provide-project-context-bfbf/sketch-spec-generator-v4.sketchplugin.zip)** (`sketch-spec-generator-v4.sketchplugin.zip`)
2. **Unzip** the downloaded file
3. **Double-click** `sketch-spec-generator.sketchplugin` to install
4. The plugin will appear in **Plugins > Sketch Spec Generator** menu

### Option 2: GitHub Releases
- Go to [Releases](../../releases) and download the latest version
- Follow the same unzip and double-click process

## 📋 How to Use

### Layer Anatomy
1. Select any **artboard** in Sketch
2. Go to **Plugins > Sketch Spec Generator > Generate Anatomy**
3. A new artboard will be created with detailed layer specifications

### Spacing Analysis
1. Select any **layer** (not artboard) in Sketch  
2. Go to **Plugins > Sketch Spec Generator > Generate Spacing**
3. View spacing measurements and Stack Layout analysis

### Sibling Spacing (New!)
- When you select a layer **inside a Stack Layout**, the plugin automatically detects and shows:
  - 🟢 **Green lines** showing spacing between sibling elements
  - 🔵 **Cyan highlight** on the selected layer
  - 📊 **Specifications panel** with detailed Stack Layout information
  - Position context (e.g., "Position: 2 of 4 in stack")

## �� Development Guide

_This plugin was created using `skpm`. For a detailed explanation on how things work, checkout the [skpm Readme](https://github.com/skpm/skpm/blob/master/README.md)._

### Usage

Install the dependencies

```bash
npm install
```

Once the installation is done, you can run some commands inside the project folder:

```bash
npm run build
```

To watch for changes:

```bash
npm run watch
```

Additionally, if you wish to run the plugin every time it is built:

```bash
npm run start
```

### Custom Configuration

#### Babel

To customize Babel, you have two options:

- You may create a [`.babelrc`](https://babeljs.io/docs/usage/babelrc) file in your project's root directory. Any settings you define here will overwrite matching config-keys within skpm preset. For example, if you pass a "presets" object, it will replace & reset all Babel presets that skpm defaults to.

- If you'd like to modify or add to the existing Babel config, you must use a `webpack.skpm.config.js` file. Visit the [Webpack](#webpack) section for more info.

#### Webpack

To customize webpack create `webpack.skpm.config.js` file which exports function that will change webpack's config.

```js
/**
 * Function that mutates original webpack config.
 * Supports asynchronous changes when promise is returned.
 *
 * @param {object} config - original webpack config.
 * @param {boolean} isPluginCommand - whether the config is for a plugin command or a resource
 **/
module.exports = function(config, isPluginCommand) {
  /** you can change config here **/
}
```

### Debugging

To view the output of your `console.log`, you have a few different options:

- Use the [`sketch-dev-tools`](https://github.com/skpm/sketch-dev-tools)
- Run `skpm log` in your Terminal, with the optional `-f` argument (`skpm log -f`) which causes `skpm log` to not stop when the end of logs is reached, but rather to wait for additional data to be appended to the input

### Publishing your plugin

```bash
skpm publish <bump>
```

(where `bump` can be `patch`, `minor` or `major`)

`skpm publish` will create a new release on your GitHub repository and create an appcast file in order for Sketch users to be notified of the update.

You will need to specify a `repository` in the `package.json`:

```diff
...
+ "repository" : {
+   "type": "git",
+   "url": "git+https://github.com/ORG/NAME.git"
+  }
...
```
