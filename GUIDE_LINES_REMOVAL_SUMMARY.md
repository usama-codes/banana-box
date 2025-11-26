# Guide Lines Removal - Summary

## What Was Done

Successfully removed specific purple/magenta colored guide lines from PNG textures used in the 3D banana box visualization project.

## Target Colors Removed

The script was configured to remove these specific RGB colors:
- `rgb(138, 46, 129)` - Purple Guide 1
- `rgb(137, 36, 139)` - Purple Guide 2
- `rgb(145, 48, 131)` - Purple Guide 3
- `rgb(121, 54, 136)` - Purple Guide 4
- `rgb(123, 35, 132)` - Purple Guide 5

Color matching tolerance: ±15 per RGB channel

## Processing Results

- **Total files processed:** 76 PNG files
- **Files modified:** 18 files
- **Total pixels removed:** 235,228 guide line pixels
- **Processing time:** 11.98 seconds
- **Success rate:** 100% (0 failures)

## Files Processed

### Full Texture Files (13 files)
- `assets/textures/png/22xu/` - 6 PNG files
- `assets/textures/png/208/` - 7 PNG files

### Cropped Texture Files (63 files)
- `assets/textures/cropped pngs/22xu/FRUTALUXE/` - 15 PNG files
- `assets/textures/cropped pngs/22xu/FRUTANA JOY/` - 14 PNG files
- `assets/textures/cropped pngs/22xu/FRUTANOVA OUT/` - 10 PNG files
- `assets/textures/cropped pngs/22xu/FURTANA OUT/` - 14 PNG files
- `assets/textures/cropped pngs/22xu/SINDIBAD OUT/` - 10 PNG files

## Backup Information

All original files have been safely backed up to:
```
assets/textures/backup/
```

The backup folder maintains the same directory structure as the originals, so you can easily restore any file if needed.

## Script Created

A reusable Node.js script has been created at:
```
scripts/remove-guide-lines.js
```

### Running the Script Again

If you add new texture files in the future, you can run the script again:

```bash
npm run remove-guide-lines
```

### Configuration Options

You can modify these settings in the script:

```javascript
const CONFIG = {
  // Directories to scan
  textureDirs: [
    'assets/textures/png/22xu',
    'assets/textures/png/208',
    'assets/textures/cropped pngs/22xu'
  ],
  
  // Specific colors to remove (add or modify as needed)
  colorsToRemove: [
    { r: 138, g: 46, b: 129, name: 'Purple Guide 1' },
    { r: 137, g: 36, b: 139, name: 'Purple Guide 2' },
    { r: 145, g: 48, b: 131, name: 'Purple Guide 3' },
    { r: 121, g: 54, b: 136, name: 'Purple Guide 4' },
    { r: 123, g: 35, b: 132, name: 'Purple Guide 5' }
  ],
  
  // Tolerance for color matching (±value per RGB channel)
  colorTolerance: 15,
  
  // Test mode (doesn't modify files)
  dryRun: false,
  
  // Detailed logging
  verbose: true
};
```

### Adding More Colors

To remove additional guide line colors:

1. Open `scripts/remove-guide-lines.js`
2. Add new color entries to the `colorsToRemove` array:
   ```javascript
   { r: 255, g: 0, b: 255, name: 'Bright Magenta' }
   ```
3. Adjust `colorTolerance` if needed (higher = more aggressive matching)
4. Run `npm run remove-guide-lines` again

## How It Works

The script:

1. **Scans** all PNG files in the specified directories recursively
2. **Backs up** each original file before processing
3. **Analyzes** each pixel to match against the specific RGB colors
4. **Detects** colors within the tolerance range (±15 per channel by default)
5. **Replaces** matching pixels with transparency (alpha = 0)
6. **Preserves** all other pixels unchanged
7. **Saves** the cleaned image back to the original location

## Technical Details

- **Library used:** Sharp (fast Node.js image processing)
- **Detection method:** Exact RGB color matching with configurable tolerance
- **Matching algorithm:** Euclidean distance per RGB channel
- **Replacement method:** Alpha channel transparency (alpha = 0)
- **Color space:** SRGB
- **Format:** PNG with full alpha channel support
- **Performance:** ~11-12 seconds for 76 files (varies by file size)

## Files Modified

The following files contained the target colors and were cleaned:

### FRUTALUXE (7 files)
- `long side 1.png` - 14 pixels
- `long side 2.png` - 8 pixels  
- `long side interior.png` - 15 pixels
- `short side 2.png` - 5 pixels
- `short side interior.png` - 18 pixels
- 2 full texture files

### FRUTANA JOY (3 files)
- `long side interior.png` - 3 pixels
- `short side interior.png` - 39 pixels
- 1 full texture file

### FRUTANOVA (2 files)
- `short side interior.png` - 63 pixels
- 1 full texture file

### FRUTANA (6 files)
- `long side 2 interior.png` - 23 pixels
- `short side 1.png` - 10 pixels
- `short side 2.png` - 13 pixels
- `short side interior.png` - 39 pixels
- 2 full texture files

## Verification

The 3D visualization should now display cleanly without the purple guide lines. To test:

1. Run `npm run dev` to start the development server
2. Open your browser to the local server URL (typically http://localhost:5173)
3. Check all brand options (FRUTALUXE, FRUTANA, FRUTANA JOY, FRUTANOVA, SINDIBAD)
4. Verify that the specific purple guide lines are no longer visible

## Restoring Original Files

If you need to restore any original texture:

1. Navigate to `assets/textures/backup/`
2. Find the file in the same directory structure
3. Copy it back to the original location in `assets/textures/`

---

**Date:** November 26, 2025
**Status:** ✓ Complete

