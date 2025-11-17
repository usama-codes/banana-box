// Import Three.js
import * as THREE from "three";

/**
 * Create BoxGeometry with custom UV mapping based on unfolded box layout
 * This maps the texture coordinates to match the unfolded box design
 * from the engineering drawings
 */
export function createBoxWithCustomUVs(width, height, depth) {
  const geometry = new THREE.BoxGeometry(width, height, depth);

  // Get UV attribute
  const uvAttribute = geometry.attributes.uv;

  // BoxGeometry face order in Three.js:
  // 0-3: Right face (+X)
  // 4-7: Left face (-X)
  // 8-11: Top face (+Y)
  // 12-15: Bottom face (-Y)
  // 16-19: Front face (+Z)
  // 20-23: Back face (-Z)

  // Calculate UV coordinates based on unfolded box layout
  const uvLayout = calculateUnfoldedUVLayout(width, height, depth);

  // Right face (+X) - Right side of bottom
  setFaceUVs(
    uvAttribute,
    0,
    uvLayout.right.u1,
    uvLayout.right.v1,
    uvLayout.right.u2,
    uvLayout.right.v2,
    uvLayout.right.u3,
    uvLayout.right.v3,
    uvLayout.right.u4,
    uvLayout.right.v4
  );

  // Left face (-X) - Left side of bottom
  setFaceUVs(
    uvAttribute,
    4,
    uvLayout.left.u1,
    uvLayout.left.v1,
    uvLayout.left.u2,
    uvLayout.left.v2,
    uvLayout.left.u3,
    uvLayout.left.v3,
    uvLayout.left.u4,
    uvLayout.left.v4
  );

  // Top face (+Y) - Not visible in closed box, use minimal area
  setFaceUVs(uvAttribute, 8, 0, 0, 0.01, 0, 0.01, 0.01, 0, 0.01);

  // Bottom face (-Y) - Center of unfolded layout
  setFaceUVs(
    uvAttribute,
    12,
    uvLayout.bottom.u1,
    uvLayout.bottom.v1,
    uvLayout.bottom.u2,
    uvLayout.bottom.v2,
    uvLayout.bottom.u3,
    uvLayout.bottom.v3,
    uvLayout.bottom.u4,
    uvLayout.bottom.v4
  );

  // Front face (+Z) - Below bottom
  setFaceUVs(
    uvAttribute,
    16,
    uvLayout.front.u1,
    uvLayout.front.v1,
    uvLayout.front.u2,
    uvLayout.front.v2,
    uvLayout.front.u3,
    uvLayout.front.v3,
    uvLayout.front.u4,
    uvLayout.front.v4
  );

  // Back face (-Z) - Above bottom
  setFaceUVs(
    uvAttribute,
    20,
    uvLayout.back.u1,
    uvLayout.back.v1,
    uvLayout.back.u2,
    uvLayout.back.v2,
    uvLayout.back.u3,
    uvLayout.back.v3,
    uvLayout.back.u4,
    uvLayout.back.v4
  );

  uvAttribute.needsUpdate = true;

  return geometry;
}

/**
 * Calculate UV coordinates for unfolded box layout
 * The unfolded box in the PNG is arranged as:
 *
 *           |----depth----|
 *      ---------------------
 *      |     Back (W×H)    |  -
 *      --------------------- height
 * |----|--------------------|----| -
 * |Left|   Bottom (W×D)     |Right| depth
 * |(D×H)|                   |(D×H)|
 * |----|--------------------|----| -
 *      |    Front (W×H)     | -
 *      ---------------------  height
 *      |  Flaps (various)   |
 *      ---------------------
 */
function calculateUnfoldedUVLayout(width, height, depth) {
  // Total layout dimensions
  const layoutWidth = depth + width + depth; // Left + Bottom + Right
  const layoutHeight = height + depth + height; // Back + Bottom + Front (+ flaps)

  // Add margins (typical 5-10% margin in engineering drawings)
  const margin = 0.05;
  const usableWidth = 1.0 - 2 * margin;
  const usableHeight = 1.0 - 2 * margin;

  // Normalize dimensions to 0-1 UV space
  const normWidth = (width / layoutWidth) * usableWidth;
  const normHeight = (height / layoutHeight) * usableHeight;
  const normDepth = (depth / layoutHeight) * usableHeight;
  const normDepthSide = (depth / layoutWidth) * usableWidth;

  // Calculate centers and positions
  const centerU = 0.5;
  const centerV = 0.5;

  // Bottom face - center of texture
  const bottomLeft = centerU - normWidth / 2;
  const bottomRight = centerU + normWidth / 2;
  const bottomTop = centerV - normDepth / 2;
  const bottomBottom = centerV + normDepth / 2;

  // Front face - below bottom
  const frontLeft = bottomLeft;
  const frontRight = bottomRight;
  const frontTop = bottomBottom;
  const frontBottom = frontTop + normHeight;

  // Back face - above bottom
  const backLeft = bottomLeft;
  const backRight = bottomRight;
  const backBottom = bottomTop;
  const backTop = backBottom - normHeight;

  // Left face - left of bottom
  const leftRight = bottomLeft;
  const leftLeft = leftRight - normDepthSide;
  const leftTop = bottomTop;
  const leftBottom = bottomBottom;

  // Right face - right of bottom
  const rightLeft = bottomRight;
  const rightRight = rightLeft + normDepthSide;
  const rightTop = bottomTop;
  const rightBottom = bottomBottom;

  return {
    bottom: {
      u1: bottomLeft,
      v1: bottomBottom, // Bottom-left
      u2: bottomRight,
      v2: bottomBottom, // Bottom-right
      u3: bottomRight,
      v3: bottomTop, // Top-right
      u4: bottomLeft,
      v4: bottomTop, // Top-left
    },
    front: {
      u1: frontLeft,
      v1: frontBottom,
      u2: frontRight,
      v2: frontBottom,
      u3: frontRight,
      v3: frontTop,
      u4: frontLeft,
      v4: frontTop,
    },
    back: {
      u1: backLeft,
      v1: backBottom,
      u2: backRight,
      v2: backBottom,
      u3: backRight,
      v3: backTop,
      u4: backLeft,
      v4: backTop,
    },
    left: {
      u1: leftLeft,
      v1: leftBottom,
      u2: leftRight,
      v2: leftBottom,
      u3: leftRight,
      v3: leftTop,
      u4: leftLeft,
      v4: leftTop,
    },
    right: {
      u1: rightLeft,
      v1: rightBottom,
      u2: rightRight,
      v2: rightBottom,
      u3: rightRight,
      v3: rightTop,
      u4: rightLeft,
      v4: rightTop,
    },
  };
}

/**
 * Helper function to set UV coordinates for a face (4 vertices)
 */
function setFaceUVs(uvAttribute, startIndex, u1, v1, u2, v2, u3, v3, u4, v4) {
  // Three.js uses 4 vertices per face for BoxGeometry
  uvAttribute.setXY(startIndex, u1, v1);
  uvAttribute.setXY(startIndex + 1, u2, v2);
  uvAttribute.setXY(startIndex + 2, u3, v3);
  uvAttribute.setXY(startIndex + 3, u4, v4);
}

/**
 * Create a single banana shape
 */
export function createBanana(radius, length, material) {
  const bananaGroup = new THREE.Group();

  // Main body - curved cylinder
  const bodyGeometry = new THREE.CylinderGeometry(
    radius,
    radius * 0.7,
    length,
    8
  );
  const body = new THREE.Mesh(bodyGeometry, material);
  body.rotation.z = Math.PI / 2;
  body.position.x = length / 2;
  bananaGroup.add(body);

  // Stem end - small sphere
  const stemGeometry = new THREE.SphereGeometry(radius * 0.5, 6, 6);
  const stem = new THREE.Mesh(stemGeometry, material);
  stem.position.x = length;
  bananaGroup.add(stem);

  // Flower end - small sphere
  const flowerGeometry = new THREE.SphereGeometry(radius * 0.8, 6, 6);
  const flower = new THREE.Mesh(flowerGeometry, material);
  bananaGroup.add(flower);

  // Add slight curve
  bananaGroup.rotation.y = 0.3;

  return bananaGroup;
}
