// Import Three.js
import * as THREE from 'three';

// Texture cache to avoid reloading the same texture
const textureCache = {};

/**
 * Brand to filename mapping
 * Maps brand names to their corresponding file naming conventions
 */
function getBrandFileName(brand, boxType) {
  const brandMap = {
    FRUTANA: "FRUTANA",
    FRUTANOVA: "FRUTANOVA",
    SINDIBAD: "SINDIBAD",
    "FRUTANA JOY": "FRUTANA JOY",
    FRUTALUXE: "FRUTALUXE",
  };
  
  const brandName = brandMap[brand] || "FRUTANA";
  
  if (boxType === "22XU") {
    if (brandName === "SINDIBAD") {
      return "caja 22xu - SINDIBAD OUT FINAL CORREGIDA";
    }
    return `caja 22xu - ${brandName} OUT`;
  } else if (boxType === "208") {
    return `medida de caja 208 - ${brandName} OUT`;
  }
  return `caja 22xu - ${brandName} OUT`;
}

/**
 * Create a fallback texture with brand color when texture fails to load
 */
function createFallbackTexture(brand) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  
  const colors = {
    FRUTANA: '#e74c3c',
    FRUTANOVA: '#3498db',
    SINDIBAD: '#f39c12',
    "FRUTANA JOY": '#9b59b6',
    FRUTALUXE: '#1abc9c',
  };
  
  ctx.fillStyle = colors[brand] || colors.FRUTANA;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Add text
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = 'bold 80px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(brand, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.flipY = false;
  return texture;
}

/**
 * Load texture from PNG files
 * Implements caching to avoid reloading the same texture
 * Falls back to a colored canvas texture if the PNG fails to load
 */
export async function loadTexture(brand, boxType) {
  const cacheKey = `${brand}_${boxType}`;
  
  // Return cached texture if available
  if (textureCache[cacheKey]) {
    return textureCache[cacheKey];
  }

  const fileName = getBrandFileName(brand, boxType);
  const boxTypePath = boxType === "22XU" ? "22xu" : boxType.toString();
  const pngPath = `assets/textures/png/${boxTypePath}/${fileName} Mesa de trabajo 1.png`;

  return new Promise((resolve) => {
    const textureLoader = new THREE.TextureLoader();
    
    textureLoader.load(
      pngPath,
        (texture) => {
          // Configure texture settings
          texture.flipY = false;
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.colorSpace = THREE.SRGBColorSpace;
          // Flip texture horizontally
          texture.repeat.set(-1, 1);
          texture.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          texture.rotation = Math.PI;
          texture.center.set(0.5, 0.5);
          
          // Cache the texture
          textureCache[cacheKey] = texture;
          resolve(texture);
        },
      undefined, // onProgress callback
      (error) => {
        console.warn(`Failed to load texture: ${pngPath}`, error);
        const fallbackTexture = createFallbackTexture(brand);
        textureCache[cacheKey] = fallbackTexture;
        resolve(fallbackTexture);
      }
    );
  });
}

/**
 * Load per-face cropped textures for FRUTALUXE (22XU)
 * Returns an object with textures for each exterior face and for flaps.
 *
 * Structure:
 * {
 *   faces: { right, left, front, back, top?, bottom? },
 *   flaps: {
 *     top: { long1, long2, short1, short2 },
 *     bottom: { long1, long2, short1, short2 }
 *   }
 * }
 */
export async function loadFrutaluxeCroppedTextures22XU() {
  const cacheKey = `FRUTALUXE_22XU_CROPPED_SET`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const base = `assets/textures/cropped pngs/22xu/FRUTALUXE/`;
  const files = {
    // Exterior sides
    right: `long side 1.png`,
    left: `long side 2.png`,
    front: `short side 1.png`,
    back: `short side 2.png`,
    
    // Interior sides (cardboard color)
    interior_long: `long side interior.png`,
    interior_short: `short side interior.png`,

    // Top flap faces
    flap_long1: `long 1 flap.png`,
    flap_long2: `long 2 flap.png`,
    flap_short1: `short 1 flap.png`,
    flap_short2: `short flap 2.png`,

    // Bottom flap faces
    flap_bottom_long1: `long 1 flap bottom.png`,
    flap_bottom_long2: `long 2 flap bottom.png`,
    flap_bottom_short1: `short 1 flap bottom.png`,
    flap_bottom_short2: `short 2 flap bottom.png`,
  };

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(files);

  const loadOne = (key, path) =>
    new Promise((resolve) => {
      loader.load(
        base + path,
        (tex) => {
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          // Flip texture horizontally
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          tex.rotation = Math.PI;
          tex.center.set(0.5, 0.5);
          // Enable alpha channel for interior textures (needed for holes transparency)
          if (key.includes('interior')) {
            tex.format = THREE.RGBAFormat;
          }
          resolve([key, tex]);
        },
        undefined,
        () => {
          // Fail gracefully with a neutral placeholder
          const placeholder = createFallbackTexture("FRUTALUXE");
          resolve([key, placeholder]);
        }
      );
    });

  const results = await Promise.all(entries.map(([k, v]) => loadOne(k, v)));
  const map = Object.fromEntries(results);

  const set = {
    faces: {
      right: map.right,
      left: map.left,
      front: map.front,
      back: map.back,
      bottom: map.flap_bottom_long1, // Use bottom flap texture for bottom face
    },
    interiors: {
      long: map.interior_long,   // For long sides (right and left)
      short: map.interior_short,  // For short sides (front and back)
    },
    flaps: {
      top: {
        long1: map.flap_long1,
        long2: map.flap_long2,
        short1: map.flap_short1,
        short2: map.flap_short2,
      },
      bottom: {
        long1: map.flap_bottom_long1,
        long2: map.flap_bottom_long2,
        short1: map.flap_bottom_short1,
        short2: map.flap_bottom_short2,
      },
    },
  };

  textureCache[cacheKey] = set;
  return set;
}

/**
 * Load per-face cropped textures for FRUTANA JOY (22XU)
 * Returns an object with textures for each exterior face and for flaps.
 */
export async function loadFrutanaJoyCroppedTextures22XU() {
  const cacheKey = `FRUTANA_JOY_22XU_CROPPED_SET`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const base = `assets/textures/cropped pngs/22xu/FRUTANA JOY/`;
  const files = {
    // Exterior sides
    right: `long side 1.png`,
    left: `long side 2.png`,
    front: `short side 1.png`,
    back: `short side 2.png`,
    
    // Interior sides (cardboard color)
    interior_long: `long side interior.png`,
    interior_short: `short side interior.png`,

    // Top flap faces
    flap_long1: `long side 1 flap.png`,
    flap_long2: `long side 2 flap.png`,
    flap_short1: `short side 1 flap.png`,
    flap_short2: `short side 2 flap.png`,

    // Bottom flap faces
    flap_bottom_long1: `long side bottom flap.png`,
    flap_bottom_long2: `long side 2 bottom flap.png`,
    flap_bottom_short1: `short side bottom flap.png`,
    flap_bottom_short2: `short side 2 bottom flap.png`,
  };

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(files);

  const loadOne = (key, path) =>
    new Promise((resolve) => {
      loader.load(
        base + path,
        (tex) => {
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          // Flip texture horizontally
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          tex.rotation = Math.PI;
          tex.center.set(0.5, 0.5);
          // Enable alpha channel for interior textures (needed for holes transparency)
          if (key.includes('interior')) {
            tex.format = THREE.RGBAFormat;
          }
          resolve([key, tex]);
        },
        undefined,
        () => {
          // Fail gracefully with a neutral placeholder
          const placeholder = createFallbackTexture("FRUTANA JOY");
          resolve([key, placeholder]);
        }
      );
    });

  const results = await Promise.all(entries.map(([k, v]) => loadOne(k, v)));
  const map = Object.fromEntries(results);

  const set = {
    faces: {
      right: map.right,
      left: map.left,
      front: map.front,
      back: map.back,
      bottom: map.flap_bottom_long1, // Use bottom flap texture for bottom face
    },
    interiors: {
      long: map.interior_long,   // For long sides (right and left)
      short: map.interior_short,  // For short sides (front and back)
    },
    flaps: {
      top: {
        long1: map.flap_long1,
        long2: map.flap_long2,
        short1: map.flap_short1,
        short2: map.flap_short2,
      },
      bottom: {
        long1: map.flap_bottom_long1,
        long2: map.flap_bottom_long2,
        short1: map.flap_bottom_short1,
        short2: map.flap_bottom_short2,
      },
    },
  };

  textureCache[cacheKey] = set;
  return set;
}

/**
 * Load per-face cropped textures for FRUTANA (22XU)
 * Returns an object with textures for each exterior face and for flaps.
 * Note: The folder is named "FURTANA OUT" but it's for the FRUTANA brand.
 */
export async function loadFrutanaCroppedTextures22XU() {
  const cacheKey = `FRUTANA_22XU_CROPPED_SET`;
  // Clear cache to force reload with new rotation settings
  if (textureCache[cacheKey]) {
    // Dispose of old textures
    const oldSet = textureCache[cacheKey];
    Object.values(oldSet.faces || {}).forEach(tex => tex?.dispose?.());
    Object.values(oldSet.interiors || {}).forEach(tex => tex?.dispose?.());
    Object.values(oldSet.flaps?.top || {}).forEach(tex => tex?.dispose?.());
    Object.values(oldSet.flaps?.bottom || {}).forEach(tex => tex?.dispose?.());
    delete textureCache[cacheKey];
  }

  const base = `assets/textures/cropped pngs/22xu/FURTANA OUT/`;
  const files = {
    // Exterior sides
    right: `long side 1.png`,
    left: `long side 2.png`,
    front: `short side 1.png`,
    back: `short side 2.png`,
    
    // Interior sides (cardboard color)
    // Note: FRUTANA uses "long side 2 interior.png" for long sides
    interior_long: `long side 2 interior.png`,
    interior_short: `short side interior.png`,

    // Top flap faces
    flap_long1: `long side 1 flap.png`,
    flap_long2: `long side 2 flap.png`,
    flap_short1: `short side 1 flap.png`,
    flap_short2: `short side 2 flap.png`,

    // Bottom flap faces
    flap_bottom_long1: `long side 1 flap bottom.png`,
    flap_bottom_long2: `long side 2 flap bottom.png`,
    flap_bottom_short1: `short side1 flap bottom.png`,
    flap_bottom_short2: `short side 2 flap bottom.png`,
  };

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(files);

  const loadOne = (key, path) =>
    new Promise((resolve) => {
      loader.load(
        base + path,
        (tex) => {
          tex.flipY = false; // Changed to false to match other brands
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          // Flip horizontally
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          tex.rotation = Math.PI;
          tex.center.set(0.5, 0.5);
          // Enable alpha channel for interior textures (needed for holes transparency)
          if (key.includes('interior')) {
            tex.format = THREE.RGBAFormat;
          }
          resolve([key, tex]);
        },
        undefined,
        () => {
          // Fail gracefully with a neutral placeholder
          const placeholder = createFallbackTexture("FRUTANA");
          resolve([key, placeholder]);
        }
      );
    });

  const results = await Promise.all(entries.map(([k, v]) => loadOne(k, v)));
  const map = Object.fromEntries(results);

  const set = {
    faces: {
      right: map.right,
      left: map.left,
      front: map.front,
      back: map.back,
      bottom: map.flap_bottom_long1, // Use bottom flap texture for bottom face
    },
    interiors: {
      long: map.interior_long,   // For long sides (right and left)
      short: map.interior_short,  // For short sides (front and back)
    },
    flaps: {
      top: {
        long1: map.flap_long1,
        long2: map.flap_long2,
        short1: map.flap_short1,
        short2: map.flap_short2,
      },
      bottom: {
        long1: map.flap_bottom_long1,
        long2: map.flap_bottom_long2,
        short1: map.flap_bottom_short1,
        short2: map.flap_bottom_short2,
      },
    },
  };

  textureCache[cacheKey] = set;
  return set;
}

/**
 * Load per-face cropped textures for FRUTANOVA (22XU)
 * Returns an object with textures for each exterior face and for flaps.
 */
export async function loadFrutanovaCroppedTextures22XU() {
  const cacheKey = `FRUTANOVA_22XU_CROPPED_SET`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const base = `assets/textures/cropped pngs/22xu/FRUTANOVA OUT/`;
  const files = {
    // Exterior sides
    right: `long side 1.png`,
    left: `long side 2.png`,
    front: `short side 1.png`,
    back: `short side 2.png`,
    
    // Interior sides (cardboard color)
    interior_long: `long side interior.png`,
    interior_short: `short side interior.png`,

    // Top flap faces
    flap_long1: `long side 1  flap.png`,
    flap_long2: `long side 2 flap.png`,
    flap_short1: `short side 1flap.png`,
    flap_short2: `short side 2 flap.png`,

    // Bottom flap faces - use same as top for now (FRUTANOVA doesn't have separate bottom flaps)
    flap_bottom_long1: `long side 1  flap.png`,
    flap_bottom_long2: `long side 2 flap.png`,
    flap_bottom_short1: `short side 1flap.png`,
    flap_bottom_short2: `short side 2 flap.png`,
  };

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(files);

  const loadOne = (key, path) =>
    new Promise((resolve) => {
      loader.load(
        base + path,
        (tex) => {
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          // Flip texture horizontally
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          tex.rotation = Math.PI;
          tex.center.set(0.5, 0.5);
          // Enable alpha channel for interior textures (needed for holes transparency)
          if (key.includes('interior')) {
            tex.format = THREE.RGBAFormat;
          }
          resolve([key, tex]);
        },
        undefined,
        () => {
          const placeholder = createFallbackTexture("FRUTANOVA");
          resolve([key, placeholder]);
        }
      );
    });

  const results = await Promise.all(entries.map(([k, v]) => loadOne(k, v)));
  const map = Object.fromEntries(results);

  const set = {
    faces: {
      right: map.right,
      left: map.left,
      front: map.front,
      back: map.back,
      bottom: map.flap_bottom_long1, // Use bottom flap texture for bottom face
    },
    interiors: {
      long: map.interior_long,   // For long sides (right and left)
      short: map.interior_short,  // For short sides (front and back)
    },
    flaps: {
      top: {
        long1: map.flap_long1,
        long2: map.flap_long2,
        short1: map.flap_short1,
        short2: map.flap_short2,
      },
      bottom: {
        long1: map.flap_bottom_long1,
        long2: map.flap_bottom_long2,
        short1: map.flap_bottom_short1,
        short2: map.flap_bottom_short2,
      },
    },
  };

  textureCache[cacheKey] = set;
  return set;
}

/**
 * Load per-face cropped textures for SINDIBAD (22XU)
 * Returns an object with textures for each exterior face and for flaps.
 */
export async function loadSindibadCroppedTextures22XU() {
  const cacheKey = `SINDIBAD_22XU_CROPPED_SET`;
  if (textureCache[cacheKey]) return textureCache[cacheKey];

  const base = `assets/textures/cropped pngs/22xu/SINDIBAD OUT/`;
  const files = {
    // Exterior sides
    right: `long side 1.png`,
    left: `long side 2.png`,
    front: `short side 1.png`,
    back: `short side 2.png`,
    
    // Interior sides (cardboard color)
    interior_long: `long side interior.png`,
    interior_short: `short side interior.png`,

    // Top flap faces
    flap_long1: `long flap 1.png`,
    flap_long2: `long flap 2.png`,
    flap_short1: `short flap 1.png`,
    flap_short2: `short flap 2.png`,

    // Bottom flap faces - use same as top (SINDIBAD doesn't have separate bottom flaps)
    flap_bottom_long1: `long flap 1.png`,
    flap_bottom_long2: `long flap 2.png`,
    flap_bottom_short1: `short flap 1.png`,
    flap_bottom_short2: `short flap 2.png`,
  };

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(files);

  const loadOne = (key, path) =>
    new Promise((resolve) => {
      loader.load(
        base + path,
        (tex) => {
          tex.flipY = false;
          tex.wrapS = THREE.RepeatWrapping;
          tex.wrapT = THREE.ClampToEdgeWrapping;
          tex.colorSpace = THREE.SRGBColorSpace;
          // Flip texture horizontally
          tex.repeat.set(-1, 1);
          tex.offset.set(1, 0);
          // Rotate 180 degrees clockwise
          tex.rotation = Math.PI;
          tex.center.set(0.5, 0.5);
          // Enable alpha channel for interior textures (needed for holes transparency)
          if (key.includes('interior')) {
            tex.format = THREE.RGBAFormat;
          }
          resolve([key, tex]);
        },
        undefined,
        () => {
          const placeholder = createFallbackTexture("SINDIBAD");
          resolve([key, placeholder]);
        }
      );
    });

  const results = await Promise.all(entries.map(([k, v]) => loadOne(k, v)));
  const map = Object.fromEntries(results);

  const set = {
    faces: {
      right: map.right,
      left: map.left,
      front: map.front,
      back: map.back,
      bottom: map.flap_bottom_long1, // Use bottom flap texture for bottom face
    },
    interiors: {
      long: map.interior_long,   // For long sides (right and left)
      short: map.interior_short,  // For short sides (front and back)
    },
    flaps: {
      top: {
        long1: map.flap_long1,
        long2: map.flap_long2,
        short1: map.flap_short1,
        short2: map.flap_short2,
      },
      bottom: {
        long1: map.flap_bottom_long1,
        long2: map.flap_bottom_long2,
        short1: map.flap_bottom_short1,
        short2: map.flap_bottom_short2,
      },
    },
  };

  textureCache[cacheKey] = set;
  return set;
}

/**
 * Clear the texture cache (useful when textures need to be reloaded)
 */
export function clearTextureCache() {
  Object.values(textureCache).forEach(texture => {
    if (texture.dispose) {
      texture.dispose();
    }
  });
  Object.keys(textureCache).forEach(key => {
    delete textureCache[key];
  });
}

