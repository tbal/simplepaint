import React from 'react';

import './App.css';

/**
 * Settings
 */
// use transparent background for canvas
const TRANSPARENT_BACKGROUND = true;
// color to use for canvas background, applies only if TRANSPARENT_BACKGROUND=false
const BACKGROUND_COLOR = '#ffffff'; // white
// preselected brush tool; available values: pencil, spray, eraser, colorpicker
const DEFAULT_BRUSH = 'pencil';
// preselected color for brush tools
const DEFAULT_BRUSH_COLOR = '#000000'; // black
// preselected brush strength
const DEFAULT_BRUSH_SIZE = 20;
// preselected brush strength
const DEFAULT_ERASER_SIZE = 50;
// key to press to activate "stamp-mode" when placing added images
const KEY_STAMP_MODE = 'Alt';


/**
 * Helper to convert rgb to hex color
 * 
 * @param {number|string} r Red
 * @param {number|string} g Green
 * @param {number|string} b Blue
 * @returns {string} Hex color code 
 */
function rgbToHex(r, g, b) {
  r = r.toString(16);
  g = g.toString(16);
  b = b.toString(16);

  if (r.length === 1) {
    r = '0' + r;
  }
  if (g.length === 1) {
    g = '0' + g;
  }
  if (b.length === 1) {
    b = '0' + b;
  }

  return '#' + r + g + b;
}

/**
 * Download given source file
 *
 * @param {string} fileSource
 * @param {string} fileName
 */
function download(fileSource, fileName = 'image.png') {
  const link = document.createElement('a');

  link.setAttribute('href', fileSource);
  link.setAttribute('download', fileName);

  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Custom state hook using localStorage as data store
 *
 * @param {string} key Unique(!) key
 * @param {*} defaultValue Default value, if no value set already
 * @returns {*[]}
 */
function usePersistentState(key, defaultValue) {
  const [value, setValue] = React.useState(
      JSON.parse(localStorage.getItem(key)) || defaultValue
  );

  React.useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value))
  }, [key, value]);

  return [value, setValue];
}

/**
 * Clears canvas and adds colored background if configured
 *
 * @param {CanvasRenderingContext2D} ctx
 */
function clearCanvas(ctx) {
  // clear everything on canvas
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // fill canvas with white color if configured
  if (!TRANSPARENT_BACKGROUND) {
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }
}

function getColorAtPosition(ctx, x, y) {
  const imageData = ctx.getImageData(x, y, 1, 1).data;

  return rgbToHex(imageData[0], imageData[1], imageData[2]);
}

function drawImage(ctx, img, dx, dy, width, height) {
  ctx.drawImage(img, dx, dy, width, height);
}

function drawImageSrc(ctx, src, dx, dy, width, height) {
  const img = new Image();
  img.src = src;
  return new Promise(resolve => {
    img.onload = () => {
      drawImage(ctx, img, dx, dy, width, height);
      resolve();
    }
  });
}

/**
 * Global state variables for which react states were too unreliable
 * @type {*[]}
 */
// holds the sequence during one "painting-move", saved in history for undo/redo
let sequence = [];
// the state when image was uploaded and user is able to move it around and add it on the canvas
let isPositioningUploadedImage = false;
// a.k.a stamp-mode: keep uploaded image for adding it multiple times on canvas
let keepUploadedImage = false;

/**
 * Main application
 */
function App() {
  /**
   * States
   */
  const [isDebug, setIsDebug] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDrawing, setIsDrawing] = React.useState(false);
  const [isMouseMoved, setIsMouseMoved] = React.useState(false);
  const [isImageDragged, setIsImageDragged] = React.useState(false);

  const [history, setHistory] = usePersistentState('history', []);
  const [redoStack, setRedoStack] = usePersistentState('redoStack', []);

  const [ctx, setCtx] = React.useState();
  const [uploadedImage, setUploadedImage] = React.useState(null);
  const [imageDimension, setImageDimension] = React.useState({width: 300, height: 300});

  const [start, setStart] = React.useState({ x: 0, y: 0});
  const [end, setEnd] = React.useState({ x: 0, y: 0});

  const [cursorPosition, setCursorPosition] = React.useState({x: 0, y: 0});
  const [colorAtColorPickerPosition, setColorAtColorPickerPosition] = React.useState(DEFAULT_BRUSH_COLOR);

  const [tool, setTool] = usePersistentState('tool', DEFAULT_BRUSH);
  const [previousTool, setPreviousTool] = usePersistentState('previousTool', DEFAULT_BRUSH);

  const [color, setColor] = usePersistentState('color', DEFAULT_BRUSH_COLOR);
  const [brushSize, setBrushSize] = usePersistentState('brushSize', DEFAULT_BRUSH_SIZE);
  const [eraserSize, setEraserSize] = usePersistentState('eraserSize', DEFAULT_ERASER_SIZE);

  /**
   * References
   */
  const canvasRef = React.useRef(null);
  const dropZoneRef = React.useRef(null);
  const uploadButtonRef = React.useRef(null);

  /**
   * Somehow main hook initializing stuff only available after first render.
   * Can be compared with document.onReady().
   */
  React.useEffect(() => {
    // get canvas context and save in state
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    setCtx(ctx);

    // resize canvas to full browser window size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    addEventListeners();

    // redraw saved drawing
    redrawHistory(ctx);
  }, [canvasRef]);

  /**
   * Set cursor-class depending on selected tool
   */
  React.useEffect(() => {
    canvasRef.current.className = '';
    canvasRef.current.classList.add('cursor-' + tool);
  }, [tool])

  /**
   * Set loading-class depending on isLoading state
   */
  React.useEffect(() => {
    if (isLoading) {
      document.body.classList.add('loading');
    } else {
      document.body.classList.remove('loading');
    }
  }, [isLoading]);

  /**
   * Set when image was uploaded
   * and user is able to move it around and add it on the canvas
   */
  React.useEffect(() => {
    isPositioningUploadedImage = uploadedImage !== null;
  }, [uploadedImage]);

  function addEventListeners() {
    // track cursor position in state
    document.addEventListener('mousemove', (e) => {
      setCursorPosition({ x: e.clientX, y: e.clientY });
    });

    // watch window resizing
    window.addEventListener('resize', () => {
      // resize canvas accordingly
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;

      // redraw everything as canvas gets cleared as soon as its
      // width or height changes, see: https://stackoverflow.com/a/5517885
      redrawHistory(canvasRef.current.getContext('2d'));
    });

    // watch key inputs
    document.addEventListener('keydown', handleKeyUpDown);
    document.addEventListener('keyup', handleKeyUpDown);


    /**
     * Drag & drop images onto canvas
     */
    window.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (uploadedImage !== null) {
        return;
      }

      setIsImageDragged(true);
    });

    dropZoneRef.current.addEventListener('dragenter', handleDropZoneDrag);
    dropZoneRef.current.addEventListener('dragover', handleDropZoneDrag);

    dropZoneRef.current.addEventListener('dragleave', () => {
      setIsImageDragged(false);
    });

    dropZoneRef.current.addEventListener('drop', (e) => {
      e.preventDefault();

      if (uploadedImage !== null) {
        return;
      }

      setIsImageDragged(false);

      addImage(e.dataTransfer.files[0]);
    });
  }

  function handleKeyUpDown(e) {
    if (!isPositioningUploadedImage) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    switch (e.key) {
      case 'Escape':
        if (e.type === 'keydown') {
          setUploadedImage(null);
          isPositioningUploadedImage = false;
        }
        break;
      case KEY_STAMP_MODE:
        keepUploadedImage = e.type === 'keydown';
        break;
      default:
        // nothing
    }
  }

  function handleDropZoneDrag(e) {
    e.dataTransfer.dropEffect = 'copy';
    e.preventDefault();
  }

  function addImage(file) {
    // stop processing if file is not an image
    if (!file.type.match(/image.*/)) {
      return;
    }

    const img = new Image();
    const reader = new FileReader();

    // give visual feedback that image is loading
    setIsLoading(true);

    // use FileReader to get base64 file representation
    reader.readAsDataURL(file);
    reader.onload = () => {
      // save base64 representation for using it in history later
      img.dataset.base64 = reader.result;

      // use object url to display the image
      img.src = URL.createObjectURL(file);

      // wait till image is loaded
      img.onload = () => {
        // save image in state
        setUploadedImage(img);

        // scale image to appropriate width, but prevent up-scaling
        const imageWidth = Math.min(imageDimension.width, img.width);
        setImageDimension({
          width: imageWidth,
          height: imageWidth * img.height / img.width
        });

        // finished loading (in theory..)
        setIsLoading(false);
      };
    };
  }

  /**
   * Redraws the canvas based on the saved history.
   *
   * If offset is set, it will undo (negative number) or rather redo (positive
   * number) the history by the given number.
   *
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} offset Negative offset results in undo, positive in redo.
   */
  function redrawHistory(ctx, offset= 0) {
    // clear canvas at first
    clearCanvas(ctx);

    // history.length does not get updated here fast enough,
    // because setHistory is async; that's why we introduce local helpers vars.
    let historySize = history.length;
    let changedHistory = null;

    // Redo part - go forward in history by <offset> steps
    if (offset > 0 && redoStack.length) {
      changedHistory = [...history, redoStack[redoStack.length - 1]];
      setHistory(changedHistory);
      historySize++;
      
      const changedRedoStack = redoStack.slice(0, -1);
      setRedoStack(changedRedoStack);
    }

    // Undo part - go back in history by <offset> steps
    if (offset < 0 && history.length) {
      // put last <offset> steps from history to redoStack
      const changedRedoStack = [...redoStack, ...(history.slice(offset)).reverse()];
      setRedoStack(changedRedoStack);
      
      changedHistory = history.slice(0, offset);
      setHistory(changedHistory);
      historySize += offset;
    }

    // History is empty, nothing to draw, canvas stays clear
    if (!historySize) {
      setIsLoading(false);
      return;
    }

    // Optimization: Only redraw everything beginning after the last clear-step.
    // This avoids flickering, especially when having images in the history.
    let historyRedrawStartPosition = 0;
    let i = 0;
    [...history].reverse().find(historyStep => {
      const found = historyStep.tool === 'clear';
      if (found && i > 0) {
        historyRedrawStartPosition = history.length - i;
      }
      i++;
      return found;
    });

    // (Re-)Drawing images is an async job, that's why we must make sure
    // the history processing stays chronological.
    // Fancy async/await/anonymous function loop code found here:
    // https://stackoverflow.com/a/40329190
    (async function loop() {
      for (let i = historyRedrawStartPosition; i < historySize; i++) {
        await redrawSingleHistoryStep(ctx, (changedHistory || history)[i]);
      }
      setIsLoading(false);
    })();
  }

  /**
   * Redraw single history step
   *
   * @param ctx
   * @param historyStep
   * @returns {Promise<void>}
   */
  async function redrawSingleHistoryStep(ctx, historyStep) {
    // Clear canvas
    if (historyStep.tool === 'clear') {
      clearCanvas(ctx);

    // Draw image (async)
    } else if (historyStep.tool === 'image') {
      await drawImageSrc(ctx, historyStep.src, historyStep.dx, historyStep.dy, historyStep.width, historyStep.height);

    // Draw sequences for defined tool (pencil, spray, eraser, etc.)
    } else if (historyStep.sequence.length) {
      historyStep.sequence.forEach(
          sequence => draw(sequence[0], sequence[1], ctx,
              historyStep.tool, historyStep.color,
              historyStep.lineWidth));
    }
  }

  /**
   * FIXME FIXME FIXME IMPORTANT
   *
   * @param start
   * @param end
   * @param ctx
   * @param forceTool
   * @param forceColor
   * @param forceLineWidth
   */
  function draw(start, end, ctx, forceTool, forceColor, forceLineWidth) {
    ctx.save();

    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.lineWidth =  forceLineWidth || brushSize;
    ctx.strokeStyle = forceColor || color;
    if (forceTool === 'eraser' || (typeof forceTool === 'undefined' && tool === 'eraser')) {
      ctx.lineWidth = eraserSize;

      if (TRANSPARENT_BACKGROUND) {
        ctx.globalCompositeOperation = 'destination-out';
      } else {
        ctx.strokeStyle = BACKGROUND_COLOR;
      }
    }

    ctx.beginPath();
    ctx.moveTo(start.x, start.y);

    if (forceTool === 'spray' || (typeof forceTool === 'undefined' && tool === 'spray')) {
      const lineWidth = forceLineWidth || brushSize;

      ctx.fillStyle = forceColor || color;

      // for (let i = lineWidth; i--;) {
      //   ctx.arc(
      //       end.x + Math.cos(Math.random() * Math.PI * 2) * lineWidth *
      //       Math.random(),
      //       end.y + Math.sin(Math.random() * Math.PI * 2) * lineWidth *
      //       Math.random(),
      //       1,
      //       0, Math.PI * 2, false
      //   );
      //
      //   ctx.fill();
      // }

      ctx.rect(end.x, end.y, 1, 1);

      for (let i = lineWidth; i--;) {
        ctx.rect(
            end.x + Math.random() * lineWidth - (lineWidth / 2),
            end.y + Math.random() * lineWidth - (lineWidth / 2),
            1, 1
        );
        ctx.fill();
      }
    } else {
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }

    ctx.closePath();
    ctx.restore();
  }

  function stopDrawing(e) {
    if (isDrawing === true && isMouseMoved === false) {
      setStart({ x: e.clientX, y: e.clientY });
      setEnd({ x: e.clientX, y: e.clientY });

      drawPoint(start, end, ctx);
    }

    if (sequence.length) {
      setHistory([...history, {
        tool: tool,
        lineWidth: tool === 'eraser' ? eraserSize : brushSize,
        color: color,
        sequence: sequence
      }]);

      // remove redo stack content
      setRedoStack([]);

      // reset sequence
      sequence = [];
    }

    setIsDrawing(false);
    setIsMouseMoved(false);
  }

  /**
   * Fake drawing a single point
   *
   * @param start
   * @param end
   * @param ctx
   */
  function drawPoint(start, end, ctx) {
    setEnd({x: end.x, y: ++end.y });

    sequence.push([start, end]);

    draw(start, end, ctx);
  }

  function handleCanvasMouseDown(e) {
    // only main mouse button (usually left mouse button)
    if (e.button !== 0 || tool === 'colorpicker') {
      return;
    }

    setIsDrawing(true);

    setStart({ x: e.clientX, y: e.clientY });
    setEnd({ x: e.clientX, y: e.clientY });
  }

  function handleCanvasMouseMove(e) {
    if (tool === 'colorpicker') {
      setColorAtColorPickerPosition(getColorAtPosition(ctx, e.clientX, e.clientY));
    }

    if (isDrawing !== true) {
      return;
    }

    setIsMouseMoved(true);

    // draw line
    setStart({ x: end.x, y: end.y });
    setEnd({ x: e.clientX, y: e.clientY });

    sequence.push([start, end]);

    draw(start, end, ctx);
  }

  function handleCanvasMouseUp(e) {
    if (tool === 'colorpicker') {
      setColor(getColorAtPosition(ctx, e.clientX, e.clientY));
      setTool(['pencil', 'spray'].includes(previousTool) ? previousTool : 'pencil');

      return;
    }

    stopDrawing(e);
  }

  function handleCanvasMouseOut(e) {
    stopDrawing(e);
  }

  function handleClear() {
    clearCanvas(ctx);

    // add clear-step to history
    setHistory([...history, {
      tool: 'clear'
    }]);

    // remove redo stack content
    setRedoStack([]);
  }

  function handleUndo() {
    setIsLoading(true);
    redrawHistory(ctx, -1);
  }

  function handleRedo() {
    setIsLoading(true);
    redrawHistory(ctx, +1);
  }

  function handleExport() {
    download(canvasRef.current.toDataURL());
  }

  function handleFileUploadProxy() {
    uploadButtonRef.current.click();
  }

  /**
   * Handle file uploaded by button
   */
  function handleFileUpload(e) {
    addImage(e.target.files[0]);
  }

  function handleNew() {
    // clear canvas completely
    clearCanvas(ctx);

    // remove history content
    setHistory([]);

    // remove redo stack content
    setRedoStack([]);
  }

  function handleSelectToolColorPicker(e) {
    // save previously used tool to allow switching back after color was picked
    setPreviousTool(tool);

    // switch to colorpicker tool
    setTool(e.target.value);
  }

  function handleUploadedImageClick() {
    if (uploadedImage !== null) {
      drawImage(
          ctx,
          uploadedImage,
          cursorPosition.x - (imageDimension.width / 2),
          cursorPosition.y - (imageDimension.height / 2),
          imageDimension.width,
          imageDimension.height
      );

      setHistory([...history, {
        tool: 'image',
        src: uploadedImage.dataset.base64,
        dx: cursorPosition.x - (imageDimension.width / 2),
        dy: cursorPosition.y - (imageDimension.height / 2),
        width: imageDimension.width,
        height: imageDimension.height
      }]);
      setRedoStack([]);

      if (!keepUploadedImage) {
        setUploadedImage(null);
      }
    }
  }

  function handleUploadedImageZoom(e) {
    const deltaY = e.deltaY * -0.5;

    let imageWidth = imageDimension.width + deltaY;

    // restrict min width of image
    imageWidth = Math.max(50, imageWidth);

    setImageDimension({
      width: imageWidth,
      height: imageWidth * e.target.height / e.target.width
    });
  }

  return (
    <>
      <div className="icon-bar">
        <span>
          <input title="Farbauswahl" type="color" value={color}
                 onChange={e => { setColor(e.target.value); tool === 'eraser' && setTool('pencil'); }} />
        </span>

        <div className="spacer"/>

        <div className="section">
          <button title="Pinsel"
                  onClick={() => setTool('pencil')}
                  className={(tool === 'pencil' ? 'active ' : '') + 'has-option-bar'}>
            <i className="fas fa-pencil-alt"/>
          </button>

          <div className="option-bar">
            <span><i className="fas fa-circle"/></span>
            <input title="Pinselstärke" type="range" value={brushSize}
                   onChange={e => { setBrushSize(e.target.value); setTool('pencil'); }}
                   min="1" max="100" step="1" orient="vertical" />
            <span><i className="fas fa-circle"/></span>
          </div>
        </div>

        <div className="section">
          <button title="Sprühflasche"
                  onClick={() => setTool('spray')}
                  className={(tool === 'spray' ? 'active ' : '') + 'has-option-bar'}>
            <i className="fas fa-spray-can"/>
          </button>

          <div className="option-bar">
            <span class="circle-crop"><i className="fas fa-chess-board"/></span>
            <input title="Sprühstärke" type="range" value={brushSize}
                   onChange={e => { setBrushSize(e.target.value); setTool('spray'); }}
                   min="1" max="100" step="1" orient="vertical" />
            <span class="circle-crop"><i className="fas fa-chess-board"/></span>
          </div>
        </div>

        <div className="section">
          <button title="Radierer"
                  onClick={() => setTool('eraser')}
                  className={(tool === 'eraser' ? 'active ' : '') + 'has-option-bar'}>
            <i className="fas fa-eraser"/>
          </button>

          <div className="option-bar">
            <span><i className="far fa-circle"/></span>
            <input title="Radierergröße" type="range" value={eraserSize}
                   onChange={e => { setEraserSize(e.target.value); setTool('eraser'); }}
                   min="1" max="100" step="1" orient="vertical" />
            <span><i className="far fa-circle"/></span>
          </div>
        </div>

        <button title="Farbpipette"
                onClick={() => setTool('colorpicker')}
                className={tool === 'colorpicker' ? 'active ' : ''}>
          <i className="fas fa-eye-dropper"/>
        </button>

        <div className="spacer"/>

        <button onClick={handleFileUploadProxy} title="Bild einfügen">
          <i className="fas fa-image"/>
        </button>
        <input ref={uploadButtonRef} id="uploadButton" type="file" onChange={handleFileUpload} hidden />

        <div className="spacer"/>

        <button title="Rückgängig machen" onClick={handleUndo}
                disabled={!history.length}>
          <i className="fas fa-undo"/>
        </button>
        <button title="Wiederholen" onClick={handleRedo}
                disabled={!redoStack.length}>
          <i className="fas fa-redo"/>
        </button>
        <button title="Zeichnung leeren" onClick={handleClear}
                disabled={!history.length || history[history.length - 1].tool === 'clear'}>
          <i className="fas fa-broom"/>
        </button>

        <div className="spacer"/>

        <button title="Zeichnung als PNG exportieren" onClick={handleExport}>
          <i className="fas fa-file-download"/>
        </button>

        <div className="spacer"/>

        <button title="Zeichnung verwerfen" onClick={handleNew}
                disabled={!history.length && !redoStack.length}>
          <i className="fas fa-trash-alt"/>
        </button>
      </div>

      <canvas
        ref={canvasRef}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseOut={handleCanvasMouseOut}
      />

      <div id="colorPickerTooltip"
           style={{ left: cursorPosition.x, top: cursorPosition.y + 20, backgroundColor: colorAtColorPickerPosition }}
           className={tool === 'colorpicker' ? '' : 'hidden '} />

      <div ref={dropZoneRef} id="dropZone" className={isImageDragged ? '' : 'hidden '} />

      <img id="uploadedImage" src={uploadedImage !== null ? uploadedImage.src : ''} alt=""
           className={uploadedImage === null ? 'hidden' : ''}
           style={{
             left: uploadedImage === null ? 0 : (cursorPosition.x - (imageDimension.width / 2)),
             top: uploadedImage === null ? 0 : (cursorPosition.y - (imageDimension.height / 2))
           }}
           width={imageDimension.width}
           height={imageDimension.height}
           onClick={handleUploadedImageClick}
           onWheel={handleUploadedImageZoom}
      />
    </>
  );
}

export default App;
