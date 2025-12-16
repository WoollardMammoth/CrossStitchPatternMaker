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

// State Variables
let currentImage = new Image();


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

// --- UI Controls ---

// Fit to Screen Toggle
fitToggle.addEventListener('change', (e) => {
    if (e.target.checked) {
        canvas.classList.add('fit-screen');
    } else {
        canvas.classList.remove('fit-screen');
    }
});

// Update Hoop Size Display
hoopSizeSlider.addEventListener('input', (e) => {
    hoopValueDisplay.innerText = e.target.value + '"';
});

// Update Color Count Display
colorCountSlider.addEventListener('input', (e) => {
    colorValueDisplay.innerText = e.target.value;
});

// Toggle URL vs Upload Input
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

// Handle Aida Selection (Custom vs Preset)
aidaSelect.addEventListener('change', (e) => {
    if (e.target.value === 'custom') {
        customAidaInput.style.display = 'inline-block';
    } else {
        customAidaInput.style.display = 'none';
    }
});

// --- Main Actions ---

// Load Image Button
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

// Download PDF Button
// Download PDF Button (Multi-Page Tiling Version)
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
    // How many stitches do we want per page? 
    // 70-80 is usually a good "Large Print" size.
    const stitchesPerPageX = 70; 
    const stitchesPerPageY = 90; 

    // Get the total grid size we saved earlier
    const totalGridWidth = parseInt(canvas.dataset.gridWidth);
    const totalGridHeight = parseInt(canvas.dataset.gridHeight);
    
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
    doc.text(`Size: ${totalGridWidth} x ${totalGridHeight} stitches`, 105, 30, { align: "center" });
    
    // Add a mini preview of the whole thing on the cover
    const fullPatternData = canvas.toDataURL("image/png");
    doc.addImage(fullPatternData, 'PNG', margin, 40, usableWidth, usableWidth * (canvas.height/canvas.width));
    
    doc.text("Pattern continues on next pages...", 105, 280, { align: "center" });


    // --- GENERATE TILED PAGES ---
    
    // Loop through every "Tile"
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            doc.addPage();

            // 1. Calculate the pixel coordinates to slice from the main canvas
            // We must account for the 30px ruler on the very top/left of the original canvas
            
            // Start Stitches (Logic)
            const startStitchX = c * stitchesPerPageX;
            const startStitchY = r * stitchesPerPageY;
            
            // Actual Pixels
            // If it's the first column, we start at 0 (to include the ruler).
            // If it's later columns, we start at rulerSize + (stitch * 15).
            let sx, sy, sWidth, sHeight;

            // X Calculations
            if (c === 0) {
                sx = 0;
                // Width = Ruler + (Stitches * 15)
                sWidth = rulerSize + (stitchesPerPageX * pixelSize); 
            } else {
                sx = rulerSize + (startStitchX * pixelSize); 
                sWidth = stitchesPerPageX * pixelSize;
            }

            // Y Calculations
            if (r === 0) {
                sy = 0;
                sHeight = rulerSize + (stitchesPerPageY * pixelSize);
            } else {
                sy = rulerSize + (startStitchY * pixelSize);
                sHeight = stitchesPerPageY * pixelSize;
            }

            // Handle the edge cases (last row/col might be smaller)
            // Ensure we don't try to grab pixels that don't exist
            if (sx + sWidth > canvas.width) sWidth = canvas.width - sx;
            if (sy + sHeight > canvas.height) sHeight = canvas.height - sy;

            // 2. Create a temporary canvas to hold just this slice
            const tileCanvas = document.createElement('canvas');
            tileCanvas.width = sWidth;
            tileCanvas.height = sHeight;
            const tileCtx = tileCanvas.getContext('2d');

            // Draw the slice
            tileCtx.drawImage(canvas, sx, sy, sWidth, sHeight, 0, 0, sWidth, sHeight);

            // 3. Add to PDF
            const tileImgData = tileCanvas.toDataURL("image/png");
            
            // Calculate aspect ratio to fit page
            const tileRatio = sWidth / sHeight;
            
            let printW = usableWidth;
            let printH = usableWidth / tileRatio;
            
            if (printH > usableHeight) {
                printH = usableHeight;
                printW = usableHeight * tileRatio;
            }

            doc.setFontSize(10);
            doc.text(`Page ${r * cols + c + 1} (Row ${r+1}, Col ${c+1})`, margin, margin - 2);
            doc.text(`Stitches: ${startStitchX}-${Math.min(startStitchX + stitchesPerPageX, totalGridWidth)} x ${startStitchY}-${Math.min(startStitchY + stitchesPerPageY, totalGridHeight)}`, margin, margin + printH + 5);

            doc.addImage(tileImgData, 'PNG', margin, margin, printW, printH);
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

// Image Loaded Callback
currentImage.onload = function () {
    // Reset canvas size to image size for now
    canvas.width = currentImage.width;
    canvas.height = currentImage.height;
    ctx.drawImage(currentImage, 0, 0);
    console.log("Image loaded!");
};

// Toggle Sidebar Helper
function toggleSidebar() {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open-body');
}

// Generate Pattern Logic
function generatePattern() {
    const hoopSizeInches = parseInt(hoopSizeSlider.value);

    // Get Aida count
    let aidaValue = parseInt(aidaSelect.value);
    if (isNaN(aidaValue)) {
        aidaValue = parseInt(customAidaInput.value);
    }

    // 1. Calculate Resolution
    const gridWidth = hoopSizeInches * aidaValue;
    const aspectRatio = currentImage.height / currentImage.width;
    const gridHeight = Math.floor(gridWidth * aspectRatio);

    // SAVE GRID DIMENSIONS FOR PDF GENERATION
    canvas.dataset.gridWidth = gridWidth;
    canvas.dataset.gridHeight = gridHeight;

    // 2. Downsample
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    tempCanvas.width = gridWidth;
    tempCanvas.height = gridHeight;
    tempCtx.drawImage(currentImage, 0, 0, gridWidth, gridHeight);

    // --- Color Reduction ---
    const maxColors = parseInt(colorCountSlider.value);
    const opts = { colors: maxColors, method: 2 };
    const q = new RgbQuant(opts);
    q.sample(tempCanvas);

    const palette = q.palette(); // Raw RGB(A) values
    const indexedData = q.reduce(tempCanvas, 2); // Indexes

    // We also need the colored visual for the background
    const reducedRgbData = q.reduce(tempCanvas, 1);
    const imgData = new ImageData(new Uint8ClampedArray(reducedRgbData), gridWidth, gridHeight);
    tempCtx.putImageData(imgData, 0, 0);

    // 3. Upscale for Display
    const pixelSize = 15;
    const rulerSize = 30;

    canvas.width = (gridWidth * pixelSize) + rulerSize;
    canvas.height = (gridHeight * pixelSize) + rulerSize;

    // Fill background
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.imageSmoothingEnabled = false;

    // Draw the colored squares (Background)
    ctx.drawImage(
        tempCanvas,
        0, 0, gridWidth, gridHeight,
        rulerSize, rulerSize, gridWidth * pixelSize, gridHeight * pixelSize
    );

    // --- DRAW SYMBOLS ---
    const symbols = getSymbolSet();
    ctx.font = `${Math.floor(pixelSize * 0.7)}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let i = 0; i < indexedData.length; i++) {
        // Calculate Grid Coordinates
        const x = i % gridWidth;
        const y = Math.floor(i / gridWidth);

        // Get the palette index for this pixel
        const colorIndex = indexedData[i];
        const symbol = symbols[colorIndex];

        // Get the RGB values
        const pIdx = colorIndex * 4;
        const r = palette[pIdx];
        const g = palette[pIdx + 1];
        const b = palette[pIdx + 2];
        const a = palette[pIdx + 3];

        if (a === 0) continue;

        // Calculate screen position
        const screenX = rulerSize + (x * pixelSize) + (pixelSize / 2);
        const screenY = rulerSize + (y * pixelSize) + (pixelSize / 2);

        // Set text color based on contrast
        ctx.fillStyle = getContrastColor(r, g, b);

        // Draw Symbol
        ctx.fillText(symbol, screenX, screenY);
    }

    // 4. Draw Grid and Key
    drawGrid(gridWidth, gridHeight, pixelSize, rulerSize);
    generatePaletteDisplay(palette, symbols);

    document.getElementById('stats').innerText =
        `Pattern Size: ${gridWidth} x ${gridHeight} stitches. \n` +
        `Colors used: ${maxColors}`;
}


/* =========================================
   4. HELPER FUNCTIONS
   ========================================= */

function drawGrid(cols, rows, size, offset) {
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.font = "10px monospace";
    ctx.fillStyle = "black";

    // --- VERTICAL LINES & TOP NUMBERS ---
    for (let x = 0; x <= cols; x++) {
        const xPos = offset + (x * size);
        ctx.beginPath();

        if (x % 5 === 0) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 1.5;
            if (x < cols) {
                ctx.fillText(x, xPos, offset / 2);
            }
        } else {
            ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
            ctx.lineWidth = 0.5;
        }

        ctx.moveTo(xPos, offset);
        ctx.lineTo(xPos, offset + (rows * size));
        ctx.stroke();
    }

    // --- HORIZONTAL LINES & LEFT NUMBERS ---
    for (let y = 0; y <= rows; y++) {
        const yPos = offset + (y * size);
        ctx.beginPath();

        if (y % 5 === 0) {
            ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
            ctx.lineWidth = 1.5;
            if (y < rows) {
                ctx.fillText(y, offset / 2, yPos);
            }
        } else {
            ctx.strokeStyle = "rgba(128, 128, 128, 0.5)";
            ctx.lineWidth = 0.5;
        }

        ctx.moveTo(offset, yPos);
        ctx.lineTo(offset + (cols * size), yPos);
        ctx.stroke();
    }
}

function generatePaletteDisplay(palette, symbols) {
    colorKeyDiv.innerHTML = '';
    keyContainer.style.display = 'block';

    const step = (palette.length % 4 === 0) ? 4 : 3;
    let colorIndex = 0;

    for (let i = 0; i < palette.length; i += step) {
        const r = palette[i];
        const g = palette[i + 1];
        const b = palette[i + 2];

        if (step === 4 && palette[i + 3] === 0) {
            colorIndex++;
            continue;
        }

        const hex = rgbToHex(r, g, b);
        const rgbString = `rgb(${r}, ${g}, ${b})`;
        const symbol = symbols[colorIndex];
        const textColor = getContrastColor(r, g, b);

        const swatch = document.createElement('div');
        swatch.className = 'color-swatch';

        swatch.innerHTML = `
            <div class="swatch-box" style="background-color: ${rgbString}; color: ${textColor}; display: flex; align-items: center; justify-content: center;">
                ${symbol}
            </div>
            <div class="color-info">
                <strong>${hex}</strong><br>
                Symbol: ${symbol}
            </div>
        `;

        colorKeyDiv.appendChild(swatch);
        colorIndex++;
    }
}

function rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
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