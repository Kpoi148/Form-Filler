# Keyword Auto Form Filler

Chrome extension to fill forms using user-defined keywords and profiles.

## Features
- Multiple profiles with separate keyword/value lists
- Fill the active tab on demand
- Optional auto-fill on page load
- Import/export profiles as JSON

## Project Structure
- `manifest.json` - Extension manifest (MV3)
- `src/popup/` - Popup UI (HTML/CSS/JS)
- `src/background/` - Background service worker
- `src/content/` - Content script that fills forms
- `examples/` - Sample page for quick testing
- `scripts/` - Utility scripts
- `icons/` - Extension icons

## Install (Chrome)
1) Open `chrome://extensions`
2) Enable Developer mode
3) Click "Load unpacked"
4) Select the project folder `Form-Filler`

## Usage
1) Open the extension popup
2) Create or select a profile
3) Add keywords and values
4) Click "Fill current tab" to fill the active page
5) Toggle Auto-Fill if you want it to run automatically

## Import/Export
- Export creates `kff_export.json` you can save or share
- Import supports JSON files that match the profile structure

## Notes
- Auto-fill only runs when the content script is active on the page
- If a field already has a value, it will be skipped
