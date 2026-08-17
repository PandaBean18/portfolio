import { ref, listAll, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebaseConfig';

// Helper to extract the 4 edges of a 32x32 image (Top, Right, Bottom, Left)
// Returns arrays of RGBA values.
const extractEdges = (imageData) => {
  const data = imageData.data; // Uint8ClampedArray
  const top = new Uint8Array(32 * 4);
  const right = new Uint8Array(32 * 4);
  const bottom = new Uint8Array(32 * 4);
  const left = new Uint8Array(32 * 4);

  for (let i = 0; i < 32; i++) {
    // Top (row 0)
    let idxTop = (0 * 32 + i) * 4;
    top.set(data.slice(idxTop, idxTop + 4), i * 4);

    // Bottom (row 31)
    let idxBot = (31 * 32 + i) * 4;
    bottom.set(data.slice(idxBot, idxBot + 4), i * 4);

    // Left (col 0)
    let idxLeft = (i * 32 + 0) * 4;
    left.set(data.slice(idxLeft, idxLeft + 4), i * 4);

    // Right (col 31)
    let idxRight = (i * 32 + 31) * 4;
    right.set(data.slice(idxRight, idxRight + 4), i * 4);
  }

  return { top, right, bottom, left };
};

// Calculate Sum of Absolute Differences between two edges
const calculateEdgeDiff = (edge1, edge2) => {
  let diff = 0;
  for (let i = 0; i < edge1.length; i++) {
    diff += Math.abs(edge1[i] - edge2[i]);
  }
  return diff;
};

function* spiralGenerator(cols, rows) {
  yield { x: 0, y: 0 };
  let x = 0, y = 0;
  let dx = 1, dy = 0;
  let segment_length = 1;
  let segment_passed = 0;
  
  // Bounds
  const minX = -Math.floor(cols / 2);
  const maxX = minX + cols - 1;
  const minY = -Math.floor(rows / 2);
  const maxY = minY + rows - 1;

  while (true) {
    x += dx;
    y += dy;
    
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      yield { x, y };
    }

    segment_passed += 1;
    if (segment_passed === segment_length) {
      segment_passed = 0;
      const temp = dx;
      dx = -dy;
      dy = temp;
      if (dy === 0) {
        segment_length += 1;
      }
    }
  }
}

export class GreedyMatcher {
  constructor() {
    this.grid = new Map(); // key: "x,y", value: { imgObj, x, y }
    this.unplaced = new Set();
    this.spiral = null;
    this.currentTarget = null;
    
    // Create a single reusable canvas for processing
    this.canvas = document.createElement('canvas');
    this.canvas.width = 32;
    this.canvas.height = 32;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  async processSingleImage(itemRef) {
    try {
      // Construct the public URL directly to save a slow network roundtrip from getDownloadURL()
      const url = `https://firebasestorage.googleapis.com/v0/b/sir-pixelot-gallery.firebasestorage.app/o/images%2F${encodeURIComponent(itemRef.name)}?alt=media`;
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = url; 
      });

      this.ctx.clearRect(0, 0, 32, 32);
      this.ctx.drawImage(img, 0, 0, 32, 32);
      const imgData = this.ctx.getImageData(0, 0, 32, 32);
      
      return {
        id: itemRef.name,
        url,
        edges: extractEdges(imgData),
        imageElement: img
      };
    } catch (e) {
      console.error("Error loading image:", e);
      return null;
    }
  }

  async startStreaming(onProgress, onUpdate) {
    onProgress("Fetching list from Firebase...", 0);
    const listRef = ref(storage, 'images/');
    const res = await listAll(listRef);
    let items = res.items;

    // Shuffle items so the mosaic builds randomly
    items = items.sort(() => Math.random() - 0.5);

    if (items.length === 0) {
      onProgress("No images found.", 100);
      return;
    }
    
    // Initialize bounded spiral based on total tiles
    const aspect = 16 / 9;
    const cols = Math.max(1, Math.ceil(Math.sqrt(items.length * aspect)));
    const rows = Math.max(1, Math.ceil(items.length / cols));
    this.spiral = spiralGenerator(cols, rows);
    this.currentTarget = this.spiral.next().value;

    onProgress("Starting mosaic stream...", 10);

    let processedCount = 0;

    // Fire off all requests simultaneously!
    const promises = items.map(async (item, index) => {
      const imgObj = await this.processSingleImage(item);
      
      if (imgObj) {
        if (this.grid.size === 0 && this.unplaced.size === 0) {
          this.placeImage(imgObj, this.currentTarget.x, this.currentTarget.y);
        } else {
          this.unplaced.add(imgObj);
        }
        
        let placedSomething = true;
        while (placedSomething) {
          placedSomething = this.step();
        }
        
        processedCount++;
        onProgress(`Assembling... (${processedCount}/${items.length})`, 10 + (processedCount / items.length) * 90);
        onUpdate(); // Trigger a render
      }
    });

    await Promise.all(promises);
    onProgress("Mosaic Complete", 100);
  }

  placeImage(imgObj, x, y) {
    this.grid.set(`${x},${y}`, { imgObj, x, y });
    this.unplaced.delete(imgObj);
    // Advance the spiral to the next target
    this.currentTarget = this.spiral.next().value;
  }

  step() {
    if (this.unplaced.size === 0) return false;

    let bestScore = Infinity;
    let bestImgObj = null;

    const x = this.currentTarget.x;
    const y = this.currentTarget.y;

    const neighbors = {
      top: this.grid.get(`${x},${y - 1}`),
      right: this.grid.get(`${x + 1},${y}`),
      bottom: this.grid.get(`${x},${y + 1}`),
      left: this.grid.get(`${x - 1},${y}`)
    };

    for (const imgObj of this.unplaced) {
      let score = 0;
      
      if (neighbors.top) score += calculateEdgeDiff(imgObj.edges.top, neighbors.top.imgObj.edges.bottom);
      if (neighbors.right) score += calculateEdgeDiff(imgObj.edges.right, neighbors.right.imgObj.edges.left);
      if (neighbors.bottom) score += calculateEdgeDiff(imgObj.edges.bottom, neighbors.bottom.imgObj.edges.top);
      if (neighbors.left) score += calculateEdgeDiff(imgObj.edges.left, neighbors.left.imgObj.edges.right);

      if (score < bestScore) {
        bestScore = score;
        bestImgObj = imgObj;
      }
    }

    if (bestImgObj) {
      this.placeImage(bestImgObj, x, y);
      return true;
    }

    return false;
  }
}
