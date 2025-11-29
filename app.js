// Import Three.js modules
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import {
  loadTexture,
  loadFrutaluxeCroppedTextures22XU,
  loadFrutanaJoyCroppedTextures22XU,
  loadFrutanaCroppedTextures22XU,
  loadFrutanovaCroppedTextures22XU,
  loadSindibadCroppedTextures22XU,
} from "./textureLoader.js";
import { createBoxWithCustomUVs, createBanana } from "./boxGeometry.js";

// Three.js Scene Setup
let scene, camera, renderer, controls;
let boxGroup, leftFlap, rightFlap, frontFlap, backFlap, boxBody;
let lidGroup, lidRight, lidLeft, lidFront, lidBack; // Lid structure for FRUTALUXE
let bananas = []; // Array to hold banana objects
let bananaModel = null; // Cached banana GLB model
let dimensionsVisible = false;
let dimensionsGroup;
let currentBrand = "FRUTANA";
let currentBoxType = "22XU";
let flapsOpen = false;
let lidOpen = false; // State for lid lift

// Box dimensions based on type (in cm, scaled for 3D)
// Dimensions extracted from engineering drawings in PDFs (converted from mm to cm)
const boxDimensions = {
  "22XU": { width: 5.22, height: 2.36, depth: 3.87, lidHeight: 0.5 }, // 522mm x 236mm x 387mm
  208: { width: 5.15, height: 2.13, depth: 3.42, lidHeight: 0.5 }, // 515mm x 213mm x 342mm
};

// Initialize the 3D scene
function init() {
  const container = document.getElementById("canvas-container");
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f5);
  scene.fog = new THREE.Fog(0xf5f5f5, 50, 200);

  // Camera
  camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
  camera.position.set(20, 12, 20); // Zoomed out more for better visibility
  camera.lookAt(0, 0, 0);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // OrbitControls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  controls.rotateSpeed = 0.5;
  controls.minDistance = 10;
  controls.maxDistance = 60; // Increased max zoom out distance
  controls.enablePan = false;
  controls.autoRotate = false;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
  scene.add(ambientLight);

  const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight1.position.set(20, 30, 20);
  directionalLight1.castShadow = true;
  directionalLight1.shadow.mapSize.width = 2048;
  directionalLight1.shadow.mapSize.height = 2048;
  directionalLight1.shadow.camera.near = 0.5;
  directionalLight1.shadow.camera.far = 100;
  directionalLight1.shadow.camera.left = -15;
  directionalLight1.shadow.camera.right = 15;
  directionalLight1.shadow.camera.top = 15;
  directionalLight1.shadow.camera.bottom = -15;
  scene.add(directionalLight1);

  const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
  directionalLight2.position.set(-15, 20, -15);
  scene.add(directionalLight2);

  const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.3);
  directionalLight3.position.set(0, 10, -20);
  scene.add(directionalLight3);

  // Create box
  createBox().catch((err) => {
    console.error("Error creating box:", err);
  });

  // Dimensions group
  dimensionsGroup = new THREE.Group();
  scene.add(dimensionsGroup);

  // Ground plane
  const planeGeometry = new THREE.PlaneGeometry(100, 100);
  const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.2 });
  const plane = new THREE.Mesh(planeGeometry, planeMaterial);
  plane.rotation.x = -Math.PI / 2;
  plane.position.y = -0.01;
  plane.receiveShadow = true;
  scene.add(plane);

  // Grid helper (subtle) - kept for reference but could be hidden if needed
  const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xe0e0e0);
  gridHelper.position.y = -0.005;
  scene.add(gridHelper);

  // Handle window resize
  window.addEventListener("resize", onWindowResize);

  // Hide loading overlay
  setTimeout(() => {
    document.getElementById("loadingOverlay").classList.add("hidden");
  }, 500);

  animate();
}

// Create the box model
async function createBox() {
  if (boxGroup) {
    scene.remove(boxGroup);
    boxGroup.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  boxGroup = new THREE.Group();
  const dims = boxDimensions[currentBoxType];

  // Load texture
  const texture = await loadTexture(currentBrand, currentBoxType);

  // Configure texture wrapping to prevent gaps between faces
  if (texture) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
  }

  // Materials and geometry: special handling for brands with cropped per-face textures
  let flapMaterial;
  let croppedTextureSet = null; // Store cropped texture set for reuse in flaps
  const brandsWithCroppedTextures = [
    "FRUTALUXE",
    "FRUTANA JOY",
    "FRUTANA",
    "FRUTANOVA",
    "SINDIBAD",
  ];
  const hasCroppedTextures =
    (currentBoxType === "22XU" || currentBoxType === "208") &&
    brandsWithCroppedTextures.includes(currentBrand);

  if (hasCroppedTextures) {
    // Load appropriate texture set based on brand and box type
    if (currentBoxType === "22XU") {
      if (currentBrand === "FRUTALUXE") {
        croppedTextureSet = await loadFrutaluxeCroppedTextures22XU();
      } else if (currentBrand === "FRUTANA JOY") {
        croppedTextureSet = await loadFrutanaJoyCroppedTextures22XU();
      } else if (currentBrand === "FRUTANA") {
        croppedTextureSet = await loadFrutanaCroppedTextures22XU();
      } else if (currentBrand === "FRUTANOVA") {
        croppedTextureSet = await loadFrutanovaCroppedTextures22XU();
      } else if (currentBrand === "SINDIBAD") {
        croppedTextureSet = await loadSindibadCroppedTextures22XU();
      }
    } else if (currentBoxType === "208") {
      // For 208 boxes, use the same 22XU textures (they can be reused)
      if (currentBrand === "FRUTALUXE") {
        croppedTextureSet = await loadFrutaluxeCroppedTextures22XU();
      } else if (currentBrand === "FRUTANA JOY") {
        croppedTextureSet = await loadFrutanaJoyCroppedTextures22XU();
      } else if (currentBrand === "FRUTANA") {
        croppedTextureSet = await loadFrutanaCroppedTextures22XU();
      } else if (currentBrand === "FRUTANOVA") {
        croppedTextureSet = await loadFrutanovaCroppedTextures22XU();
      } else if (currentBrand === "SINDIBAD") {
        croppedTextureSet = await loadSindibadCroppedTextures22XU();
      }
    }

    const geom = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    // Exterior faces mapped individually
    const matRight = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.right,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const matLeft = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.left,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const matFront = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.front,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    const matBack = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.back,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    // Make TOP FACE transparent so box is open from above
    const neutralTop = new THREE.MeshStandardMaterial({
      color: 0xd8c3a5,
      roughness: 0.9,
      metalness: 0.02,
      transparent: true,
      opacity: 0.0,
    });
    // Use bottom texture from the set (using first bottom flap texture as fallback)
    const bottomTexture =
      croppedTextureSet.faces.bottom || croppedTextureSet.flaps.bottom.long1;
    const matBottom = new THREE.MeshStandardMaterial({
      map: bottomTexture,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    boxBody = new THREE.Mesh(geom, [
      matRight,
      matLeft,
      neutralTop,
      matBottom,
      matFront,
      matBack,
    ]);
    // Flaps material will be assigned individually per flap below
    flapMaterial = null;
  } else {
    // Default single-texture material path
    const faceMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    // Transparent top face to open the box
    const topMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
    });
    const bottomMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    flapMaterial = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });
    // Use regular BoxGeometry here so material indices map directly: [right, left, top, bottom, front, back]
    const geom = new THREE.BoxGeometry(dims.width, dims.height, dims.depth);
    boxBody = new THREE.Mesh(geom, [
      faceMaterial,
      faceMaterial,
      topMaterial,
      bottomMaterial,
      faceMaterial,
      faceMaterial,
    ]);
  }
  boxBody.position.y = dims.height / 2; // Center at half height
  boxBody.castShadow = true;
  boxBody.receiveShadow = true;
  boxGroup.add(boxBody);

  // For brands with cropped textures and interior textures, create special lid structure with sides extending to bottom
  const hasLidStructure = hasCroppedTextures && croppedTextureSet?.interiors;
  if (hasLidStructure) {
    // Create lid group
    lidGroup = new THREE.Group();
    const lidThickness = 0.02;

    // Create lid sides as boxes with thickness so inside and outside can have different materials
    // BoxGeometry material indices: [right, left, top, bottom, front, back]
    // Right lid side (long side 1) - positioned at +X
    const lidRightGeom = new THREE.BoxGeometry(
      lidThickness,
      dims.height,
      dims.depth
    );
    const lidRightMatExterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.right,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.FrontSide,
    });
    const lidRightMatInterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.interiors.long,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    // Material array: [right, left, top, bottom, front, back]
    // For right side: right face (index 0) = exterior, left face (index 1) = interior
    lidRight = new THREE.Mesh(lidRightGeom, [
      lidRightMatExterior, // right face (outside)
      lidRightMatInterior, // left face (inside)
      lidRightMatExterior, // top
      lidRightMatExterior, // bottom
      lidRightMatExterior, // front
      lidRightMatExterior, // back
    ]);
    lidRight.position.set(dims.width / 2, dims.height / 2, 0);
    lidRight.userData.exteriorMaterial = lidRightMatExterior;
    lidRight.userData.interiorMaterial = lidRightMatInterior;
    lidGroup.add(lidRight);

    // Left lid side (long side 2) - positioned at -X
    const lidLeftGeom = new THREE.BoxGeometry(
      lidThickness,
      dims.height,
      dims.depth
    );
    const lidLeftMatExterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.left,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.FrontSide,
    });
    const lidLeftMatInterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.interiors.long,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    // For left side: left face (index 1) = exterior, right face (index 0) = interior
    lidLeft = new THREE.Mesh(lidLeftGeom, [
      lidLeftMatInterior, // right face (inside)
      lidLeftMatExterior, // left face (outside)
      lidLeftMatExterior, // top
      lidLeftMatExterior, // bottom
      lidLeftMatExterior, // front
      lidLeftMatExterior, // back
    ]);
    lidLeft.position.set(-dims.width / 2, dims.height / 2, 0);
    lidLeft.userData.exteriorMaterial = lidLeftMatExterior;
    lidLeft.userData.interiorMaterial = lidLeftMatInterior;
    lidGroup.add(lidLeft);

    // Front lid side (short side 1) - positioned at +Z
    const lidFrontGeom = new THREE.BoxGeometry(
      dims.width,
      dims.height,
      lidThickness
    );
    const lidFrontMatExterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.front,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.FrontSide,
    });
    const lidFrontMatInterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.interiors.short,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    // For front side: front face (index 4) = exterior, back face (index 5) = interior
    lidFront = new THREE.Mesh(lidFrontGeom, [
      lidFrontMatExterior, // right
      lidFrontMatExterior, // left
      lidFrontMatExterior, // top
      lidFrontMatExterior, // bottom
      lidFrontMatExterior, // front face (outside)
      lidFrontMatInterior, // back face (inside)
    ]);
    lidFront.position.set(0, dims.height / 2, dims.depth / 2);
    lidFront.userData.exteriorMaterial = lidFrontMatExterior;
    lidFront.userData.interiorMaterial = lidFrontMatInterior;
    lidGroup.add(lidFront);

    // Back lid side (short side 2) - positioned at -Z
    const lidBackGeom = new THREE.BoxGeometry(
      dims.width,
      dims.height,
      lidThickness
    );
    const lidBackMatExterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.faces.back,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.FrontSide,
    });
    const lidBackMatInterior = new THREE.MeshStandardMaterial({
      map: croppedTextureSet.interiors.short,
      roughness: 0.75,
      metalness: 0.05,
      side: THREE.BackSide,
    });
    // For back side: back face (index 5) = exterior, front face (index 4) = interior
    lidBack = new THREE.Mesh(lidBackGeom, [
      lidBackMatExterior, // right
      lidBackMatExterior, // left
      lidBackMatExterior, // top
      lidBackMatExterior, // bottom
      lidBackMatInterior, // front face (inside)
      lidBackMatExterior, // back face (outside)
    ]);
    lidBack.position.set(0, dims.height / 2, -dims.depth / 2);
    lidBack.userData.exteriorMaterial = lidBackMatExterior;
    lidBack.userData.interiorMaterial = lidBackMatInterior;
    lidGroup.add(lidBack);

    // Box body should show interior textures on its sides (it's the base box)
    // When lid is closed, we don't see box body sides anyway
    // When lid is open, we see box body interior sides with textures
    if (boxBody.material && Array.isArray(boxBody.material)) {
      // Use interior textures for box body sides
      // Long sides use long side interior texture
      const boxRightMatInterior = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.interiors.long,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: false, // Keep opaque - only holes will be transparent via alphaTest
        alphaTest: 0.01, // Always enabled at low threshold to prevent black holes
        depthWrite: true,
      });
      const boxLeftMatInterior = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.interiors.long,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: false, // Keep opaque - only holes will be transparent via alphaTest
        alphaTest: 0.01, // Always enabled at low threshold to prevent black holes
        depthWrite: true,
      });
      // Short sides use short side interior texture
      const boxFrontMatInterior = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.interiors.short,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: false, // Keep opaque - only holes will be transparent via alphaTest
        alphaTest: 0.01, // Always enabled at low threshold to prevent black holes
        depthWrite: true,
      });
      const boxBackMatInterior = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.interiors.short,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
        transparent: false, // Keep opaque - only holes will be transparent via alphaTest
        alphaTest: 0.01, // Always enabled at low threshold to prevent black holes
        depthWrite: true,
      });

      // Create cardboard color material for bottom interior
      const cardboardColor = 0xd8c3a5; // Cardboard brown color
      const boxBottomMatInterior = new THREE.MeshStandardMaterial({
        color: cardboardColor,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.DoubleSide,
      });

      // Store materials for later updates
      boxBody.userData.interiorMaterials = [
        boxRightMatInterior,
        boxLeftMatInterior,
        boxBody.material[2], // top (transparent)
        boxBottomMatInterior, // bottom (cardboard color for interior)
        boxFrontMatInterior,
        boxBackMatInterior,
      ];

      // Box body always shows interior textures on sides when visible (when lid is open)
      boxBody.material = boxBody.userData.interiorMaterials;
    }

    lidGroup.position.y = 0;
    boxGroup.add(lidGroup);
  } else {
    lidGroup = null;
    lidRight = null;
    lidLeft = null;
    lidFront = null;
    lidBack = null;
  }

  // Bottom flaps removed to avoid visible strip at base

  // Top flaps - These close to form the lid or open to hang on the sides
  // Flaps are positioned at the top edge of the box, starting in CLOSED position
  const flapThickness = 0.02;
  const flapWidth = dims.depth / 2; // Flaps extend to cover the top when closed
  const overlapAmount = 0.05; // Amount of overlap to eliminate gaps
  const positionShift = 0.025; // Position adjustment to create overlap

  // Front top flap - starts CLOSED (laying flat on top)
  const frontFlapGeometry = new THREE.BoxGeometry(
    dims.width,
    flapThickness,
    flapWidth + overlapAmount // Increase depth to create overlap
  );
  if (croppedTextureSet) {
    if (hasLidStructure) {
      // For FRUTALUXE, create materials with exterior on outside and cardboard on inside
      const cardboardColor = 0xd8c3a5; // Cardboard brown color
      const exteriorMat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.short1,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
      });
      const interiorMat = new THREE.MeshStandardMaterial({
        color: cardboardColor,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.BackSide,
      });
      // Use an array of materials for front and back
      frontFlap = new THREE.Mesh(frontFlapGeometry, [
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        interiorMat,
      ]);
      frontFlap.userData.exteriorMaterial = exteriorMat;
      frontFlap.userData.interiorMaterial = interiorMat;
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.short1,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      frontFlap = new THREE.Mesh(frontFlapGeometry, mat);
    }
  } else {
    frontFlap = new THREE.Mesh(frontFlapGeometry, flapMaterial);
  }
  frontFlap.position.set(0, dims.height, dims.depth / 4 - positionShift); // Shift toward center for overlap
  frontFlap.rotation.x = -Math.PI; // 180° closed
  frontFlap.castShadow = true;
  frontFlap.receiveShadow = true;
  frontFlap.userData.hingePosition = new THREE.Vector3(
    0,
    dims.height,
    dims.depth / 2
  );
  if (hasLidStructure && lidGroup) {
    lidGroup.add(frontFlap);
  } else {
    boxGroup.add(frontFlap);
  }

  // Back top flap - starts CLOSED (laying flat on top)
  const backFlapGeometry = new THREE.BoxGeometry(
    dims.width,
    flapThickness,
    flapWidth + overlapAmount // Increase depth to create overlap
  );
  if (croppedTextureSet) {
    if (hasLidStructure) {
      const cardboardColor = 0xd8c3a5;
      const exteriorMat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.short2,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 2,
        polygonOffsetUnits: 2,
      });
      const interiorMat = new THREE.MeshStandardMaterial({
        color: cardboardColor,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.BackSide,
      });
      backFlap = new THREE.Mesh(backFlapGeometry, [
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        interiorMat,
      ]);
      backFlap.userData.exteriorMaterial = exteriorMat;
      backFlap.userData.interiorMaterial = interiorMat;
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.short2,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      backFlap = new THREE.Mesh(backFlapGeometry, mat);
    }
  } else {
    backFlap = new THREE.Mesh(backFlapGeometry, flapMaterial);
  }
  backFlap.position.set(0, dims.height, -dims.depth / 4 + positionShift); // Shift toward center for overlap
  backFlap.rotation.x = Math.PI; // 180° closed
  backFlap.castShadow = true;
  backFlap.receiveShadow = true;
  backFlap.userData.hingePosition = new THREE.Vector3(
    0,
    dims.height,
    -dims.depth / 2
  );
  if (hasLidStructure && lidGroup) {
    lidGroup.add(backFlap);
  } else {
    boxGroup.add(backFlap);
  }

  // Left top flap - starts CLOSED (laying flat on top)
  const leftFlapGeometry = new THREE.BoxGeometry(
    flapWidth + overlapAmount, // Increase width to create overlap
    flapThickness,
    dims.depth
  );
  if (croppedTextureSet) {
    if (hasLidStructure) {
      const cardboardColor = 0xd8c3a5;
      const exteriorMat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.long1,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 3,
        polygonOffsetUnits: 3,
      });
      const interiorMat = new THREE.MeshStandardMaterial({
        color: cardboardColor,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.BackSide,
      });
      leftFlap = new THREE.Mesh(leftFlapGeometry, [
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        interiorMat,
      ]);
      leftFlap.userData.exteriorMaterial = exteriorMat;
      leftFlap.userData.interiorMaterial = interiorMat;
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.long1,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      leftFlap = new THREE.Mesh(leftFlapGeometry, mat);
    }
  } else {
    leftFlap = new THREE.Mesh(leftFlapGeometry, flapMaterial);
  }
  leftFlap.position.set(-dims.width / 4 + positionShift, dims.height, 0); // Shift toward center for overlap
  leftFlap.rotation.z = Math.PI; // 180° closed
  leftFlap.castShadow = true;
  leftFlap.receiveShadow = true;
  leftFlap.userData.hingePosition = new THREE.Vector3(
    -dims.width / 2,
    dims.height,
    0
  );
  if (hasLidStructure && lidGroup) {
    lidGroup.add(leftFlap);
  } else {
    boxGroup.add(leftFlap);
  }

  // Right top flap - starts CLOSED (laying flat on top)
  const rightFlapGeometry = new THREE.BoxGeometry(
    flapWidth + overlapAmount, // Increase width to create overlap
    flapThickness,
    dims.depth
  );
  if (croppedTextureSet) {
    if (hasLidStructure) {
      const cardboardColor = 0xd8c3a5;
      const exteriorMat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.long2,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.FrontSide,
        polygonOffset: true,
        polygonOffsetFactor: 4,
        polygonOffsetUnits: 4,
      });
      const interiorMat = new THREE.MeshStandardMaterial({
        color: cardboardColor,
        roughness: 0.9,
        metalness: 0.02,
        side: THREE.BackSide,
      });
      rightFlap = new THREE.Mesh(rightFlapGeometry, [
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        exteriorMat,
        interiorMat,
      ]);
      rightFlap.userData.exteriorMaterial = exteriorMat;
      rightFlap.userData.interiorMaterial = interiorMat;
    } else {
      const mat = new THREE.MeshStandardMaterial({
        map: croppedTextureSet.flaps.top.long2,
        roughness: 0.75,
        metalness: 0.05,
        side: THREE.DoubleSide,
      });
      rightFlap = new THREE.Mesh(rightFlapGeometry, mat);
    }
  } else {
    rightFlap = new THREE.Mesh(rightFlapGeometry, flapMaterial);
  }
  rightFlap.position.set(dims.width / 4 - positionShift, dims.height, 0); // Shift toward center for overlap
  rightFlap.rotation.z = -Math.PI; // 180° closed
  rightFlap.castShadow = true;
  rightFlap.receiveShadow = true;
  rightFlap.userData.hingePosition = new THREE.Vector3(
    dims.width / 2,
    dims.height,
    0
  );
  if (hasLidStructure && lidGroup) {
    lidGroup.add(rightFlap);
  } else {
    boxGroup.add(rightFlap);
  }

  // Create bananas inside the box
  await createBananas(dims);

  scene.add(boxGroup);
  updateDimensions();

  // Update lid button visibility - show for all brands with cropped textures
  const toggleLidBtn = document.getElementById("toggleLidBtn");
  if (toggleLidBtn) {
    const brandsWithCroppedTextures = [
      "FRUTALUXE",
      "FRUTANA JOY",
      "FRUTANA",
      "FRUTANOVA",
      "SINDIBAD",
    ];
    const hasCroppedTextures =
      (currentBoxType === "22XU" || currentBoxType === "208") &&
      brandsWithCroppedTextures.includes(currentBrand);
    if (hasCroppedTextures) {
      toggleLidBtn.style.display = "flex";
    } else {
      toggleLidBtn.style.display = "none";
    }
  }

  // Reset lid state when box is recreated
  lidOpen = false;
  if (lidGroup) {
    lidGroup.position.y = 0;
  }
  // Reset transparency state
  updateLidTextures();
}

// Load banana GLB model
async function loadBananaModel() {
  if (bananaModel) {
    return bananaModel; // Return cached model
  }

  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      "assets/textures/banana.glb",
      (gltf) => {
        bananaModel = gltf.scene;
        // Enable shadows on all meshes in the model
        bananaModel.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        resolve(bananaModel);
      },
      undefined,
      (error) => {
        console.error("Failed to load banana model:", error);
        reject(error);
      }
    );
  });
}

// Create banana geometry inside the box
async function createBananas(dims) {
  // Clear existing bananas
  bananas.forEach((banana) => {
    boxGroup.remove(banana);
    // Dispose of cloned model resources
    banana.traverse((child) => {
      if (child.geometry) child.geometry.dispose();
      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((mat) => mat.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  });
  bananas = [];

  try {
    // Step 1: Load banana GLB and compute its bounding box
    const model = await loadBananaModel();

    // Traverse to find the actual mesh if needed
    let bananaMesh = model;
    model.traverse((child) => {
      if (child.isMesh) {
        bananaMesh = child;
      }
    });

    // Compute banana bounding box
    const bananaBB = new THREE.Box3().setFromObject(model);
    const bananaSize = new THREE.Vector3();
    bananaBB.getSize(bananaSize);

    // Step 2: Measure the inner dimensions of the box
    // Get the box body's bounding box
    const boxBB = new THREE.Box3().setFromObject(boxBody);
    const boxSize = new THREE.Vector3();
    boxBB.getSize(boxSize);

    // Account for wall thickness to get internal cavity dimensions
    const wallThickness = 0.02; // 2mm wall thickness
    const internalSize = new THREE.Vector3(
      boxSize.x - wallThickness * 2, // Subtract walls on both sides
      boxSize.y - wallThickness, // Subtract bottom only (top is open)
      boxSize.z - wallThickness * 2 // Subtract walls on both sides
    );

    // Step 3: Derive scale factor using grid-based packing
    // Use 2 rows x 4 columns for 8 bananas total
    const bananaRows = 2;
    const bananaCols = 4;
    const countY = 1; // Single layer only (bananas sit on bottom)

    // Calculate cell dimensions based on grid layout
    const cellX = internalSize.x / bananaCols; // Width per column
    const cellY = internalSize.y / countY; // Height per layer
    const cellZ = internalSize.z / bananaRows; // Depth per row

    // Derive scale factor to fit bananas in cells
    const scaleX = cellX / bananaSize.x;
    const scaleY = cellY / bananaSize.y;
    const scaleZ = cellZ / bananaSize.z;
    const scaleFactor = Math.min(scaleX, scaleY, scaleZ);

    // Calculate scaled banana size (for logging)
    const scaledBananaSize = bananaSize.clone().multiplyScalar(scaleFactor);

    console.log(
      `Banana original size: ${bananaSize.x.toFixed(
        3
      )} x ${bananaSize.y.toFixed(3)} x ${bananaSize.z.toFixed(3)}`
    );
    console.log(
      `Box internal size: ${internalSize.x.toFixed(
        3
      )} x ${internalSize.y.toFixed(3)} x ${internalSize.z.toFixed(3)}`
    );
    console.log(
      `Grid: ${bananaCols} x ${countY} x ${bananaRows} = ${
        bananaCols * countY * bananaRows
      } bananas`
    );
    console.log(
      `Cell size: ${cellX.toFixed(3)} x ${cellY.toFixed(3)} x ${cellZ.toFixed(
        3
      )}`
    );
    console.log(`Scale factor: ${scaleFactor.toFixed(3)}`);
    console.log(
      `Scaled banana size: ${scaledBananaSize.x.toFixed(
        3
      )} x ${scaledBananaSize.y.toFixed(3)} x ${scaledBananaSize.z.toFixed(3)}`
    );

    // Step 4: Clone bananas and place them in grid pattern using bounding-box-safe positioning
    // Calculate internal box bounds (accounting for boxBody position)
    // The box floor is at boxBB.min.y (bottom of the box geometry)
    const floorY = boxBB.min.y + wallThickness; // Actual floor of internal cavity

    const internalMin = new THREE.Vector3(
      boxBB.min.x + wallThickness,
      floorY,
      boxBB.min.z + wallThickness
    );
    const internalMax = new THREE.Vector3(
      boxBB.max.x - wallThickness,
      boxBB.max.y - wallThickness, // Top is open, but account for bottom
      boxBB.max.z - wallThickness
    );

    // Use rows and columns for grid placement
    const internalMinX = internalMin.x;
    const internalMaxX = internalMax.x;
    const internalMinZ = internalMin.z;
    const internalMaxZ = internalMax.z;

    // Calculate spacing for grid cells
    const spacingX = (internalMaxX - internalMinX) / bananaCols;
    const spacingZ = (internalMaxZ - internalMinZ) / bananaRows;

    for (let r = 0; r < bananaRows; r++) {
      for (let c = 0; c < bananaCols; c++) {
        const banana = model.clone();

        // Apply scale to the cloned banana
        banana.scale.setScalar(scaleFactor);

        // Add slight random rotation for natural look
        banana.rotation.x = (Math.random() - 0.5) * 0.2;
        banana.rotation.y = Math.random() * Math.PI * 0.3;
        banana.rotation.z = (Math.random() - 0.5) * 0.2;

        // Enable shadows
        banana.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // First insert into the same container (boxGroup)
        boxGroup.add(banana);

        // Calculate grid cell center positions
        const centerX = internalMinX + spacingX * (c + 0.5);
        const centerZ = internalMinZ + spacingZ * (r + 0.5);

        // Set initial position at cell center
        banana.position.set(centerX, 0, centerZ);

        // Update matrix world to get banana in final coordinate space
        banana.updateMatrixWorld(true);

        // Compute bounding box after positioning
        const bb = new THREE.Box3().setFromObject(banana);

        // Clamp X position to keep banana within bounds
        if (bb.min.x < internalMinX) {
          banana.position.x += internalMinX - bb.min.x;
        } else if (bb.max.x > internalMaxX) {
          banana.position.x -= bb.max.x - internalMaxX;
        }

        // Clamp Z position to keep banana within bounds
        if (bb.min.z < internalMinZ) {
          banana.position.z += internalMinZ - bb.min.z;
        } else if (bb.max.z > internalMaxZ) {
          banana.position.z -= bb.max.z - internalMaxZ;
        }

        // Update matrix world after bounds clamping
        banana.updateMatrixWorld(true);

        // Compute bounding box again after clamping
        const bb2 = new THREE.Box3().setFromObject(banana);

        // Delta from pivot to bottom (relative to banana's own position)
        const pivotToBottom = bb2.min.y - banana.position.y;

        // Correct Y position: floorY - pivotToBottom ensures bottom aligns with floor
        banana.position.y = floorY - pivotToBottom;

        // Final update after Y positioning
        banana.updateMatrixWorld(true);

        bananas.push(banana);
      }
    }
  } catch (error) {
    console.error("Error creating bananas:", error);
    // Fallback to geometric bananas if GLB loading fails
    const bananaMaterial = new THREE.MeshStandardMaterial({
      color: 0x8bc34a,
      roughness: 0.6,
      metalness: 0.1,
    });

    const bananaCount = 4;
    const bananaRadius = 0.08;
    const bananaLength = 0.6;

    // Scale fallback bananas to fit box
    const maxLength = Math.min(dims.width, dims.depth) * 0.4;
    const scaleFactor = maxLength / bananaLength;
    const scaledRadius = bananaRadius * scaleFactor;
    const scaledLength = bananaLength * scaleFactor;

    for (let i = 0; i < bananaCount; i++) {
      const banana = createBanana(scaledRadius, scaledLength, bananaMaterial);

      const row = Math.floor(i / 2);
      const col = i % 2;
      const spacingX = dims.width * 0.3;
      const spacingZ = dims.depth * 0.3;
      const x = (col - 0.5) * spacingX;
      const z = (row - 0.5) * spacingZ;
      const y = dims.height * 0.4;

      banana.position.set(x, y, z);
      banana.rotation.x = Math.random() * 0.3 - 0.15;
      banana.rotation.y = Math.random() * Math.PI * 0.5;
      banana.rotation.z = Math.random() * 0.2 - 0.1;

      banana.castShadow = true;
      banana.receiveShadow = true;

      boxGroup.add(banana);
      bananas.push(banana);
    }
  }
}

// Geometry and texture loading are now handled in separate modules

// Close flaps to form the lid
// function closeFlaps() {
//   if (!leftFlap || !rightFlap || !frontFlap || !backFlap) return;

//   flapsOpen = false;
//   const dims = boxDimensions[currentBoxType];

//   // Front flap - rotate to lay flat on top
//   gsap.to(frontFlap.rotation, {
//     x: -Math.PI,
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(frontFlap.position, {
//     z: dims.depth / 4,
//     y: dims.height, // Reset y position
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Back flap - rotate to lay flat on top
//   gsap.to(backFlap.rotation, {
//     x: Math.PI,
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(backFlap.position, {
//     z: -dims.depth / 4,
//     y: dims.height, // Reset y position
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Left flap - rotate to lay flat on top
//   gsap.to(leftFlap.rotation, {
//     z: Math.PI,
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(leftFlap.position, {
//     x: -dims.width / 4,
//     y: dims.height, // Reset y position
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Right flap - rotate to lay flat on top
//   gsap.to(rightFlap.rotation, {
//     z: -Math.PI,
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(rightFlap.position, {
//     x: dims.width / 4,
//     y: dims.height, // Reset y position
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
// }

// // Open flaps to hang on the sides
// function openFlaps() {
//   if (!leftFlap || !rightFlap || !frontFlap || !backFlap) return;

//   flapsOpen = true;
//   const dims = boxDimensions[currentBoxType];
//   const flapWidth = dims.depth / 2;
//   const flapThickness = 0.02;

//   // 60 degrees from horizontal = 30 degrees from vertical (π/6 radians)
//   const tiltAngle = Math.PI / 6; // 30 degrees in radians

//   // When flap tilts 60° from horizontal, the center moves outward horizontally
//   // but stays at the same vertical level (y = dims.height)
//   // Horizontal offset: (flapWidth/2) * sin(tiltAngle) - moves the center outward
//   const horizontalOffset = (flapWidth / 2) * Math.sin(tiltAngle);

//   // Front flap - tilt 60° from horizontal (30° from vertical), tilted forward (outward)
//   gsap.to(frontFlap.rotation, {
//     x: tiltAngle, // 30° tilted forward from vertical = 60° from horizontal
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(frontFlap.position, {
//     z: dims.depth / 2 + horizontalOffset, // Move outward as it tilts
//     y: dims.height, // Keep at same height - no downward movement
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Back flap - tilt 60° from horizontal (30° from vertical), tilted backward (outward)
//   gsap.to(backFlap.rotation, {
//     x: -tiltAngle, // -30° tilted backward from vertical = 60° from horizontal
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(backFlap.position, {
//     z: -dims.depth / 2 - horizontalOffset, // Move outward as it tilts
//     y: dims.height, // Keep at same height - no downward movement
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Left flap - tilt 60° from horizontal (30° from vertical), tilted left (outward)
//   gsap.to(leftFlap.rotation, {
//     z: tiltAngle, // 30° tilted left from vertical = 60° from horizontal
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(leftFlap.position, {
//     x: -dims.width / 2 - horizontalOffset, // Move outward as it tilts
//     y: dims.height, // Keep at same height - no downward movement
//     duration: 0.8,
//     ease: "power2.inOut",
//   });

//   // Right flap - tilt 60° from horizontal (30° from vertical), tilted right (outward)
//   gsap.to(rightFlap.rotation, {
//     z: -tiltAngle, // -30° tilted right from vertical = 60° from horizontal
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
//   gsap.to(rightFlap.position, {
//     x: dims.width / 2 + horizontalOffset, // Move outward as it tilts
//     y: dims.height, // Keep at same height - no downward movement
//     duration: 0.8,
//     ease: "power2.inOut",
//   });
// }

// Update textures based on lid state (for brands with lid structure)
function updateLidTextures() {
  if (!lidGroup || !boxBody) return;

  // Adjust alphaTest threshold on box body materials based on lid state
  // alphaTest makes only the holes transparent (where alpha < threshold)
  // The rest of the side remains opaque
  if (
    boxBody.userData.interiorMaterials &&
    Array.isArray(boxBody.userData.interiorMaterials)
  ) {
    boxBody.userData.interiorMaterials.forEach((mat, index) => {
      // Skip top and bottom faces (indices 2 and 3)
      if (index !== 2 && index !== 3 && mat && mat.isMeshStandardMaterial) {
        // Adjust alphaTest threshold based on lid state
        // When lid is open: higher threshold (0.1) for more visible holes
        // When lid is closed: lower threshold (0.01) to prevent black holes but keep them subtle
        mat.alphaTest = lidOpen ? 0.1 : 0.01;
        mat.needsUpdate = true;
      }
    });
  }
}

// Toggle lid lift (for brands with lid structure)
function toggleLid() {
  if (!lidGroup) return;

  lidOpen = !lidOpen;
  const dims = boxDimensions[currentBoxType];
  const liftHeight = dims.height + 0.5; // Lift lid above the box
  const sideOffset = dims.width * 1.2; // Move lid to the side (to the right)

  if (lidOpen) {
    // Lift the lid straight up, then translate it to the side on X axis
    // This allows viewing the box contents from above without the lid blocking
    gsap.to(lidGroup.position, {
      y: liftHeight, // Lift up
      x: sideOffset, // Move to the side (positive X = right)
      z: 0, // Keep Z at 0 (no forward/backward movement)
      duration: 1.0,
      ease: "power2.inOut",
      onUpdate: () => {
        updateLidTextures();
      },
      onComplete: () => {
        updateLidTextures();
      },
    });
  } else {
    // Reset position (bring lid back down and to center)
    gsap.to(lidGroup.position, {
      y: 0,
      x: 0,
      z: 0,
      duration: 1.0,
      ease: "power2.inOut",
      onUpdate: () => {
        updateLidTextures();
      },
      onComplete: () => {
        updateLidTextures();
      },
    });
  }

  // Update textures immediately
  updateLidTextures();
}

// Update dimensions display
function updateDimensions() {
  if (dimensionsGroup) {
    dimensionsGroup.clear();
  }

  if (!dimensionsVisible) return;

  const dims = boxDimensions[currentBoxType];

  // Create dimension lines with arrows
  const lineMaterial = new THREE.LineBasicMaterial({
    color: 0xff3333,
    linewidth: 2,
  });
  const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xff3333 });

  // Width dimension
  const widthY = dims.height + 1.5;
  const widthPoints = [
    new THREE.Vector3(-dims.width / 2, widthY, dims.depth / 2 + 0.5),
    new THREE.Vector3(dims.width / 2, widthY, dims.depth / 2 + 0.5),
  ];
  const widthGeometry = new THREE.BufferGeometry().setFromPoints(widthPoints);
  const widthLine = new THREE.Line(widthGeometry, lineMaterial);
  dimensionsGroup.add(widthLine);

  // Width arrows
  addArrow(
    new THREE.Vector3(-dims.width / 2, widthY, dims.depth / 2 + 0.5),
    new THREE.Vector3(1, 0, 0),
    arrowMaterial
  );
  addArrow(
    new THREE.Vector3(dims.width / 2, widthY, dims.depth / 2 + 0.5),
    new THREE.Vector3(-1, 0, 0),
    arrowMaterial
  );

  // Height dimension
  const heightX = dims.width / 2 + 1;
  const heightPoints = [
    new THREE.Vector3(heightX, 0, dims.depth / 2 + 0.5),
    new THREE.Vector3(heightX, dims.height, dims.depth / 2 + 0.5),
  ];
  const heightGeometry = new THREE.BufferGeometry().setFromPoints(heightPoints);
  const heightLine = new THREE.Line(heightGeometry, lineMaterial);
  dimensionsGroup.add(heightLine);

  // Height arrows
  addArrow(
    new THREE.Vector3(heightX, 0, dims.depth / 2 + 0.5),
    new THREE.Vector3(0, 1, 0),
    arrowMaterial
  );
  addArrow(
    new THREE.Vector3(heightX, dims.height, dims.depth / 2 + 0.5),
    new THREE.Vector3(0, -1, 0),
    arrowMaterial
  );

  // Depth dimension
  const depthX = dims.width / 2 + 1;
  const depthY = dims.height + 0.5;
  const depthPoints = [
    new THREE.Vector3(depthX, depthY, -dims.depth / 2),
    new THREE.Vector3(depthX, depthY, dims.depth / 2),
  ];
  const depthGeometry = new THREE.BufferGeometry().setFromPoints(depthPoints);
  const depthLine = new THREE.Line(depthGeometry, lineMaterial);
  dimensionsGroup.add(depthLine);

  // Depth arrows
  addArrow(
    new THREE.Vector3(depthX, depthY, -dims.depth / 2),
    new THREE.Vector3(0, 0, 1),
    arrowMaterial
  );
  addArrow(
    new THREE.Vector3(depthX, depthY, dims.depth / 2),
    new THREE.Vector3(0, 0, -1),
    arrowMaterial
  );

  function addArrow(position, direction, material) {
    const arrowGeometry = new THREE.ConeGeometry(0.1, 0.3, 8);
    const arrow = new THREE.Mesh(arrowGeometry, material);
    arrow.position.copy(position);

    // Orient arrow in direction
    const axis = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(axis, direction);
    arrow.quaternion.copy(quaternion);

    dimensionsGroup.add(arrow);
  }
}

// Flap animation functions are defined earlier in the file

// Toggle dimensions
function toggleDimensions() {
  dimensionsVisible = !dimensionsVisible;
  updateDimensions();

  const btn = document.getElementById("toggleDimensionsBtn");
  if (dimensionsVisible) {
    btn.classList.add("active");
  } else {
    btn.classList.remove("active");
  }
}

// Handle window resize
function onWindowResize() {
  const container = document.getElementById("canvas-container");
  camera.aspect = container.clientWidth / container.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(container.clientWidth, container.clientHeight);
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

// Event Listeners
document.addEventListener("DOMContentLoaded", () => {
  init();

  // Box type selection
  document.getElementById("boxType").addEventListener("change", (e) => {
    currentBoxType = e.target.value;
    // Update lid button visibility
    const toggleLidBtn = document.getElementById("toggleLidBtn");
    if (toggleLidBtn) {
      if (currentBrand === "FRUTALUXE") {
        toggleLidBtn.style.display = "flex";
      } else {
        toggleLidBtn.style.display = "none";
      }
    }
    createBox().catch((err) => {
      console.error("Error creating box:", err);
    });
  });

  // Brand selection
  document.querySelectorAll(".brand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document
        .querySelectorAll(".brand-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentBrand = btn.dataset.brand;
      // Update lid button visibility - show for all brands with cropped textures
      const toggleLidBtn = document.getElementById("toggleLidBtn");
      if (toggleLidBtn) {
        const brandsWithCroppedTextures = [
          "FRUTALUXE",
          "FRUTANA JOY",
          "FRUTANA",
          "FRUTANOVA",
          "SINDIBAD",
        ];
        const hasCroppedTextures =
          (currentBoxType === "22XU" || currentBoxType === "208") &&
          brandsWithCroppedTextures.includes(currentBrand);
        if (hasCroppedTextures) {
          toggleLidBtn.style.display = "flex";
        } else {
          toggleLidBtn.style.display = "none";
        }
      }
      createBox().catch((err) => {
        console.error("Error creating box:", err);
      });
    });
  });

  // Control buttons - Flap animation removed
  // document.getElementById("openFlapsBtn").addEventListener("click", () => {
  //   if (flapsOpen) {
  //     closeFlaps();
  //   } else {
  //     openFlaps();
  //   }
  // });

  const toggleLidBtn = document.getElementById("toggleLidBtn");
  if (toggleLidBtn) {
    toggleLidBtn.addEventListener("click", toggleLid);
  }

  document
    .getElementById("toggleDimensionsBtn")
    .addEventListener("click", toggleDimensions);

  // Function to update lid button visibility
  function updateLidButtonVisibility() {
    const btn = document.getElementById("toggleLidBtn");
    if (btn) {
      if (currentBrand === "FRUTALUXE") {
        btn.style.display = "flex";
      } else {
        btn.style.display = "none";
      }
    }
  }

  // Initial visibility
  updateLidButtonVisibility();

  // Custom Fields Toggle Logic
  const boxTypeForm = document.getElementById("boxTypeForm");
  const brandForm = document.getElementById("brandForm");
  const customSizeFields = document.getElementById("customSizeFields");
  const customBrandFields = document.getElementById("customBrandFields");

  const customLength = document.getElementById("customLength");
  const customWidth = document.getElementById("customWidth");
  const customHeight = document.getElementById("customHeight");
  const dimensionPreview = document.getElementById("dimensionPreview");

  // Toggle custom size fields
  boxTypeForm.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customSizeFields.style.display = "block";
      // Make dimension fields required
      customLength.required = true;
      customWidth.required = true;
      customHeight.required = true;
    } else {
      customSizeFields.style.display = "none";
      // Remove required attribute
      customLength.required = false;
      customWidth.required = false;
      customHeight.required = false;
      // Clear values
      customLength.value = "";
      customWidth.value = "";
      customHeight.value = "";
      dimensionPreview.textContent = "--";
    }
  });

  // Toggle custom brand fields
  brandForm.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customBrandFields.style.display = "block";
      // Make color and appliqué required
      const colorRadios = document.querySelectorAll('input[name="boxColor"]');
      const appliqueRadios = document.querySelectorAll(
        'input[name="applique"]'
      );
      colorRadios.forEach((radio) => (radio.required = true));
      appliqueRadios.forEach((radio) => (radio.required = true));
    } else {
      customBrandFields.style.display = "none";
      // Remove required attribute and clear selections
      const colorRadios = document.querySelectorAll('input[name="boxColor"]');
      const appliqueRadios = document.querySelectorAll(
        'input[name="applique"]'
      );
      colorRadios.forEach((radio) => {
        radio.required = false;
        radio.checked = false;
      });
      appliqueRadios.forEach((radio) => {
        radio.required = false;
        radio.checked = false;
      });
    }
  });

  // Update dimension preview in real-time
  function updateDimensionPreview() {
    const length = customLength.value;
    const width = customWidth.value;
    const height = customHeight.value;

    if (length && width && height) {
      dimensionPreview.textContent = `${length} × ${width} × ${height} mm`;
    } else if (length || width || height) {
      const parts = [];
      if (length) parts.push(length);
      if (width) parts.push(width);
      if (height) parts.push(height);
      dimensionPreview.textContent = parts.join(" × ") + " mm (incomplete)";
    } else {
      dimensionPreview.textContent = "--";
    }
  }

  customLength.addEventListener("input", updateDimensionPreview);
  customWidth.addEventListener("input", updateDimensionPreview);
  customHeight.addEventListener("input", updateDimensionPreview);

  // Form submission
  document.getElementById("customBoxForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const formData = {
      fullName: document.getElementById("fullName").value,
      email: document.getElementById("email").value,
      company: document.getElementById("company").value,
      phone: document.getElementById("phone").value,
      boxType: document.getElementById("boxTypeForm").value,
      brand: document.getElementById("brandForm").value,
      quantity: document.getElementById("quantity").value,
      requirements: document.getElementById("requirements").value,
      newsletter: document.getElementById("newsletter").checked,
    };

    // Add custom size data if applicable
    if (formData.boxType === "custom") {
      formData.customDimensions = {
        length: customLength.value,
        width: customWidth.value,
        height: customHeight.value,
      };
    }

    // Add custom brand data if applicable
    if (formData.brand === "custom") {
      const selectedColor = document.querySelector(
        'input[name="boxColor"]:checked'
      );
      const selectedApplique = document.querySelector(
        'input[name="applique"]:checked'
      );
      formData.customBrand = {
        color: selectedColor ? selectedColor.value : null,
        applique: selectedApplique ? selectedApplique.value : null,
      };
    }

    console.log("Form submitted:", formData);

    document.getElementById("customBoxForm").style.display = "none";
    document.getElementById("formSuccess").style.display = "flex";

    setTimeout(() => {
      document.getElementById("customBoxForm").reset();
      document.getElementById("customBoxForm").style.display = "block";
      document.getElementById("formSuccess").style.display = "none";
      // Reset custom fields
      customSizeFields.style.display = "none";
      customBrandFields.style.display = "none";
      dimensionPreview.textContent = "--";
    }, 5000);
  });

  // Sync form selects with configurator
  document.getElementById("boxType").addEventListener("change", (e) => {
    document.getElementById("boxTypeForm").value = e.target.value;
  });

  document.querySelectorAll(".brand-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.getElementById("brandForm").value = btn.dataset.brand;
    });
  });
});
