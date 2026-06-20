/* =========================================
   1. DOM ELEMENTS & CONSTANTS
   ========================================= */

// Sidebar & UI Elements
const sidebar = document.getElementById('sidebar');
const openBtn = document.getElementById('sidebarToggle');
const closeBtn = document.getElementById('closeSidebar');
const fitToggle = document.getElementById('fitToScreenToggle');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');

// Input Controls
const hoopSizeSlider = document.getElementById('hoopSize');
const hoopValueDisplay = document.getElementById('hoopValue');
const colorCountSlider = document.getElementById('colorCount');
const colorValueDisplay = document.getElementById('colorValue');
const aidaSelect = document.getElementById('aidaCount');
const customAidaInput = document.getElementById('customAida');
const urlInput = document.getElementById('urlInput');
const fileInput = document.getElementById('fileInput');
const saturationSlider = document.getElementById('saturation');
const contrastSlider = document.getElementById('contrast');
const satValueDisplay = document.getElementById('satValue');
const conValueDisplay = document.getElementById('conValue');
const radioButtons = document.getElementsByName('imgSource');

// Action Buttons
const loadImageBtn = document.getElementById('loadImageBtn');
const processBtn = document.getElementById('processBtn');
const downloadBtn = document.getElementById('downloadBtn');

// Canvas & Output
const canvas = document.getElementById('patternCanvas');
const ctx = canvas.getContext('2d');
const keyContainer = document.getElementById('keyContainer');
const colorKeyDiv = document.getElementById('colorKey');

// Modal Elements
const modal = document.getElementById('colorModal');
const modalOptions = document.getElementById('modal-options');
const closeModalBtn = document.querySelector('.close-modal');

// State Variables
let currentImage = new Image();

// GLOBAL STATE for Pattern Data
// We store these globally so we can redraw the pattern when a color is swapped
let globalDmcPalette = [];      // The currently selected DMC colors
let globalOriginalColors = [];  // The original RGB colors from the image (for matching)
let globalIndexedData = [];     // The pixel map (0, 1, 2, 0, 1...)
let globalGridWidth = 0;
let globalGridHeight = 0;

let globalSelectedCells = new Set();
let isDraggingSelection = false;
let dragMode = 'add';


/* =========================================
   2. EVENT LISTENERS
   ========================================= */

// --- Sidebar Navigation ---
openBtn.addEventListener('click', toggleSidebar);
closeBtn.addEventListener('click', toggleSidebar);

// Auto-close sidebar on mobile when generating
processBtn.addEventListener('click', () => {
    if (!currentImage.src) {
        alert("Please load an image first!");
        return;
    }
    if (window.innerWidth < 800) {
        toggleSidebar();
    }
    generatePattern();
});

// --- Modal Controls ---
closeModalBtn.addEventListener('click', () => {
    modal.style.display = "none";
});

window.addEventListener('click', (event) => {
    if (event.target == modal) {
        modal.style.display = "none";
    }
});

// --- UI Controls ---
clearSelectionBtn.addEventListener('click', () => {
    globalSelectedCells.clear();
    drawPattern();
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && globalSelectedCells.size > 0) {
        globalSelectedCells.clear();
        drawPattern();
    }
});

function getGridIndexFromEvent(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const xRaw = (e.clientX - rect.left) * scaleX;
    const yRaw = (e.clientY - rect.top) * scaleY;
    const pixelSize = 15;
    const rulerSize = 30;
    
    if (xRaw < rulerSize || yRaw < rulerSize) return null;
    
    const gridX = Math.floor((xRaw - rulerSize) / pixelSize);
    const gridY = Math.floor((yRaw - rulerSize) / pixelSize);
    
    if (gridX >= 0 && gridX < globalGridWidth && gridY >= 0 && gridY < globalGridHeight) {
        return gridY * globalGridWidth + gridX;
    }
    return null;
}

canvas.addEventListener('mousedown', (e) => {
    if (globalIndexedData.length === 0) return;
    isDraggingSelection = true;
    const index = getGridIndexFromEvent(e);
    if (index !== null) {
        if (globalSelectedCells.has(index)) {
            dragMode = 'remove';
            globalSelectedCells.delete(index);
        } else {
            dragMode = 'add';
            globalSelectedCells.add(index);
        }
        drawCell(index);
    }
});

canvas.addEventListener('mousemove', (e) => {
    if (!isDraggingSelection) return;
    const index = getGridIndexFromEvent(e);
    if (index !== null) {
        let changed = false;
        if (dragMode === 'add') {
            if (!globalSelectedCells.has(index)) {
                globalSelectedCells.add(index);
                changed = true;
            }
        } else if (dragMode === 'remove') {
            if (globalSelectedCells.has(index)) {
                globalSelectedCells.delete(index);
                changed = true;
            }
        }
        if (changed) {
            drawCell(index);
        }
    }
});

window.addEventListener('mouseup', () => {
    isDraggingSelection = false;
});

fitToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        canvas.classList.add('fit-screen');
    } else {
        canvas.classList.remove('fit-screen');
    }
});

hoopSizeSlider.addEventListener('input', (e) => {
    hoopValueDisplay.innerText = e.target.value + '"';
});

colorCountSlider.addEventListener('input', (e) => {
    colorValueDisplay.innerText = e.target.value;
});

saturationSlider.addEventListener('input', (e) => {
    satValueDisplay.innerText = e.target.value + '%';
});

contrastSlider.addEventListener('input', (e) => {
    conValueDisplay.innerText = e.target.value + '%';
});

radioButtons.forEach(radio => {
    radio.addEventListener('change', (e) => {
        urlInput.style.display = 'none';
        fileInput.style.display = 'none';
        if (e.target.value === 'url') {
            urlInput.style.display = 'inline-block';
        } else if (e.target.value === 'upload') {
            fileInput.style.display = 'inline-block';
        }
    });
});

aidaSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customAidaInput.style.display = 'inline-block';
    } else {
        customAidaInput.style.display = 'none';
    }
});

// --- Main Actions ---
loadImageBtn.addEventListener('click', () => {
    const source = document.querySelector('input[name="imgSource"]:checked').value;
    if (source === 'url') {
        const url = urlInput.value;
        if (url) {
            currentImage.crossOrigin = "Anonymous";
            currentImage.src = url;
        }
    } else if (source === 'upload') {
        const file = fileInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                currentImage.removeAttribute('crossOrigin');
                currentImage.src = e.target.result;
            }
            reader.readAsDataURL(file);
        } else {
            alert("Please select a file first.");
        }
    }
});

downloadBtn.addEventListener('click', async () => {
    if (canvas.width === 0) {
        alert("Please generate a pattern first.");
        return;
    }

    const { jsPDF } = window.jspdf;
    // Create PDF in 'portrait' mode, 'mm' units, 'a4' size
    const doc = new jsPDF('p', 'mm', 'a4');

    const pageWidth = 210;
    const pageHeight = 297;
    const margin = 10;
    const usableWidth = pageWidth - (margin * 2);
    const usableHeight = pageHeight - (margin * 2);

    // --- SETTINGS ---
    // Get the total grid size we saved earlier
    const totalGridWidth = parseInt(canvas.dataset.gridWidth);
    const totalGridHeight = parseInt(canvas.dataset.gridHeight);
    // How many stitches do we want per page? 
    let stitchesPerPageX = 70;
    let stitchesPerPageY = 90;

    // A 6" hoop with 14 count fabric is 84 stitches. This, or anything smaller, should fit to a single page.
    // Set a threshold check this size, and adjust the stitches per page accordingly.
    if (totalGridWidth <= 84 && totalGridHeight <= 108) {
        stitchesPerPageX = totalGridWidth;
        stitchesPerPageY = totalGridHeight;
    }

    //capture hoop and fabric sizes
    const hoopSize = hoopSizeSlider.value;
    const fabricCount = aidaSelect.value;

    // Constants from our drawing logic
    const pixelSize = 15;
    const rulerSize = 30; // The margin we added for numbers

    // Calculate how many pages we need
    const cols = Math.ceil(totalGridWidth / stitchesPerPageX);
    const rows = Math.ceil(totalGridHeight / stitchesPerPageY);

    // Title Page
    doc.setFontSize(22);
    doc.text("Cross Stitch Pattern", 105, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(`Size: ${totalGridWidth} x ${totalGridHeight} stitches, ${hoopSize}" hoop with ${fabricCount} count fabric`, 105, 30, { align: "center" });

    // Add a mini preview of the whole thing on the cover
    const fullPatternData = canvas.toDataURL("image/png");
    doc.addImage(fullPatternData, 'PNG', margin, 40, usableWidth, usableWidth * (canvas.height / canvas.width));

    // Skip the tiled pages for a "full pattern" if the full pattern is only one page. 
    if (rows * cols > 1) {
        doc.text("Pattern continues on next pages...", 105, 280, { align: "center" });

        // Establish a contsant siving across all tiledp ages, regardless of how many cells are being fit to the page.
        const maxTilePixelWidth = rulerSize + (stitchesPerPageX * pixelSize);
        const maxTilePixelHeight = rulerSize + (stitchesPerPageY * pixelSize);

        // Calculate how much we need to scale down that largest tile to fit the usable page area.
        const scaleX = usableWidth / maxTilePixelWidth;
        const scaleY = usableHeight / maxTilePixelHeight;

        // Choose the smaller scale to ensure it fits both width and height.
        const globalScale = Math.min(scaleX, scaleY);

        // --- GENERATE TILED PAGES ---
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                doc.addPage();

                const startStitchX = c * stitchesPerPageX;
                const startStitchY = r * stitchesPerPageY;

                let sx, sy, sWidth, sHeight;

                // X Calculations (Same as before)
                if (c === 0) {
                    sx = 0;
                    sWidth = rulerSize + (stitchesPerPageX * pixelSize);
                } else {
                    sx = rulerSize + (startStitchX * pixelSize);
                    sWidth = stitchesPerPageX * pixelSize;
                }

                // Y Calculations (Same as before)
                if (r === 0) {
                    sy = 0;
                    sHeight = rulerSize + (stitchesPerPageY * pixelSize);
                } else {
                    sy = rulerSize + (startStitchY * pixelSize);
                    sHeight = stitchesPerPageY * pixelSize;
                }

                // Handle edge clipping (Same as before)
                if (sx + sWidth > canvas.width) sWidth = canvas.width - sx;
                if (sy + sHeight > canvas.height) sHeight = canvas.height - sy;

                // Create temp canvas (Same as before)
                const tileCanvas = document.createElement('canvas');
                tileCanvas.width = sWidth;
                tileCanvas.height = sHeight;
                const tileCtx = tileCanvas.getContext('2d');
                tileCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

                const tileImgData = tileCanvas.toDataURL("image/png");

                // ---  PRINT DIMENSIONS ---
                const printW = sWidth * globalScale;
                const printH = sHeight * globalScale;

                // Page Numbering
                doc.setFontSize(10);
                doc.text(`Page ${r * cols + c + 1} (Row ${r + 1}, Col ${c + 1})`, margin, margin - 2);

                // Add image using the fixed scale dimensions
                doc.addImage(tileImgData, 'PNG', margin, margin, printW, printH);

                // Draw cut lines/crop marks if the tile is smaller than the page
                // This helps the user know where to cut if they are taping edge pieces.
                if (printW < usableWidth || printH < usableHeight) {
                    doc.setDrawColor(200); // Light grey
                    doc.rect(margin, margin, printW, printH);
                }
            }
        }
    }

    // --- APPEND THE KEY ---
    if (keyContainer.style.display !== 'none') {
        doc.addPage();
        doc.setFontSize(16);
        doc.text("Color Key", margin, margin);

        const keyCanvas = await html2canvas(keyContainer, { scale: 2 });
        const keyImgData = keyCanvas.toDataURL('image/png');
        const keyProps = doc.getImageProperties(keyImgData);
        const keyRatio = keyProps.width / keyProps.height;

        let keyW = usableWidth;
        let keyH = usableWidth / keyRatio;

        doc.addImage(keyImgData, 'PNG', margin, margin + 10, keyW, keyH);
    }

    doc.save("cross-stitch-pattern.pdf");
});


/* =========================================
   3. CORE APPLICATION LOGIC
   ========================================= */

currentImage.onload = function () {
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    ctx.drawImage(currentImage, 0, 0);
};

function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open-body');
}

/**
 * PHASE 1: GENERATE DATA
 * Processes the image, quantizes colors, and prepares data.
 */
function generatePattern() {
    const hoopSizeInches = parseInt(hoopSizeSlider.value);
    let aidaValue = parseInt(aidaSelect.value);
    if (isNaN(aidaValue)) aidaValue = parseInt(customAidaInput.value);

    // 1. Calculate Resolution
    globalGridWidth = hoopSizeInches * aidaValue;
    const aspectRatio = currentImage.height / currentImage.width;
    globalGridHeight = Math.floor(globalGridWidth * aspectRatio);

    canvas.dataset.gridWidth = globalGridWidth;
    canvas.dataset.gridHeight = globalGridHeight;

    // 2. Downsample
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = globalGridWidth;
    tempCanvas.height = globalGridHeight;
    
    // Apply user filters to preserve vivid colors
    const sat = saturationSlider.value;
    const con = contrastSlider.value;
    tempCtx.filter = `saturate(${sat}%) contrast(${con}%)`;
    
    tempCtx.drawImage(currentImage, 0, 0, globalGridWidth, globalGridHeight);

    // --- Color Reduction ---
    const maxColors = parseInt(colorCountSlider.value);
    const opts = { colors: maxColors, method: 2 };
    const q = new RgbQuant(opts);
    q.sample(tempCanvas);

    // 3. Store Original Quantized Colors (as array of [r,g,b])
    globalOriginalColors = q.palette(true, true);

    // 4. Create Initial DMC Palette (Deduplicated)
    globalDmcPalette = [];
    const usedFlosses = new Set();
    
    globalOriginalColors.forEach(color => {
        // Request enough matches to find an unused one
        const matches = findTopDMCMatches(color[0], color[1], color[2], 50);
        let bestMatch = matches.find(m => !usedFlosses.has(m.floss));
        if (!bestMatch) bestMatch = matches[0]; // Fallback if all 50 are used
        
        usedFlosses.add(bestMatch.floss);
        globalDmcPalette.push(bestMatch);
    });

    // 5. Get Indexed Pixel Data (Per-Pixel CIELAB Mapping)
    const imgData = tempCtx.getImageData(0, 0, globalGridWidth, globalGridHeight).data;
    globalIndexedData = new Array(globalGridWidth * globalGridHeight);
    
    const paletteLab = globalDmcPalette.map(dmc => rgbToLab(dmc.r, dmc.g, dmc.b));
    const colorCache = new Map();
    
    function getBestIndex(r, g, b) {
        const rgbKey = r | (g << 8) | (b << 16);
        let bestIndex = colorCache.get(rgbKey);
        if (bestIndex === undefined) {
            const pixelLab = rgbToLab(r, g, b);
            let minDistance = Infinity;
            bestIndex = 0;
            for (let p = 0; p < paletteLab.length; p++) {
                const pLab = paletteLab[p];
                const dL = pixelLab.L - pLab.L;
                const da = pixelLab.a - pLab.a;
                const db = pixelLab.b - pLab.b;
                const dist = (dL * dL) + (da * da) + (db * db);
                if (dist < minDistance) {
                    minDistance = dist;
                    bestIndex = p;
                }
            }
            colorCache.set(rgbKey, bestIndex);
        }
        return bestIndex;
    }

    const advancedStitching = document.getElementById('advancedStitching').checked;
    let imgData2x = null;
    if (advancedStitching) {
        const tempCanvas2x = document.createElement('canvas');
        tempCanvas2x.width = globalGridWidth * 2;
        tempCanvas2x.height = globalGridHeight * 2;
        const tempCtx2x = tempCanvas2x.getContext('2d');
        const sat = document.getElementById('saturation').value;
        const con = document.getElementById('contrast').value;
        tempCtx2x.filter = `saturate(${sat}%) contrast(${con}%)`;
        tempCtx2x.drawImage(currentImage, 0, 0, globalGridWidth * 2, globalGridHeight * 2);
        imgData2x = tempCtx2x.getImageData(0, 0, globalGridWidth * 2, globalGridHeight * 2).data;
    }

    for (let y = 0; y < globalGridHeight; y++) {
        for (let x = 0; x < globalGridWidth; x++) {
            const i1x = (y * globalGridWidth + x) * 4;
            const r = imgData[i1x], g = imgData[i1x + 1], b = imgData[i1x + 2];
            let cellData = getBestIndex(r, g, b); // default solid
            
            if (advancedStitching) {
                const idx0 = ((y*2) * (globalGridWidth*2) + (x*2)) * 4;
                const idx1 = ((y*2) * (globalGridWidth*2) + (x*2 + 1)) * 4;
                const idx2 = ((y*2 + 1) * (globalGridWidth*2) + (x*2)) * 4;
                const idx3 = ((y*2 + 1) * (globalGridWidth*2) + (x*2 + 1)) * 4;
                
                const i0 = getBestIndex(imgData2x[idx0], imgData2x[idx0+1], imgData2x[idx0+2]);
                const i1 = getBestIndex(imgData2x[idx1], imgData2x[idx1+1], imgData2x[idx1+2]);
                const i2 = getBestIndex(imgData2x[idx2], imgData2x[idx2+1], imgData2x[idx2+2]);
                const i3 = getBestIndex(imgData2x[idx3], imgData2x[idx3+1], imgData2x[idx3+2]);
                
                if (i0 === i1 && i2 === i3 && i0 !== i2) {
                    cellData = { type: 'horizontal', c1: i0, c2: i2 };
                } else if (i0 === i2 && i1 === i3 && i0 !== i1) {
                    cellData = { type: 'vertical', c1: i0, c2: i1 };
                } else if (i0 === i1 && i0 === i2 && i0 !== i3) {
                    cellData = { type: 'diagonal_slash', c1: i0, c2: i3 }; // TL vs BR
                } else if (i1 === i3 && i2 === i3 && i0 !== i3) {
                    cellData = { type: 'diagonal_slash', c1: i0, c2: i3 };
                } else if (i0 === i1 && i0 === i3 && i0 !== i2) {
                    cellData = { type: 'diagonal_backslash', c1: i0, c2: i2 }; // TR vs BL
                } else if (i0 === i2 && i0 === i3 && i0 !== i1) {
                    cellData = { type: 'diagonal_backslash', c1: i1, c2: i0 };
                }
            }
            globalIndexedData[y * globalGridWidth + x] = cellData;
        }
    }

    globalSelectedCells.clear();

    // 6. Draw the Pattern using the calculated data
    drawPattern();
}

/**
 * PHASE 2: DRAW PATTERN
 * Draws the pixels and symbols based on the current globalDmcPalette.
 */
function drawPattern() {
    const pixelSize = 15;
    const rulerSize = 30;

    canvas.width = (globalGridWidth * pixelSize) + rulerSize;
    canvas.height = (globalGridHeight * pixelSize) + rulerSize;

    // Fill background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.imageSmoothingEnabled = false;

    const symbols = getSymbolSet();
    for (let i = 0; i < globalIndexedData.length; i++) {
        const x = i % globalGridWidth;
        const y = Math.floor(i / globalGridWidth);
        const cellData = globalIndexedData[i];
        drawCellInterior(ctx, x, y, cellData, pixelSize, rulerSize, symbols);
    }

    drawGrid(globalGridWidth, globalGridHeight, pixelSize, rulerSize);

    if (globalSelectedCells.size > 0) {
        ctx.fillStyle = "rgba(0, 150, 255, 0.4)";
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        for (let index of globalSelectedCells) {
            const x = index % globalGridWidth;
            const y = Math.floor(index / globalGridWidth);
            ctx.fillRect(
                rulerSize + (x * pixelSize),
                rulerSize + (y * pixelSize),
                pixelSize, pixelSize
            );
            ctx.strokeRect(
                rulerSize + (x * pixelSize),
                rulerSize + (y * pixelSize),
                pixelSize, pixelSize
            );
        }
        clearSelectionBtn.style.display = 'inline-block';
    } else {
        if (clearSelectionBtn) clearSelectionBtn.style.display = 'none';
    }

    generatePaletteDisplay(globalDmcPalette, symbols);

    document.getElementById('stats').innerText =
        `Pattern Size: ${globalGridWidth} x ${globalGridHeight} stitches. \n` +
        `Colors used: ${globalDmcPalette.length}`;
}


/* =========================================
   4. HELPER FUNCTIONS
   ========================================= */

function drawCellInterior(canvasCtx, x, y, cellData, pixelSize, rulerSize, symbols) {
    const cx = rulerSize + (x * pixelSize);
    const cy = rulerSize + (y * pixelSize);

    if (typeof cellData === 'number') {
        const dmc = globalDmcPalette[cellData];
        if (!dmc) return;
        canvasCtx.fillStyle = `rgb(${dmc.r}, ${dmc.g}, ${dmc.b})`;
        canvasCtx.fillRect(cx, cy, pixelSize, pixelSize);
        
        canvasCtx.font = `${Math.floor(pixelSize * 0.7)}px sans-serif`;
        canvasCtx.textAlign = "center";
        canvasCtx.textBaseline = "middle";
        canvasCtx.fillStyle = getContrastColor(dmc.r, dmc.g, dmc.b);
        canvasCtx.fillText(symbols[cellData], cx + pixelSize / 2, cy + pixelSize / 2);
    } else {
        const dmc1 = globalDmcPalette[cellData.c1];
        const dmc2 = globalDmcPalette[cellData.c2];
        if (!dmc1 || !dmc2) return;
        
        if (cellData.type === 'horizontal') {
            canvasCtx.fillStyle = `rgb(${dmc1.r}, ${dmc1.g}, ${dmc1.b})`;
            canvasCtx.fillRect(cx, cy, pixelSize, pixelSize/2);
            canvasCtx.fillStyle = `rgb(${dmc2.r}, ${dmc2.g}, ${dmc2.b})`;
            canvasCtx.fillRect(cx, cy + pixelSize/2, pixelSize, pixelSize/2);
        } else if (cellData.type === 'vertical') {
            canvasCtx.fillStyle = `rgb(${dmc1.r}, ${dmc1.g}, ${dmc1.b})`;
            canvasCtx.fillRect(cx, cy, pixelSize/2, pixelSize);
            canvasCtx.fillStyle = `rgb(${dmc2.r}, ${dmc2.g}, ${dmc2.b})`;
            canvasCtx.fillRect(cx + pixelSize/2, cy, pixelSize/2, pixelSize);
        } else if (cellData.type === 'diagonal_backslash') { // TR vs BL
            canvasCtx.fillStyle = `rgb(${dmc1.r}, ${dmc1.g}, ${dmc1.b})`;
            canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy); canvasCtx.lineTo(cx + pixelSize, cy); canvasCtx.lineTo(cx + pixelSize, cy + pixelSize); canvasCtx.fill();
            canvasCtx.fillStyle = `rgb(${dmc2.r}, ${dmc2.g}, ${dmc2.b})`;
            canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy); canvasCtx.lineTo(cx, cy + pixelSize); canvasCtx.lineTo(cx + pixelSize, cy + pixelSize); canvasCtx.fill();
        } else if (cellData.type === 'diagonal_slash') { // TL vs BR
            canvasCtx.fillStyle = `rgb(${dmc1.r}, ${dmc1.g}, ${dmc1.b})`;
            canvasCtx.beginPath(); canvasCtx.moveTo(cx, cy); canvasCtx.lineTo(cx + pixelSize, cy); canvasCtx.lineTo(cx, cy + pixelSize); canvasCtx.fill();
            canvasCtx.fillStyle = `rgb(${dmc2.r}, ${dmc2.g}, ${dmc2.b})`;
            canvasCtx.beginPath(); canvasCtx.moveTo(cx + pixelSize, cy); canvasCtx.lineTo(cx + pixelSize, cy + pixelSize); canvasCtx.lineTo(cx, cy + pixelSize); canvasCtx.fill();
        }
        
        canvasCtx.font = `${Math.floor(pixelSize * 0.45)}px sans-serif`;
        canvasCtx.textAlign = "center";
        canvasCtx.textBaseline = "middle";
        const sym1 = symbols[cellData.c1];
        const sym2 = symbols[cellData.c2];
        const col1 = getContrastColor(dmc1.r, dmc1.g, dmc1.b);
        const col2 = getContrastColor(dmc2.r, dmc2.g, dmc2.b);
        
        if (cellData.type === 'horizontal') {
            canvasCtx.fillStyle = col1; canvasCtx.fillText(sym1, cx + pixelSize/2, cy + pixelSize/4);
            canvasCtx.fillStyle = col2; canvasCtx.fillText(sym2, cx + pixelSize/2, cy + 3*pixelSize/4);
        } else if (cellData.type === 'vertical') {
            canvasCtx.fillStyle = col1; canvasCtx.fillText(sym1, cx + pixelSize/4, cy + pixelSize/2);
            canvasCtx.fillStyle = col2; canvasCtx.fillText(sym2, cx + 3*pixelSize/4, cy + pixelSize/2);
        } else if (cellData.type === 'diagonal_backslash') {
            canvasCtx.fillStyle = col1; canvasCtx.fillText(sym1, cx + 3*pixelSize/4, cy + pixelSize/4);
            canvasCtx.fillStyle = col2; canvasCtx.fillText(sym2, cx + pixelSize/4, cy + 3*pixelSize/4);
        } else if (cellData.type === 'diagonal_slash') {
            canvasCtx.fillStyle = col1; canvasCtx.fillText(sym1, cx + pixelSize/4, cy + pixelSize/4);
            canvasCtx.fillStyle = col2; canvasCtx.fillText(sym2, cx + 3*pixelSize/4, cy + 3*pixelSize/4);
        }
    }
}

function drawGrid(cols, rows, size, offset) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = "10px monospace";
    ctx.fillStyle = "black";

    for (let x = 0; x <= cols; x++) {
        const xPos = offset + (x * size);
        ctx.beginPath();
        if (x % 5 === 0) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 1.5;
            if (x < cols) ctx.fillText(x, xPos, offset / 2);
        } else {
            ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
            ctx.lineWidth = 0.5;
        }
        ctx.moveTo(xPos, offset);
        ctx.lineTo(xPos, offset + (rows * size));
        ctx.stroke();
    }

    for (let y = 0; y <= rows; y++) {
        const yPos = offset + (y * size);
        ctx.beginPath();
        if (y % 5 === 0) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 1.5;
            if (y < rows) ctx.fillText(y, offset / 2, yPos);
        } else {
            ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
            ctx.lineWidth = 0.5;
        }
        ctx.moveTo(offset, yPos);
        ctx.lineTo(offset + (cols * size), yPos);
        ctx.stroke();
    }
}

function drawCell(index) {
    const pixelSize = 15;
    const rulerSize = 30;
    
    const x = index % globalGridWidth;
    const y = Math.floor(index / globalGridWidth);
    
    const cellData = globalIndexedData[index];
    const symbols = getSymbolSet();
    
    // Clear area (slightly larger to catch borders if any issues)
    ctx.clearRect(
        rulerSize + (x * pixelSize) - 1,
        rulerSize + (y * pixelSize) - 1,
        pixelSize + 2, pixelSize + 2
    );
    
    // Fill background for cleared area just in case
    ctx.fillStyle = "white";
    ctx.fillRect(
        rulerSize + (x * pixelSize),
        rulerSize + (y * pixelSize),
        pixelSize, pixelSize
    );
    
    drawCellInterior(ctx, x, y, cellData, pixelSize, rulerSize, symbols);
    
    // Draw selection highlight if selected
    if (globalSelectedCells.has(index)) {
        ctx.fillStyle = "rgba(0, 150, 255, 0.4)";
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 2;
        ctx.fillRect(
            rulerSize + (x * pixelSize),
            rulerSize + (y * pixelSize),
            pixelSize, pixelSize
        );
        ctx.strokeRect(
            rulerSize + (x * pixelSize),
            rulerSize + (y * pixelSize),
            pixelSize, pixelSize
        );
    }
    
    // Redraw the grid lines around it
    ctx.beginPath();
    ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
    ctx.lineWidth = 0.5;
    ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + (y * pixelSize));
    ctx.lineTo(rulerSize + (x * pixelSize), rulerSize + ((y + 1) * pixelSize));
    ctx.moveTo(rulerSize + ((x + 1) * pixelSize), rulerSize + (y * pixelSize));
    ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + ((y + 1) * pixelSize));
    ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + (y * pixelSize));
    ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + (y * pixelSize));
    ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + ((y + 1) * pixelSize));
    ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + ((y + 1) * pixelSize));
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.lineWidth = 1.5;
    if (x % 5 === 0) {
        ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + (y * pixelSize));
        ctx.lineTo(rulerSize + (x * pixelSize), rulerSize + ((y + 1) * pixelSize));
    }
    if ((x + 1) % 5 === 0) {
        ctx.moveTo(rulerSize + ((x + 1) * pixelSize), rulerSize + (y * pixelSize));
        ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + ((y + 1) * pixelSize));
    }
    if (y % 5 === 0) {
        ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + (y * pixelSize));
        ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + (y * pixelSize));
    }
    if ((y + 1) % 5 === 0) {
        ctx.moveTo(rulerSize + (x * pixelSize), rulerSize + ((y + 1) * pixelSize));
        ctx.lineTo(rulerSize + ((x + 1) * pixelSize), rulerSize + ((y + 1) * pixelSize));
    }
    ctx.stroke();
    
    // Ensure the clear button state is correct
    if (globalSelectedCells.size > 0) {
        clearSelectionBtn.style.display = 'inline-block';
    } else {
        clearSelectionBtn.style.display = 'none';
    }
}

/**
 * Generates the Interactive Legend
 */
function generatePaletteDisplay(dmcPalette, symbols) {
    colorKeyDiv.innerHTML = '';
    keyContainer.style.display = 'block';

    dmcPalette.forEach((dmc, index) => {
        if (!dmc) return;

        const rgbString = `rgb(${dmc.r}, ${dmc.g}, ${dmc.b})`;
        const symbol = symbols[index];
        const textColor = getContrastColor(dmc.r, dmc.g, dmc.b);

        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';
        swatch.style.cursor = "pointer"; // Show it's clickable
        swatch.title = "Click to swap color";

        swatch.innerHTML = `
            <div class="swatch-box" style="background-color: ${rgbString}; color: ${textColor}; display: flex; align-items: center; justify-content: center;">
                ${symbol}
            </div>
            <div class="color-info">
                <strong>DMC ${dmc.floss}</strong><br>
                ${dmc.name}
            </div>
        `;

        // CLICK HANDLER: Open the Swap Modal or apply color to selection
        swatch.onclick = () => {
            if (globalSelectedCells.size > 0) {
                // Apply this color to selected cells
                for (let cellIndex of globalSelectedCells) {
                    globalIndexedData[cellIndex] = index;
                }
                globalSelectedCells.clear();
                drawPattern();
            } else {
                openColorSwapModal(index);
            }
        };

        colorKeyDiv.appendChild(swatch);
    });
}

function openColorSwapModal(paletteIndex) {
    modal.style.display = "flex";
    
    modalOptions.innerHTML = `
        <input type="text" id="colorSearch" placeholder="Search DMC by name or number..." style="width: 100%; margin-bottom: 10px; padding: 8px; box-sizing: border-box; font-family: 'DotGothic16', sans-serif;">
        <div id="colorList" style="max-height: 350px; overflow-y: auto; padding-right: 5px;"></div>
    `;

    const colorSearch = document.getElementById('colorSearch');
    const colorList = document.getElementById('colorList');
    
    const originalColor = globalOriginalColors[paletteIndex];
    
    // Get all colors sorted by distance to the original color
    const matches = findTopDMCMatches(originalColor[0], originalColor[1], originalColor[2], dmcColors.length);

    function renderColors(filterText = "") {
        colorList.innerHTML = "";
        const lowerFilter = filterText.toLowerCase();
        
        let displayColors = matches;
        if (filterText) {
            displayColors = matches.filter(c => 
                c.floss.toString().includes(lowerFilter) || 
                c.name.toLowerCase().includes(lowerFilter)
            );
        }
        
        displayColors.forEach(match => {
            const option = document.createElement('div');
            option.className = "color-option";

            const isSelected = (match.floss === globalDmcPalette[paletteIndex].floss);
            if (isSelected) option.style.backgroundColor = "#e6f7ff";

            option.innerHTML = `
                <div class="color-option-swatch" style="background-color: rgb(${match.r}, ${match.g}, ${match.b})"></div>
                <div>
                    <strong>DMC ${match.floss}</strong> - ${match.name}
                </div>
            `;

            option.onclick = () => {
                globalDmcPalette[paletteIndex] = match;
                drawPattern();
                modal.style.display = "none";
            };

            colorList.appendChild(option);
        });
    }

    // Initial render
    renderColors();

    // Listen for search
    colorSearch.addEventListener('input', (e) => {
        renderColors(e.target.value);
    });
    
    // Focus search input
    setTimeout(() => colorSearch.focus(), 50);
}

function getContrastColor(r, g, b) {
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128 ? 'black' : 'white';
}

function getSymbolSet() {
    return [
        // Set 1: High Contrast Lines & Shapes
        '✖', '●', '✚', '■', '★', 'O',
        // Set 2: Distinct Directional Shapes
        '▲', '▼', '◆', '➜',
        // Set 3: Distinct Letters
        'S', 'Z', 'H', 'W', 'M', '&', '#', '@',
        // Set 4: Card Suits
        '♠', '♣', '♥', '♦', '✶', '❖',
        // Set 5: Numbers
        '1', '2', '3', '4', '5', '6', '7', '8', '9',
        // Backups
        'A', 'B', 'D', 'E', 'F', 'G', 'K', 'L', 'P', 'R'
    ];
}

/* =========================================
   5. COLOR MATCHING LOGIC (With Top-N Support)
   ========================================= */

function findTopDMCMatches(r, g, b, count = 5) {
    const targetLab = rgbToLab(r, g, b);

    // Calculate distance for ALL colors
    const results = dmcColors.map(dmc => {
        const dmcLab = rgbToLab(dmc.r, dmc.g, dmc.b);
        const dL = targetLab.L - dmcLab.L;
        const da = targetLab.a - dmcLab.a;
        const db = targetLab.b - dmcLab.b;
        const distance = Math.sqrt((dL * dL) + (da * da) + (db * db));

        return { dmc: dmc, distance: distance };
    });

    // Sort by smallest distance
    results.sort((a, b) => a.distance - b.distance);

    // Return the top N colors (stripping out the distance property)
    return results.slice(0, count).map(res => res.dmc);
}

function rgbToLab(r, g, b) {
    let r_ = r / 255, g_ = g / 255, b_ = b / 255;
    if (r_ > 0.04045) r_ = Math.pow((r_ + 0.055) / 1.055, 2.4); else r_ = r_ / 12.92;
    if (g_ > 0.04045) g_ = Math.pow((g_ + 0.055) / 1.055, 2.4); else g_ = g_ / 12.92;
    if (b_ > 0.04045) b_ = Math.pow((b_ + 0.055) / 1.055, 2.4); else b_ = b_ / 12.92;
    r_ *= 100; g_ *= 100; b_ *= 100;
    const x = r_ * 0.4124 + g_ * 0.3576 + b_ * 0.1805;
    const y = r_ * 0.2126 + g_ * 0.7152 + b_ * 0.0722;
    const z = r_ * 0.0193 + g_ * 0.1192 + b_ * 0.9505;
    return xyzToLab(x, y, z);
}

function xyzToLab(x, y, z) {
    const refX = 95.047, refY = 100.000, refZ = 108.883;
    let x_ = x / refX, y_ = y / refY, z_ = z / refZ;
    if (x_ > 0.008856) x_ = Math.pow(x_, 1 / 3); else x_ = (7.787 * x_) + (16 / 116);
    if (y_ > 0.008856) y_ = Math.pow(y_, 1 / 3); else y_ = (7.787 * y_) + (16 / 116);
    if (z_ > 0.008856) z_ = Math.pow(z_, 1 / 3); else z_ = (7.787 * z_) + (16 / 116);
    const L = (116 * y_) - 16;
    const a = 500 * (x_ - y_);
    const b = 200 * (y_ - z_);
    return { L, a, b };
}
