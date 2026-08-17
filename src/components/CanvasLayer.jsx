import React, { useEffect, useRef, useState } from 'react';
import { GreedyMatcher } from '../services/GreedyMatcher';
import { ref, onValue } from 'firebase/database';
import { database } from '../firebaseConfig';
import { PROJECTS, getProjectScrollState, HERO_END, CASE_STUDY_START } from '../data/projects';

const parseFilename = (filename) => {
  if (!filename) return { timestamp: 'UNKNOWN', theme: 'UNKNOWN' };
  let name = filename.split('.')[0];
  const parts = name.split('_');
  if (parts.length < 2) return { timestamp: 'UNKNOWN', theme: name.toUpperCase() };
  
  let timestamp = parts[0];
  let theme = parts.length >= 3 && !isNaN(parts[1]) ? parts.slice(2).join(' ') : parts.slice(1).join(' ');
  
  if (!isNaN(timestamp) && timestamp.length >= 10) {
     const d = new Date(parseInt(timestamp.length === 10 ? timestamp + '000' : timestamp));
     if (!isNaN(d.getTime())) {
       timestamp = d.toISOString().split('T')[0];
     }
  }
  return { timestamp, theme: theme.toUpperCase() };
};

const resolveTargetTile = (anchor, grid) => {
  let best = null;
  let bestScore = -Infinity;
  for (const val of grid.values()) {
    if (!val.imgObj || !val.imgObj.imageElement) continue;
    let score = 0;
    if (anchor === 'TOP_LEFT') score = -val.x - val.y;
    else if (anchor === 'TOP_RIGHT') score = val.x - val.y;
    else if (anchor === 'BOTTOM_LEFT') score = -val.x + val.y;
    else if (anchor === 'BOTTOM_RIGHT') score = val.x + val.y;
    else if (anchor === 'CENTER') return { x: 0, y: 0 };
    
    if (score > bestScore) {
      bestScore = score;
      best = val;
    }
  }
  return best || { x: 0, y: 0, imgObj: null };
};

export default function CanvasLayer({ onLoadingUpdate, onAboutClick }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const pixelBufferRef = useRef(null);
  const [liveFeed, setLiveFeed] = useState(null);
  const matcherRef = useRef(null);
  const hoveredKeyRef = useRef(null);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1.0 });
  const transformRef = useRef({ x: 0, y: 0, scale: 1.0 }); 
  const [targetUserScale, setTargetUserScale] = useState(1.0);
  const targetUserScaleRef = useRef(1.0);
  const [currentFilter, setCurrentFilter] = useState('ALL');
  const currentFilterRef = useRef('ALL');
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const mousePos = useRef({ x: -9999, y: -9999 });
  const targetPreviewImageRef = useRef(new Map());

  useEffect(() => {
    const imgMap = new Map();
    PROJECTS.forEach((proj, idx) => {
      if (proj.previewImage) {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = proj.previewImage;
        imgMap.set(idx, img);
      }
    });
    targetPreviewImageRef.current = imgMap;
  }, []);


  useEffect(() => {
    currentFilterRef.current = currentFilter;
  }, [currentFilter]);

  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  useEffect(() => {
    targetUserScaleRef.current = targetUserScale;
  }, [targetUserScale]);

  useEffect(() => {
    let resizeObserver;
    if (canvasRef.current && canvasRef.current.parentElement) {
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = canvasRef.current.parentElement.clientWidth * dpr;
      canvasRef.current.height = canvasRef.current.parentElement.clientHeight * dpr;

      resizeObserver = new ResizeObserver(() => {
        if (canvasRef.current && canvasRef.current.parentElement) {
          const dpr = window.devicePixelRatio || 1;
          canvasRef.current.width = canvasRef.current.parentElement.clientWidth * dpr;
          canvasRef.current.height = canvasRef.current.parentElement.clientHeight * dpr;
        }
      });
      resizeObserver.observe(canvasRef.current.parentElement);
    }

    const liveRef = ref(database, 'live_feed');
    const unsubscribe = onValue(liveRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.image_b64) {
        setLiveFeed(data);
      } else {
        setLiveFeed(null);
      }
    });

    const runAlgorithm = async () => {
      const matcher = new GreedyMatcher();
      matcherRef.current = matcher;
      try {
        await matcher.startStreaming((msg, percent) => {
          if (onLoadingUpdate) {
            onLoadingUpdate(msg, percent);
          }
        }, () => {});
      } catch (e) {
        console.error(e);
      }
    };

    runAlgorithm();

    let animationFrameId;
    let currentDimOpacity = 1.0;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const matcher = matcherRef.current;
      if (canvas && matcher) {
        if (!pixelBufferRef.current) {
          const firstTile = Array.from(matcher.grid.values()).find(v => v.imgObj.imageElement);
          if (firstTile && firstTile.imgObj.imageElement.complete) {
            const offCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
            offCtx.canvas.width = 32;
            offCtx.canvas.height = 32;
            offCtx.drawImage(firstTile.imgObj.imageElement, 0, 0, 32, 32);
            pixelBufferRef.current = offCtx.getImageData(0, 0, 32, 32).data;
          }
        }

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        ctx.imageSmoothingEnabled = false; 
        
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const t = transformRef.current;
        const centerX = canvas.width / (2 * dpr);
        const centerY = canvas.height / (2 * dpr);

        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        const rawProgress = maxScroll > 0 ? window.scrollY / maxScroll : 0;
        const progress = Math.max(0, Math.min(1, rawProgress));

        const mx = mousePos.current.screenX || -9999;
        const my = mousePos.current.screenY || -9999;
        const normX = mx !== -9999 ? (mx - centerX) / centerX : 0;
        const normY = my !== -9999 ? (my - centerY) / centerY : 0;

        const tiltFactor = Math.max(0, 1 - progress / HERO_END);

        if (containerRef.current) {
          if (mx === -9999 || tiltFactor === 0) {
            containerRef.current.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg)`;
          } else {
            const rotateX = -normY * 8 * tiltFactor;
            const rotateY = normX * 8 * tiltFactor;
            containerRef.current.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
          }
        }
        
        const dotParallaxX = normX * -15 * tiltFactor;
        const dotParallaxY = normY * -15 * tiltFactor;

        // Interpolate zoom
        t.scale += (targetUserScaleRef.current - t.scale) * 0.15;

        // --- INFINITE DOT GRID ---
        const spacing = 16;
        const radius = 1;
        let offsetX = (t.x * t.scale * dpr + centerX * dpr + dotParallaxX * dpr) % (spacing * dpr);
        let offsetY = (t.y * t.scale * dpr + centerY * dpr + dotParallaxY * dpr) % (spacing * dpr);
        if (offsetX < 0) offsetX += (spacing * dpr);
        if (offsetY < 0) offsetY += (spacing * dpr);

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        for (let x = offsetX - (spacing * dpr); x <= canvas.width + (spacing * dpr); x += (spacing * dpr)) {
          for (let y = offsetY - (spacing * dpr); y <= canvas.height + (spacing * dpr); y += (spacing * dpr)) {
            ctx.moveTo(x + radius * dpr, y);
            ctx.arc(x, y, radius * dpr, 0, Math.PI * 2);
          }
        }
        ctx.fill();

        // --- GRID DIMENSIONS & DYNAMIC ZOOM ---
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        let numTiles = 0;
        for (const val of matcher.grid.values()) {
          minX = Math.min(minX, val.x);
          minY = Math.min(minY, val.y);
          maxX = Math.max(maxX, val.x);
          maxY = Math.max(maxY, val.y);
          numTiles++;
        }

        const gridSpacing = 50; 
        const renderSize = 48; 

        let targetScale = 1.0;
        if (numTiles > 0) {
          const gridWidth = (maxX - minX + 1) * gridSpacing;
          const gridHeight = (maxY - minY + 1) * gridSpacing;
          targetScale = Math.min(
            (0.75 * canvas.width) / (gridWidth * dpr),
            (0.75 * canvas.height) / (gridHeight * dpr)
          );
        }

        // Global Camera Dolly
        const finalScale = targetScale * t.scale;
        const initialScale = 320 / renderSize;
        let cameraScale = finalScale;
        let finalCenterX = centerX + t.x;
        let finalCenterY = centerY + t.y;
        let resolveProgress = 0;
        
        let activeProjectIndex = -1;
        let activePhases = null;
        for (let i = 1; i < PROJECTS.length; i++) {
          const phases = getProjectScrollState(progress, i);
          if (progress >= phases.dollyPhase[0] && progress <= phases.exitPhase[1]) {
             activeProjectIndex = i;
             activePhases = phases;
             break;
          }
        }
        
        let targetTile = null;
        let prevTargetTile = null;

        if (activeProjectIndex > 1) {
            const prevProj = PROJECTS[activeProjectIndex - 1];
            prevTargetTile = resolveTargetTile(prevProj.targetAnchor, matcher.grid);
        }

        if (progress < CASE_STUDY_START) {
           let phase1Progress = Math.min(1, progress / HERO_END); 
           cameraScale = phase1Progress > 0.98 ? finalScale : finalScale + (initialScale - finalScale) * Math.pow(1 - phase1Progress, 3);
           const isMobile = canvas.parentElement.clientWidth <= 768;
           const focusXOffset = isMobile ? 0 : (0.225 * canvas.width / dpr) * (1 - Math.pow(phase1Progress, 3));
           const focusYOffset = isMobile ? (0.25 * canvas.height / dpr) * (1 - Math.pow(phase1Progress, 3)) : 0;
           finalCenterX += focusXOffset;
           finalCenterY += focusYOffset;
        } else if (activeProjectIndex !== -1 && activePhases) {
           const proj = PROJECTS[activeProjectIndex];
           targetTile = resolveTargetTile(proj.targetAnchor, matcher.grid);
           const targetWorldX = targetTile.x * gridSpacing;
           const targetWorldY = targetTile.y * gridSpacing;
           const endScale = 12.0;
           const isMobile = canvas.parentElement.clientWidth <= 768;
           const targetScreenX = isMobile ? (canvas.width / dpr) * 0.50 : (canvas.width / dpr) * 0.28;
           const targetScreenY = isMobile ? (canvas.height / dpr) * 0.22 : (canvas.height / dpr) * 0.50;
           const endCenterX = targetScreenX - targetWorldX * endScale;
           const endCenterY = targetScreenY - targetWorldY * endScale;

           if (progress < activePhases.dollyPhase[1]) {
              const panProgress = Math.max(0, Math.min(1, (progress - activePhases.dollyPhase[0]) / (activePhases.dollyPhase[1] - activePhases.dollyPhase[0])));
              const easePan = panProgress * panProgress * (3 - 2 * panProgress);
              
              let startCenterX, startCenterY, startScale;
              if (activeProjectIndex === 1) {
                 startCenterX = centerX + t.x;
                 startCenterY = centerY + t.y;
                 startScale = finalScale;
              } else {
                 const prevProj = PROJECTS[activeProjectIndex - 1];
                 const pTile = resolveTargetTile(prevProj.targetAnchor, matcher.grid);
                 startScale = 12.0; 
                 startCenterX = targetScreenX - pTile.x * gridSpacing * startScale;
                 startCenterY = targetScreenY - pTile.y * gridSpacing * startScale;
              }

              cameraScale = startScale + (endScale - startScale) * easePan;
              
              if (activeProjectIndex > 1) {
                 const dip = Math.sin(easePan * Math.PI) * 4.0;
                 cameraScale = startScale + (endScale - startScale) * easePan - dip;
              }

              finalCenterX = startCenterX + (endCenterX - startCenterX) * easePan;
              finalCenterY = startCenterY + (endCenterY - startCenterY) * easePan;
           } else {
              cameraScale = endScale;
              finalCenterX = endCenterX;
              finalCenterY = endCenterY;
           }

           resolveProgress = Math.max(0, Math.min(1, (progress - activePhases.revealPhase[0]) / (activePhases.revealPhase[1] - activePhases.revealPhase[0])));
        }

        ctx.setTransform(cameraScale * dpr, 0, 0, cameraScale * dpr, finalCenterX * dpr, finalCenterY * dpr);

        let tileIndex = 0;
        let targetDimOpacity = 1.0;
        let hoveredKey = null;

        const matrixHudVisible = progress >= HERO_END && progress <= CASE_STUDY_START;
        const hudFade = progress < HERO_END ? Math.max(0, progress / HERO_END) : (progress > CASE_STUDY_START ? Math.max(0, 1 - (progress - CASE_STUDY_START) / 0.05) : 1);

        if (matrixHudVisible && mx !== -9999) {
          const worldX = (mx - finalCenterX) / cameraScale;
          const worldY = (my - finalCenterY) / cameraScale;
          const gridX = Math.round(worldX / gridSpacing);
          const gridY = Math.round(worldY / gridSpacing);

          for (const [key, val] of matcher.grid.entries()) {
            if (val.x === gridX && val.y === gridY) {
              hoveredKey = key;
              targetDimOpacity = 0.75;
              break;
            }
          }
        }

        hoveredKeyRef.current = hoveredKey;
        currentDimOpacity += (targetDimOpacity - currentDimOpacity) * 0.15;

        // HUD Updates
        const bottomBar = document.querySelector('.telemetry-bottom-bar');
        if (bottomBar) {
          bottomBar.style.opacity = hudFade;
        }

        const dock = document.querySelector('.viewport-command-dock');
        if (dock) {
          dock.style.opacity = hudFade;
        }

        const infoEl = document.getElementById('hud-tile-info');
        if (infoEl) {
          infoEl.style.opacity = hudFade;
          if (hudFade > 0) {
             if (hoveredKey) {
               const keys = Array.from(matcher.grid.keys());
               const displayId = String(keys.indexOf(hoveredKey) + 1).padStart(4, '0');
               const tileData = matcher.grid.get(hoveredKey);
               const { timestamp, theme } = parseFilename(tileData?.imgObj?.id);

               infoEl.innerHTML = `
                 <div class="target-badge">[ TARGET: SPECIMEN #${displayId} ]</div>
                 <div class="theme-badge">THEME: ${theme} // ${timestamp}</div>
               `;
             } else {
               infoEl.innerHTML = `
                 <div class="target-badge" style="color: var(--text-dim)">[ TARGET: NO SELECTION ]</div>
                 <div class="theme-badge">THEME: AWAITING INPUT</div>
               `;
             }
          }
        }

        for (const [key, val] of matcher.grid.entries()) {
          const { imgObj, x, y } = val;
          if (!imgObj.imageElement) continue;
          
          const targetX = x * gridSpacing;
          const targetY = y * gridSpacing;

          const isSpecimen = (tileIndex === 0);
          
          const introProgress = Math.min(1, progress / HERO_END);
          const distGrid = Math.hypot(x, y);
          const delay = Math.min(0.5, (distGrid / 6) * 0.5); 
          const tileProgress = Math.max(0, Math.min(1, (introProgress - delay) / 0.5));
          const ease = 1 - Math.pow(1 - tileProgress, 3); 

          let alpha = isSpecimen ? 1.0 : ease;

          if (matrixHudVisible) {
            if (hoveredKey && hoveredKey !== key) {
              alpha *= currentDimOpacity;
            }
          }
          
          if (progress > CASE_STUDY_START && activeProjectIndex !== -1 && activePhases) {
              if (targetTile && val.x === targetTile.x && val.y === targetTile.y) {
                 if (activeProjectIndex > 1) {
                     const brightenProgress = Math.max(0, Math.min(1, (progress - activePhases.dollyPhase[0]) / (activePhases.dollyPhase[1] - activePhases.dollyPhase[0])));
                     alpha *= (0.15 + brightenProgress * 0.85);
                 }
              } else if (activeProjectIndex > 1 && prevTargetTile && val.x === prevTargetTile.x && val.y === prevTargetTile.y) {
                 const dimProgress = Math.max(0, Math.min(1, (progress - activePhases.dollyPhase[0]) / (activePhases.dollyPhase[1] - activePhases.dollyPhase[0])));
                 alpha *= (1 - dimProgress * 0.85); 
              } else {
                 if (activeProjectIndex === 1) {
                     const dimProgress = Math.max(0, Math.min(1, (progress - activePhases.dollyPhase[0]) / (activePhases.dollyPhase[1] - activePhases.dollyPhase[0])));
                     alpha *= (1 - dimProgress * 0.85); 
                 } else {
                     alpha *= 0.15;
                 }
              }
          }

          ctx.globalAlpha = alpha;
          const drawX = targetX - renderSize/2;
          const drawY = targetY - renderSize/2;

          if (matrixHudVisible && currentFilterRef.current !== 'ALL') {
             const { theme } = parseFilename(val.imgObj.id);
             if (theme !== currentFilterRef.current) {
                ctx.globalAlpha *= 0.15;
             }
          }

          if (targetTile && val.x === targetTile.x && val.y === targetTile.y && activeProjectIndex !== -1 && activePhases) {
             const preloadedImg = targetPreviewImageRef.current?.get(activeProjectIndex);
             if (preloadedImg && preloadedImg.complete) {
                 ctx.drawImage(imgObj.imageElement, drawX, drawY, renderSize, renderSize);

                 if (resolveProgress > 0) {
                    let overlayAlpha = 1.0;
                    if (progress > activePhases.exitPhase[0]) {
                        overlayAlpha = Math.max(0, 1 - (progress - activePhases.exitPhase[0]) / (activePhases.exitPhase[1] - activePhases.exitPhase[0]));
                    }

                    if (overlayAlpha > 0) {
                        const prevAlpha = ctx.globalAlpha;
                        ctx.globalAlpha = prevAlpha * overlayAlpha;

                        const imgAspect = preloadedImg.width / preloadedImg.height;
                        let drawW = renderSize;
                        let drawH = renderSize;
                        let offX = drawX;
                        let offY = drawY;
                        if (imgAspect > 1) {
                          drawH = renderSize / imgAspect;
                          offY = drawY + (renderSize - drawH) / 2;
                        } else {
                          drawW = renderSize * imgAspect;
                          offX = drawX + (renderSize - drawW) / 2;
                        }

                        const chunksX = 12;
                        const chunksY = 12;
                        const chunkW = drawW / chunksX;
                        const chunkH = drawH / chunksY;
                        const srcChunkW = preloadedImg.width / chunksX;
                        const srcChunkH = preloadedImg.height / chunksY;

                        ctx.imageSmoothingEnabled = true;
                        
                        if (resolveProgress >= 1.0) {
                            ctx.drawImage(preloadedImg, offX, offY, drawW, drawH);
                        } else {
                            for (let cx = 0; cx < chunksX; cx++) {
                                for (let cy = 0; cy < chunksY; cy++) {
                                    const threshold = ((cx * 17 + cy * 31) % 100) / 100;
                                    if (resolveProgress >= threshold) {
                                        ctx.drawImage(
                                            preloadedImg,
                                            cx * srcChunkW, cy * srcChunkH, srcChunkW, srcChunkH,
                                            offX + cx * chunkW, offY + cy * chunkH, chunkW, chunkH
                                        );
                                    }
                                }
                            }
                        }

                        if (resolveProgress > 0.1) {
                            ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                            ctx.shadowBlur = 20;
                            ctx.lineWidth = 2 / cameraScale;
                            ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)';
                            ctx.strokeRect(offX, offY, drawW, drawH);
                            ctx.shadowBlur = 0;
                        }

                        if (resolveProgress >= 1.0) {
                           const titleText = PROJECTS[activeProjectIndex].title.toUpperCase().replace(/\s+/g, '_');
                           ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
                           ctx.font = `${10/cameraScale}px monospace`;
                           ctx.fillText(`{ ${titleText}_PREVIEW }`, offX, offY - 6/cameraScale);
                        }

                        ctx.globalAlpha = prevAlpha;
                    }
                 }
             } else {
                 ctx.drawImage(imgObj.imageElement, drawX, drawY, renderSize, renderSize);
             }
          } else {
             ctx.drawImage(imgObj.imageElement, drawX, drawY, renderSize, renderSize);
          }

          if (progress > 0.98 && hoveredKey === key) {
            ctx.globalAlpha = 1.0;
            ctx.lineWidth = 1 / cameraScale;
            ctx.strokeStyle = '#EDEDED';
            ctx.strokeRect(drawX + 0.5, drawY + 0.5, renderSize - 1, renderSize - 1);
          }

          tileIndex++;
        }
        ctx.globalAlpha = 1.0;

        if (numTiles > 0) {
          const frameOpacity = Math.max(0, Math.min(1, (progress - 0.85) / 0.15));
          if (frameOpacity > 0) {
            ctx.globalAlpha = frameOpacity;
            
            // Sub-pixel hairlines to prevent blur
            const bLeft = Math.floor((minX - 0.5) * gridSpacing - 8) + 0.5;
            const bTop = Math.floor((minY - 0.5) * gridSpacing - 8) + 0.5;
            const bRight = Math.floor((maxX + 0.5) * gridSpacing + 8) + 0.5;
            const bBottom = Math.floor((maxY + 0.5) * gridSpacing + 8) + 0.5;
            
            ctx.lineWidth = 1 / cameraScale;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
            
            // Top Hairline
            ctx.beginPath();
            ctx.moveTo(bLeft, bTop);
            ctx.lineTo(bRight, bTop);
            ctx.stroke();

            // Bottom Hairline
            ctx.beginPath();
            ctx.moveTo(bLeft, bBottom);
            ctx.lineTo(bRight, bBottom);
            ctx.stroke();

            // Left Hairline
            ctx.beginPath();
            ctx.moveTo(bLeft, bTop);
            ctx.lineTo(bLeft, bBottom);
            ctx.stroke();

            // Right Hairline
            ctx.beginPath();
            ctx.moveTo(bRight, bTop);
            ctx.lineTo(bRight, bBottom);
            ctx.stroke();

            // Top Ruler Ticks and Labels (Every 8 tiles)
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = `${10 / cameraScale}px "JetBrains Mono"`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            const tickLen = 6 / cameraScale;
            
            ctx.beginPath();
            for (let x = minX; x <= maxX; x++) {
              if (x % 8 === 0) {
                const tickX = Math.floor(x * gridSpacing) + 0.5;
                ctx.moveTo(tickX, bTop);
                ctx.lineTo(tickX, bTop - tickLen);
                ctx.fillText(String(x).padStart(3, '0'), tickX, bTop - tickLen - (4 / cameraScale));
              }
            }
            ctx.stroke();

            // Left Ruler Ticks and Labels (Every 4 tiles)
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.beginPath();
            for (let y = minY; y <= maxY; y++) {
              if (y % 4 === 0) {
                const tickY = Math.floor(y * gridSpacing) + 0.5;
                ctx.moveTo(bLeft, tickY);
                ctx.lineTo(bLeft - tickLen, tickY);
                ctx.fillText(`Y:${String(y).padStart(2, '0')}`, bLeft - tickLen - (4 / cameraScale), tickY);
              }
            }
            ctx.stroke();

            // Corner Reticles (+)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
            const reticleSize = 10 / cameraScale;
            const drawReticle = (rx, ry) => {
               ctx.beginPath();
               ctx.moveTo(rx - reticleSize, ry); ctx.lineTo(rx + reticleSize, ry);
               ctx.moveTo(rx, ry - reticleSize); ctx.lineTo(rx, ry + reticleSize);
               ctx.stroke();
            };
            drawReticle(bLeft, bTop);
            drawReticle(bRight, bTop);
            drawReticle(bLeft, bBottom);
            drawReticle(bRight, bBottom);

            ctx.globalAlpha = 1.0;
          }
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    
    renderLoop();

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      unsubscribe();
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const [selectedTileId, setSelectedTileId] = useState(null);


  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!selectedTileId) return;
      const matcher = matcherRef.current;
      if (!matcher) return;

      const keys = Array.from(matcher.grid.keys());
      const currentIndex = keys.indexOf(selectedTileId);
      
      if (e.key === 'Escape') {
        setSelectedTileId(null);
      } else if (e.key === 'ArrowRight') {
        const nextIndex = (currentIndex + 1) % keys.length;
        setSelectedTileId(keys[nextIndex]);
      } else if (e.key === 'ArrowLeft') {
        const prevIndex = (currentIndex - 1 + keys.length) % keys.length;
        setSelectedTileId(keys[prevIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedTileId]);

  const canInteract = () => {
    if (selectedTileId) return false;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    if (maxScroll <= 0) return true;
    const progress = window.scrollY / maxScroll;
    return progress >= HERO_END && progress <= CASE_STUDY_START; 
  };

  const handleMouseDown = (e) => {
    if (!canInteract()) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  };

  const handleMouseMove = (e) => {
    mousePos.current = { screenX: e.clientX, screenY: e.clientY };

    if (!isDragging.current || !canInteract()) return;
    setTransform(prev => ({
      ...prev,
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y
    }));
  };

  const handleMouseUp = (e) => {
    if (!canInteract()) return;
    if (isDragging.current) {
      const dx = e.clientX - transform.x - dragStart.current.x;
      const dy = e.clientY - transform.y - dragStart.current.y;
      if (Math.hypot(dx, dy) < 5 && hoveredKeyRef.current) {
        setSelectedTileId(hoveredKeyRef.current);
      }
    }
    isDragging.current = false;
  };

  const handleWheel = (e) => {
    if (!canInteract()) return;
    if (!e.ctrlKey && !e.metaKey) return;
    const scaleAdjust = e.deltaY * -0.005;
    setTargetUserScale(prev => Math.max(0.5, Math.min(prev + scaleAdjust, 6.0)));
  };

  const handleFilterClick = () => {
    if (!matcherRef.current) return;
    const themes = new Set(['ALL']);
    for (const data of matcherRef.current.grid.values()) {
       if (data.imgObj && data.imgObj.id) {
          const { theme } = parseFilename(data.imgObj.id);
          if (theme !== 'UNKNOWN') themes.add(theme);
       }
    }
    const themeArray = Array.from(themes).sort();
    const currentIndex = themeArray.indexOf(currentFilter);
    const nextTheme = themeArray[(currentIndex + 1) % themeArray.length];
    setCurrentFilter(nextTheme);
  };

  const renderModal = () => {
    if (!selectedTileId) return null;
    const matcher = matcherRef.current;
    if (!matcher) return null;
    
    const tileData = matcher.grid.get(selectedTileId);
    if (!tileData || !tileData.imgObj.imageElement) return null;

    const keys = Array.from(matcher.grid.keys());
    const currentIndex = keys.indexOf(selectedTileId);
    
    const handleNext = () => setSelectedTileId(keys[(currentIndex + 1) % keys.length]);
    const handlePrev = () => setSelectedTileId(keys[(currentIndex - 1 + keys.length) % keys.length]);

    const formattedId = String(currentIndex + 1).padStart(4, '0');
    
    // Parse filename inside modal
    let timestamp = 'UNKNOWN';
    let theme = 'UNKNOWN';
    if (tileData.imgObj && tileData.imgObj.id) {
      let name = tileData.imgObj.id.split('.')[0];
      const parts = name.split('_');
      if (parts.length >= 2) {
        let ts = parts[0];
        let th = parts.length >= 3 && !isNaN(parts[1]) ? parts.slice(2).join(' ') : parts.slice(1).join(' ');
        if (!isNaN(ts) && ts.length >= 10) {
           const d = new Date(parseInt(ts.length === 10 ? ts + '000' : ts));
           if (!isNaN(d.getTime())) {
             ts = d.toISOString().split('T')[0];
           }
        }
        timestamp = ts;
        theme = th.toUpperCase();
      } else {
        theme = name.toUpperCase();
      }
    }

    return (
      <div className="inspection-modal-overlay">
        <div className="inspection-modal-close" onClick={() => setSelectedTileId(null)}>
          [ CLOSE × / ESC ]
        </div>
        
        <div className="inspection-left-stage">
          <img 
            className="inspection-specimen" 
            src={tileData.imgObj.imageElement.src} 
            alt="Specimen" 
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        
        <div className="inspection-right-stage">
          <div className="inspection-id">{`{ SPECIMEN #${formattedId} }`}</div>
          <div className="inspection-theme">{theme}</div>
          <div className="inspection-date">GENERATED: {timestamp} // {new Date().toISOString().split('T')[1].slice(0, 5)} UTC</div>
          
          <div className="inspection-specs">
            <div>CORE: <span>SHRIKE LITE FPGA</span></div>
            <div>QUANTIZATION: <span>INT8 DIFFUSION</span></div>
            <div>LATENCY: <span>240 SECONDS</span></div>
            <div>MEMORY: <span>264 KB DETERMINISTIC SRAM</span></div>
          </div>
          
          <div className="inspection-nav">
            <button onClick={handlePrev}>[ PREV TILE ]</button>
            <button onClick={handleNext}>[ NEXT TILE ]</button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="canvas-container"
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: (!canInteract() ? 'default' : (isDragging.current ? 'grabbing' : 'crosshair')) }}
      >
        <canvas 
          ref={canvasRef} 
          style={{ 
            position: 'absolute', top: 0, left: 0, 
            width: '100%', height: '100%',
            imageRendering: 'pixelated',
            zIndex: 0
          }}
        />
      </div>

      <div className="telemetry-bottom-bar" style={{ opacity: 0 }}>
        <div className="telemetry-bottom-left">
          <div id="hud-tile-info">
            <div className="target-badge">[ TARGET: NO SELECTION ]</div>
            <div className="theme-badge">THEME: AETHERIC SILICON // 2026-08-17</div>
          </div>
        </div>
        <div className="telemetry-bottom-right">
          <div>CORE: <span className="highlight">SHRIKE LITE FPGA</span></div>
          <div>QUANTIZATION: <span className="highlight">INT8 DIFFUSION</span></div>
          <div>LATENCY: <span className="highlight">240 SECONDS</span></div>
          <div>MEMORY: <span className="highlight">264 KB DETERMINISTIC SRAM</span></div>
        </div>
      </div>

      <div className="viewport-command-dock" style={{ opacity: 0 }}>
        <button onClick={onAboutClick} style={{ color: 'var(--color-cyan)' }}>[ ▤ CASE STUDY ]</button>
        <div className="dock-divider"></div>
        <div className="dock-zoom-controls">
          <button onClick={() => setTargetUserScale(prev => Math.max(prev / 1.25, 0.5))}>[ - ]</button>
          <div className="dock-zoom-level">{Math.round(targetUserScale * 100)}%</div>
          <button onClick={() => setTargetUserScale(prev => Math.min(prev * 1.25, 6.0))}>[ + ]</button>
        </div>
        <div className="dock-divider"></div>
        <button onClick={() => {
          setTargetUserScale(1.0);
          setTransform(prev => ({ ...prev, x: 0, y: 0 }));
        }}>[ ⛶ RECENTER ]</button>
        <div className="dock-divider"></div>
        <button onClick={handleFilterClick}>[ ◉ FILTER: {currentFilter} ]</button>
      </div>

      {renderModal()}
    </>
  );
};
