/* =========================================
   1. DOM ELEMENTS & CONSTANTS
   ========================================= */

// Sidebar & UI Elements
const sidebar = document.getElementById('sidebar');
const openBtn = document.getElementById('sidebarToggle');
const closeBtn = document.getElementById('closeSidebar');
const fitToggle = document.getElementById('fitToScreenToggle');

// Input Controls
const hoopSizeSlider = document.getElementById('hoopSize');
const hoopValueDisplay = document.getElementById('hoopValue');
const colorCountSlider = document.getElementById('colorCount');
const colorValueDisplay = document.getElementById('colorValue');
const aidaSelect = document.getElementById('aidaCount');
const customAidaInput = document.getElementById('customAida');
const urlInput = document.getElementById('urlInput');
const fileInput = document.getElementById('fileInput');
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
    tempCtx.drawImage(currentImage, 0, 0, globalGridWidth, globalGridHeight);

    // --- Color Reduction ---
    const maxColors = parseInt(colorCountSlider.value);
    const opts = { colors: maxColors, method: 2 };
    const q = new RgbQuant(opts);
    q.sample(tempCanvas);

    // 3. Store Original Quantized Colors (as array of [r,g,b])
    globalOriginalColors = q.palette(true, true);

    // 4. Create Initial DMC Palette (Default to closest match)
    // Map the original colors to the "best" match
    globalDmcPalette = globalOriginalColors.map((color) => {
        const matches = findTopDMCMatches(color[0], color[1], color[2], 1);
        return matches[0]; // Take the single best match
    });

    // 5. Get Indexed Pixel Data
    globalIndexedData = q.reduce(tempCanvas, 2);

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

    // --- DRAW PIXELS ---
    for (let i = 0; i < globalIndexedData.length; i++) {
        const x = i % globalGridWidth;
        const y = Math.floor(i / globalGridWidth);
        const colorIndex = globalIndexedData[i];
        const dmc = globalDmcPalette[colorIndex];

        if (dmc) {
            ctx.fillStyle = `rgb(${dmc.r}, ${dmc.g}, ${dmc.b})`;
            ctx.fillRect(
                rulerSize + (x * pixelSize),
                rulerSize + (y * pixelSize),
                pixelSize, pixelSize
            );
        }
    }

    // --- DRAW SYMBOLS ---
    const symbols = getSymbolSet();
    ctx.font = `${Math.floor(pixelSize * 0.7)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < globalIndexedData.length; i++) {
        const x = i % globalGridWidth;
        const y = Math.floor(i / globalGridWidth);
        const colorIndex = globalIndexedData[i];
        const dmc = globalDmcPalette[colorIndex];
        const symbol = symbols[colorIndex];

        const screenX = rulerSize + (x * pixelSize) + (pixelSize / 2);
        const screenY = rulerSize + (y * pixelSize) + (pixelSize / 2);

        if (dmc) {
            ctx.fillStyle = getContrastColor(dmc.r, dmc.g, dmc.b);
            ctx.fillText(symbol, screenX, screenY);
        }
    }

    drawGrid(globalGridWidth, globalGridHeight, pixelSize, rulerSize);
    generatePaletteDisplay(globalDmcPalette, symbols);

    document.getElementById('stats').innerText =
        `Pattern Size: ${globalGridWidth} x ${globalGridHeight} stitches. \n` +
        `Colors used: ${globalDmcPalette.length}`;
}


/* =========================================
   4. HELPER FUNCTIONS
   ========================================= */

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

        // CLICK HANDLER: Open the Swap Modal
        swatch.onclick = () => {
            openColorSwapModal(index);
        };

        colorKeyDiv.appendChild(swatch);
    });
}

function openColorSwapModal(paletteIndex) {
    modal.style.display = "flex";
    modalOptions.innerHTML = "<p>Finding close matches...</p>";

    // Get the original color that generated this palette entry
    const originalColor = globalOriginalColors[paletteIndex];

    // Find top 10 matches
    const matches = findTopDMCMatches(originalColor[0], originalColor[1], originalColor[2], 10);

    modalOptions.innerHTML = ""; // Clear loading text

    matches.forEach(match => {
        const option = document.createElement('div');
        option.className = "color-option";

        const isSelected = (match.floss === globalDmcPalette[paletteIndex].floss);
        if (isSelected) option.style.backgroundColor = "#e6f7ff"; // Highlight current selection

        option.innerHTML = `
            <div class="color-option-swatch" style="background-color: rgb(${match.r}, ${match.g}, ${match.b})"></div>
            <div>
                <strong>DMC ${match.floss}</strong> - ${match.name}
            </div>
        `;

        option.onclick = () => {
            // Update the global palette
            globalDmcPalette[paletteIndex] = match;

            // Redraw everything
            drawPattern();

            // Close modal
            modal.style.display = "none";
        };

        modalOptions.appendChild(option);
    });
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
