const NUM_PIXELS = 64;
const PIXEL_SIZE = 10;
const APP_SIZE = NUM_PIXELS * PIXEL_SIZE;
const PIXEL_BORDER_WIDTH = 0;

// Create the application helper and add its render target to the page
const app = new PIXI.Application({ width: APP_SIZE, height: APP_SIZE });
document.body.appendChild(app.view);

const pixels = new Map();
const pixelContainer = new PIXI.Container();
app.stage.addChild(pixelContainer);

const otherContainer = new PIXI.Container();
app.stage.addChild(otherContainer);

for (let i = 0; i < NUM_PIXELS; i++) {
  for (let j = 0; j< NUM_PIXELS; j++) {
    const graphics = createPixel(i, j);
    pixelContainer.addChild(graphics);
    pixels.set(`${i},${j}`, graphics);
  }
}

let clickMode = 'LINK'; // GUARDIAN_PLACE / GUARDIAN_SET_RANGE / LINK / OBSTACLE

const guardians = new Map();
const guardianMaybeNewPosition = { i: null, j: null };
const linkPosition = { i: null, j: null };
const obstacles = new Set();
const occupiedPixels = new Set();

setLinkPosition(0, 0);

function setClickMode (mode) {
  clickMode = mode;
}

function toggleObstacle (i, j) {
  const pixel = pixels.get(`${i},${j}`);
  if (pixel) {
    if (obstacles.has(pixel)) {
      pixel.tint += 0x003300;
      obstacles.delete(pixel);
      occupiedPixels.delete(pixel);
    } else if (!occupiedPixels.has(pixel)) {
      pixel.tint -= 0x003300;
      obstacles.add(pixel);
      occupiedPixels.add(pixel);
    }  
  }
}

function setLinkPosition (i, j) {
  const maybeNewPixel = pixels.get(`${i},${j}`);
  if (maybeNewPixel && !occupiedPixels.has(maybeNewPixel)) {
    const oldPixel = pixels.get(`${linkPosition.i},${linkPosition.j}`);
    if (oldPixel) {
      oldPixel.tint -= 0x006600;
      occupiedPixels.delete(oldPixel);
    }
    linkPosition.i = i;
    linkPosition.j = j;
    maybeNewPixel.tint += 0x006600;
    occupiedPixels.add(maybeNewPixel);

    trackLink();
  }
}

function moveLinkUp () {
  setLinkPosition(linkPosition.i, linkPosition.j - 1);
}
function moveLinkDown () {
  setLinkPosition(linkPosition.i, linkPosition.j + 1);
}
function moveLinkLeft () {
  setLinkPosition(linkPosition.i - 1, linkPosition.j);
}
function moveLinkRight () {
  setLinkPosition(linkPosition.i + 1, linkPosition.j);
}

function setGuardianPosition (i, j) {
  guardianMaybeNewPosition.i = i;
  guardianMaybeNewPosition.j = j;
  setClickMode('GUARDIAN_SET_RANGE');
}

function setGuardian (i, j) {
  const { i: iPos, j: jPos } = guardianMaybeNewPosition;
  const maybePixel = pixels.get(`${iPos},${jPos}`);
  if (maybePixel && !occupiedPixels.has(maybePixel)) {
    // calculate radius
    const dx = guardianMaybeNewPosition.i - i;
    const dy = guardianMaybeNewPosition.j - j;
    const rSquared = dx * dx + dy * dy;
    // map: { guardian graphics object, guardian location, guardian rSquared, guardian edge pixels }

    const setThresholdPixel = function (i, j) {
      const thresholdPixel = pixels.get(`${i},${j}`);
      if (thresholdPixel) {
        thresholdPixel.tint |= 0x990000;
      }
    }
    bresenhamCircleCore(setThresholdPixel, iPos, jPos, Math.sqrt(rSquared));

    maybePixel.tint += 0x000099;
    guardians.set(`${iPos},${jPos}`, {
      i: iPos,
      j: jPos,
      pixel: maybePixel,
      rSquared, // to reset pixels or something eventually
    });
    occupiedPixels.add(maybePixel);
  }

  setClickMode('GUARDIAN_PLACE');
}

function trackLink () {
  for (const guardian of guardians.values()) {
    // clear old target line
    if (guardian.pixelPath) {
      otherContainer.removeChild(guardian.pixelPath);
      guardian.pixelPath.destroy();
      delete guardian.pixelPath;
    }
    if (guardian.laserLine) {
      otherContainer.removeChild(guardian.laserLine);
      guardian.laserLine.destroy();
      delete guardian.laserLine;
    }

    const dx = guardian.i - linkPosition.i;
    const dy = guardian.j - linkPosition.j;
    if (guardian.rSquared >= dx * dx + dy * dy) {
      // attempt to make pixel path

      let hasObstruction = false;
      const pixelPath = new PIXI.Graphics();
      pixelPath.lineStyle(4, 0x660066);

      const attemptLineOfSight = function (x, y, prevX, prevY) {
        if (hasObstruction) {
          return;
        }
        if (prevX === null && prevY === null) {
          pixelPath.moveTo((x + 0.5) * PIXEL_SIZE, (y + 0.5) * PIXEL_SIZE);
        } else {
          pixelPath.lineTo((x + 0.5) * PIXEL_SIZE, (y + 0.5) * PIXEL_SIZE);  
          const maybeObstruction = pixels.get(`${x},${y}`);
          if (occupiedPixels.has(maybeObstruction) && (x !== linkPosition.i || y !== linkPosition.j)) {
            hasObstruction = true;
          }
        }
      }
      bresenhamLineCore(attemptLineOfSight, guardian.i, guardian.j, linkPosition.i, linkPosition.j);

      otherContainer.addChild(pixelPath);
      guardian.pixelPath = pixelPath;

      if (!hasObstruction) {
        const laserLine = new PIXI.Graphics();
        laserLine.lineStyle(2, 0xFF0000);
        laserLine.moveTo((guardian.i + 0.5) * PIXEL_SIZE, (guardian.j + 0.5) * PIXEL_SIZE);
        laserLine.lineTo((linkPosition.i + 0.5) * PIXEL_SIZE, (linkPosition.j + 0.5) * PIXEL_SIZE)
        otherContainer.addChild(laserLine);
        guardian.laserLine = laserLine;
      }
    }
  }
}



function createPixel (i, j) {
  const graphics = new PIXI.Graphics();

  if (PIXEL_BORDER_WIDTH) {
    graphics.lineStyle(2, ((i + j) % 2) ? 0xFF0000 : 0x0000FF);  
  }
  graphics.beginFill(0xFFFFFF);
  graphics.drawRect(i * PIXEL_SIZE + PIXEL_BORDER_WIDTH / 2, j * PIXEL_SIZE + PIXEL_BORDER_WIDTH / 2, PIXEL_SIZE - PIXEL_BORDER_WIDTH, PIXEL_SIZE - PIXEL_BORDER_WIDTH);
  graphics.endFill();

  graphics.tint = 0x003300;

  graphics.interactive = true;
  graphics.on('pointerdown', () => {
    switch (clickMode) {
      case 'GUARDIAN_PLACE': setGuardianPosition(i, j); break;
      case 'GUARDIAN_SET_RANGE': setGuardian(i, j); break;
      case 'LINK': setLinkPosition(i, j); break;
      case 'OBSTACLE': toggleObstacle(i, j); break;
      default: break;
    }
  });
  // graphics.on('pointerover', () => {
  //   setEndPixel(i, j);
  // });

  return graphics;
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
