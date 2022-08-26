const NUM_PIXELS = 128;
const PIXEL_SIZE = 5;
const APP_SIZE = NUM_PIXELS * PIXEL_SIZE;
const PIXEL_BORDER_WIDTH = 0;

const pixels = new Map();

// Create the application helper and add its render target to the page
const app = new PIXI.Application({ width: APP_SIZE, height: APP_SIZE });
document.body.appendChild(app.view);

const pixelContainer = new PIXI.Container();
app.stage.addChild(pixelContainer);

const treeContainer = new PIXI.Container();
app.stage.addChild(treeContainer);

for (let i = 0; i < NUM_PIXELS; i++) {
  for (let j = 0; j< NUM_PIXELS; j++) {
    const graphics = createPixel(i, j);
    pixelContainer.addChild(graphics);
    pixels.set(`${i},${j}`, graphics);
  }
}


let startPixel = null;
let endPixel = null;
let r = 0;
const tintedPixels = new Set();


function createPixel (i, j) {
  const graphics = new PIXI.Graphics();

  if (PIXEL_BORDER_WIDTH) {
    graphics.lineStyle(2, ((i + j) % 2) ? 0xFF0000 : 0x0000FF);  
  }
  graphics.beginFill(0x00FF00);
  graphics.drawRect(i * PIXEL_SIZE + PIXEL_BORDER_WIDTH / 2, j * PIXEL_SIZE + PIXEL_BORDER_WIDTH / 2, PIXEL_SIZE - PIXEL_BORDER_WIDTH, PIXEL_SIZE - PIXEL_BORDER_WIDTH);
  graphics.endFill();

  graphics.interactive = true;
  graphics.on('pointerdown', () => {
    // if (!startPixel) {
    //   clearPixels();
    //   startPixel = { i, j };
    // } else if (!endPixel) {
    //   // endPixel = { i, j };

    //   // treeLine(startPixel.i, startPixel.j, i, j);
    //   const dx = startPixel.i - i;
    //   const dy = startPixel.j - j;
    //   const rSquared = dx * dx + dy * dy;
    //   const r = Math.sqrt(rSquared);
    //   treeCircle(startPixel.i, startPixel.j, r);
    //   startPixel = null;
    // } else {
    //   startPixel = null;
    //   endPixel = null;
    // }
    setStartPixel(i, j);
  });
  graphics.on('pointerover', () => {
    setEndPixel(i, j);
  });

  return graphics;
}

function treeCircle (x0, y0, r) {
  const drawRadius = function (x, y) {
    drawBresenhamLine (x0, y0, x, y);
  };
  bresenhamCircleCore(drawRadius, x0, y0, r);
}

function treeLine (x1, y1, x2, y2) {
  const branchGraphics = new PIXI.Graphics();

  const drawBranchSegment = function (x, y, prevX, prevY) {
    if (prevX === null && prevY === null) {
      branchGraphics.lineStyle(2);
      branchGraphics.moveTo((x + 0.5) * PIXEL_SIZE, (y + 0.5) * PIXEL_SIZE);
    } else {
      branchGraphics.lineTo((x + 0.5) * PIXEL_SIZE, (y + 0.5) * PIXEL_SIZE);
    }
  }
  bresenhamLineCore(drawBranchSegment, x1, y1, x2, y2);

  treeContainer.addChild(branchGraphics);
}

function togglePixel (i, j) {
  // console.log({ i, j })
  const graphics = pixels.get(`${i},${j}`);
  if (graphics) {
    if (graphics.tint === 0xFFFFFF) {
      graphics.tint = 0x777777;
      tintedPixels.add(graphics);
    } else {
      graphics.tint = 0xFFFFFF;
      tintedPixels.delete(graphics);
    }
  }
}

function setPixel (i, j) {
  const graphics = pixels.get(`${i},${j}`);
  if (graphics) {
    graphics.tint = 0x777777;
    tintedPixels.add(graphics);
  } 
}

function clearPixels () {
  for (const pixel of tintedPixels.values()) {
    pixel.tint = 0xFFFFFF;
    tintedPixels.delete(pixel);
  }
}

function setStartPixel (i, j) {
  clearPixels();
  setPixel(i, j);
  startPixel = { i, j };
  endPixel = null;
}

function setEndPixel (i, j) {
  if (startPixel) {
    clearPixels();
    endPixel = { i, j };
    // drawBresenhamLine(startPixel.i, startPixel.j, i, j);
    const dx = startPixel.i - i;
    const dy = startPixel.j - j;
    const rSquared = dx * dx + dy * dy;
    const r = Math.sqrt(rSquared);
    drawBresenhamCircle(startPixel.i, startPixel.j, r);
    treeCircle(startPixel.i, startPixel.j, r);
  }
}

function drawBresenhamLine (x1, y1, x2, y2) {
  bresenhamLineCore(setPixel, x1, y1, x2, y2);
}

function drawBresenhamCircle (x0, y0, r) {
  bresenhamCircleCore(setPixel, x0, y0, r);
}

function bresenhamLineCore (fxn, x1, y1, x2, y2) {
  let dy = y2 - y1;
  let dx = x2 - x1;
  let yMultiplier = 1;
  let xMultiplier = 1;
  
  const isXYMirrored = Math.abs(dy) > Math.abs(dx);
  
  if (dx < 0) { // x mirrored
    xMultiplier = -1;
    dx *= -1;
  }
  if (dy < 0) { // y mirrored
    dy *= -1;
    yMultiplier = -1;
  }

  if (isXYMirrored) { // swap
    dy = dy + dx;
    dx = dy - dx;
    dy = dy - dx;
    yMultiplier = yMultiplier + xMultiplier;
    xMultiplier = yMultiplier - xMultiplier;
    yMultiplier = yMultiplier - xMultiplier;
  }

  /*
    dx = -dy;
    dy = dx;
              dx = dx;
              dy = -dy;

              dx = dx;
              dy = dy;
    dx = dy;
    dy = dx;
  */

  let prevX = null, prevY = null;
  const wrappedFxn = function (x, y) {
    // console.log({ x, y })
    fxn(x, y, prevX, prevY);
    prevX = x;
    prevY = y;
  };

  // wrappedFxn(x1, y1);

  // // console.log({ xMultiplier, yMultiplier })

  // for (let x = 1, error = 0, y = 0; x <= dx; x++) {
  //   if (error === dx) {
  //     console.log({dx, dy, x, y, error})
  //   }
  //   error += 2 * dy;
  //   if (
  //     error > dx
  //       || (error === dx && x > dx - x)
  //   ) {
  //     error -= 2 * dx;
  //     ++y;
  //   }
  //   // const actualY = x * dy / dx;
  //   // if (actualY - Math.floor(actualY) ===  0.5) {
  //   //   console.log({ x, y, actualY, error })
  //   // }
  //   if (isXYMirrored) {
  //     wrappedFxn(y * yMultiplier + x1, x * xMultiplier + y1);
  //   } else {
  //     wrappedFxn(x * xMultiplier + x1, y * yMultiplier + y1);
  //   }
  // }

  

  // console.log({ xMultiplier, yMultiplier })
  // prevX = null
  // prevY = null

  for (let x = 0, error = 0, y = 0; x <= dx; x++) {
    if (isXYMirrored) {
      wrappedFxn(y * yMultiplier + x1, x * xMultiplier + y1);
    } else {
      wrappedFxn(x * xMultiplier + x1, y * yMultiplier + y1);
    }

    error += 2 * dy;
    // if (error === dx) {
    //   console.log({dx, dy, x, y})
    // }
    if (
      error > dx
        // || (error === dx && x > dx - x)
        // || (error === dx && x > dx - x - 1) // if x > dx - x - 1, then either x >= dx - x - 1 + 1 
        || (error === dx && x >= dx - x) // if x >= dx - x, => x >= dx - x - 1. if x === dx - x, => x > dx - x - 1
    ) {
      error -= 2 * dx;
      ++y;
    }
  }
}

function bresenhamCircleCore (fxn, x0, y0, r) {
  const threshold = 0.25 + r + r * r; // probably not an integer

  let x = 0; // integer
  let y = Math.round(r); // integer
  let maybeRSquared = x * x + y * y; // integer

  // console.log({threshold})
  
  while (x <= y) {
    // console.log({x, y, maybeRSquared})

    fxn(x0 + y, y0 - x); // quadrant I part I
    fxn(x0 + x, y0 - y); // quadrant I part II
    fxn(x0 - x, y0 - y); // quadrant II part I
    fxn(x0 - y, y0 - x); // quadrant II part II
    fxn(x0 - y, y0 + x); // quadrant III part I
    fxn(x0 - x, y0 + y); // quadrant III part II
    fxn(x0 + x, y0 + y); // quadrant IV part I
    fxn(x0 + y, y0 + x); // quadrant IV part II

    maybeRSquared += 2 * x + 1;
    x++;
    
    if (maybeRSquared > threshold) {
      y--;
      maybeRSquared -= 2 * y + 1;
    }
  }
}
