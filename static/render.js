var canvas, ctx, logTable, nextButton, prevButton, playButton, pauseButton,
resetButton, playTime = 0,
state, seek = 0, dir, delT = 0, entities = {}, bgCanvas,
images = {}, prevTime, map, replay, dead = {};

var attackCanvas, ctxAttack, nextButtonAttack, prevButtonAttack, 
	playButtonAttack, pauseButtonAttack, resetButtonAttack, playTimeAttack = 0,
	stateAttack, seekAttack = 0, dirAttack, delTAttack = 0, entitiesAttack = {}, bgCanvasAttack,
	imagesAttack = {}, prevTimeAttack, mapAttack, replayAttack, deadAttack = {};

const LOADING = 0, ERROR = 1, DONE = 2;

const MOVE_DELAY = 1000;
function setImmediate(f) {
    return setTimeout(function() {
        f.apply(this, Array.prototype.slice.call(arguments, 1));
    }, 0)
}

function downloadLink() {
    var a = document.getElementById('dload-link');
    // a.href = 'data:application/json;charset=utf-8;base64,' + btoa(JSON.stringify(replay));
}

function initElements() {
    canvas = document.getElementById('render-canvas');
    ctx = canvas.getContext('2d');
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    attackCanvas = document.getElementById('render-canvas-attack');
    ctxAttack = attackCanvas.getContext('2d');
    ctxAttack.textAlign = 'center';
    ctxAttack.textBaseline = 'middle';

    prevButton = document.getElementById('prev-button');
    nextButton = document.getElementById('next-button');
    playButton = document.getElementById('play-button');
    pauseButton = document.getElementById('pause-button');
    resetButton = document.getElementById('reset-button');

    prevButton.onclick = prevFrame;
    nextButton.onclick = nextFrame;
    playButton.onclick = beginPlay;
    pauseButton.onclick = pausePlay;
    resetButton.onclick = resetPlay;

    prevButtonAttack = document.getElementById('prev-button-attack');
    nextButtonAttack = document.getElementById('next-button-attack');
    playButtonAttack = document.getElementById('play-button-attack');
    pauseButtonAttack = document.getElementById('pause-button-attack');
    resetButtonAttack = document.getElementById('reset-button-attack');

    prevButtonAttack.onclick = prevFrameAttack;
    nextButtonAttack.onclick = nextFrameAttack;
    playButtonAttack.onclick = beginPlayAttack;
    pauseButtonAttack.onclick = pausePlayAttack;
    resetButtonAttack.onclick = resetPlayAttack;

    map = JSON.parse(document.getElementById('map-json').innerHTML);
    replay = JSON.parse(document.getElementById('replay-json-defend').innerHTML);
	replayAttack = JSON.parse(document.getElementById('replay-json-attack').innerHTML);

	/*
		console.log('defend');
		console.log(replay);
		console.log('attack');
		console.log(replayAttack);
	*/

    // downloadLink();
    setImmediate(render);
    pausePlay();
}

function doPlay() {
    nextFrame();
    if(seek > replay.length - 1) {
        pausePlay();
    }
}

function doPlayAttack() {
    nextFrameAttack();
    if(seekAttack > replayAttack.length - 1) {
        pausePlayAttack();
    }
}

function togglePlayState(v) {
    prevButton.disabled = nextButton.disabled = v;
    playButton.disabled = resetButton.disabled = v;
    pauseButton.disabled = !v;
}

function togglePlayStateAttack(v) {
    prevButtonAttack.disabled = nextButtonAttack.disabled = v;
    playButtonAttack.disabled = resetButtonAttack.disabled = v;
    pauseButtonAttack.disabled = !v;
}

var playInt = 200;
function beginPlay() {
    togglePlayState(true);
    playTime = setInterval(doPlay, playInt);
}

function beginPlayAttack() {
    togglePlayStateAttack(true);
    playTimeAttack = setInterval(doPlayAttack, playInt);
}

function pausePlay() {
    clearInterval(playTime);
    togglePlayState(false);
    resetButtons();
}

function pausePlayAttack() {
    clearInterval(playTimeAttack);
    togglePlayStateAttack(false);
    resetButtonsAttack();
}

function resetPlay() {
    seek = 0;
    entities = {};
    dead = {};
}

function resetPlayAttack() {
    seekAttack = 0;
    entitiesAttack = {};
    deadAttack = {};
}

function stripChar(x, ch, rp) {
    while(x.find(ch) != -1) {
        x = x.replace(ch, rp);
    }
    return x;
}

function XSafe(x) {
    return stripChar(stripChar(x, '<', '&lt;'), '>', '&gt');
}

function loadImages(imgList, callback) {
    function cbWrap(i) {
        return function() {
            if(i >= imgList.length) {
                setImmediate(callback);
                return;
            }
            img = new Image;
            img.onload = cbWrap(i + 1);
            images[imgList[i]] = img;
            img.src = imgList[i];
        }
    }
    setImmediate(cbWrap(0));
}

function drawAttackBG() {
    bgCanvasAttack = document.createElement('canvas');
    bgCanvasAttack.width = map.width * map.tilewidth;
    bgCanvasAttack.height = map.height * map.tileheight;
    var bgCtx = bgCanvasAttack.getContext('2d'), i, j, d, tile;
    for(i = 0; i < map.height; i++) {
        for(j = 0; j < map.width; j++) {
            d = map.data[i * map.width + j];
            if(d != 0) {
                tile = map.tiledata[d];
                bgCtx.drawImage(images[tile.image],
                                tile.j * map.tilewidth, 
                                tile.i * map.tileheight,
                                map.tilewidth, map.tileheight,
                                j * map.tilewidth, i * map.tileheight,
                                map.tilewidth, map.tileheight);
            }
        }
    }
    for(i = 0; i <= map.height; i++) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, i * map.tileheight);
        bgCtx.lineTo(bgCanvasAttack.width, i * map.tileheight);
        bgCtx.stroke();
        bgCtx.closePath();
    }
    for(i = 0; i <= map.width; i++) {
        bgCtx.beginPath();

        bgCtx.moveTo(i * map.tilewidth, 0);
        bgCtx.lineTo(i * map.tilewidth, bgCanvasAttack.height);
        bgCtx.stroke();
        bgCtx.closePath();
    }
    attackCanvas.width = bgCanvasAttack.width;
    attackCanvas.height = bgCanvasAttack.height;
    state = DONE;
    setImmediate(draw);
}

function drawBG() {
    bgCanvas = document.createElement('canvas');
    bgCanvas.width = map.width * map.tilewidth;
    bgCanvas.height = map.height * map.tileheight;
    var bgCtx = bgCanvas.getContext('2d'), i, j, d, tile;
    for(i = 0; i < map.height; i++) {
        for(j = 0; j < map.width; j++) {
            d = map.data[i * map.width + j];
            if(d != 0) {
                tile = map.tiledata[d];
                bgCtx.drawImage(images[tile.image],
                                tile.j * map.tilewidth, 
                                tile.i * map.tileheight,
                                map.tilewidth, map.tileheight,
                                j * map.tilewidth, i * map.tileheight,
                                map.tilewidth, map.tileheight);
            }
        }
    }
    for(i = 0; i <= map.height; i++) {
        bgCtx.beginPath();
        bgCtx.moveTo(0, i * map.tileheight);
        bgCtx.lineTo(bgCanvas.width, i * map.tileheight);
        bgCtx.stroke();
        bgCtx.closePath();
    }
    for(i = 0; i <= map.width; i++) {
        bgCtx.beginPath();

        bgCtx.moveTo(i * map.tilewidth, 0);
        bgCtx.lineTo(i * map.tilewidth, bgCanvas.height);
        bgCtx.stroke();
        bgCtx.closePath();
    }
    canvas.width = bgCanvas.width;
    canvas.height = bgCanvas.height;
    state = DONE;
    // setImmediate(draw);
}

function render() {
    idx = 0;
    var imgList = [], i, img;
    for(i in map.tiledata) {
        if(map.tiledata.hasOwnProperty(i)) {
            img = map.tiledata[i].image;
            if(img && imgList.indexOf(img) == -1) {
                imgList.push(img);
            }
        }
    }
    loadImages(imgList, drawBG);
    loadImages(imgList, drawAttackBG);
}

function clone(x) {
    return JSON.parse(JSON.stringify(x));
}

function addRow(logEv) {
    var row = logArea.insertRow(logArea.rows.length - 1),
    logLvl = row.insertCell(0),
    logTeam = row.insertCell(1),
    logIdx = row.insertCell(2),
    logMsg = row.insertCell(3);
    logLvl.innerHTML = logEv.type;
    logTeam.innerHTML = logEv.player;
    logIdx.innerHTML = logEv.idx;
    logMsg.innerHTML = XSafe(logEv.m);
}

function updateAttack() {
    disableButtonsAttack();
    if(dirAttack != -1 && dirAttack != 0) {
        throw new Error('invalid direction');
    }
    var curEv = replayAttack[seekAttack],
    f = (dirAttack == 0) ? 1: -1,
    nextEv = replayAttack[seekAttack + dirAttack];
    if(!nextEv) {
        throw new Error('undefined transition state!');
    }
    clearFlagsAttack();
    if('spawn' in nextEv) {
        if(dirAttack == 0) {
            var entClone = clone(nextEv.spawn);
            entitiesAttack[entClone.idx] = entClone;
        } else {
            delete entitiesAttack[nextEv.spawn.idx];
        }
    } else if('move' in nextEv) {
        var ent = nextEv.move,
        thisEnt = entitiesAttack[ent.idx];
        thisEnt.pos.i += f * ent.pos.i;
        thisEnt.pos.j += f * ent.pos.j;
    } else if('damage' in nextEv) {
        var ent = entitiesAttack[nextEv.damage.idx];
        ent.health -= f * nextEv.damage.amt;
        ent.flags.damaged = true;
    } else if('death' in nextEv) {
        if(dirAttack == 0) {
            deadAttack[nextEv.death] = entitiesAttack[nextEv.death];
            delete entitiesAttack[nextEv.death];
        } else {
            entitiesAttack[nextEv.death] = deadAttack[nextEv.death];
            delete deadAttack[nextEv.death];
        }
    }
    seekAttack += f;
    resetButtonsAttack();
}

function update() {
    disableButtons();
    if(dir != -1 && dir != 0) {
        throw new Error('invalid direction');
    }
    var curEv = replay[seek],
    f = (dir == 0) ? 1: -1,
    nextEv = replay[seek + dir];
    if(!nextEv) {
        throw new Error('undefined transition state!');
    }
    clearFlags();
    if('spawn' in nextEv) {
        if(dir == 0) {
            var entClone = clone(nextEv.spawn);
            entities[entClone.idx] = entClone;
        } else {
            delete entities[nextEv.spawn.idx];
        }
    } else if('move' in nextEv) {
        var ent = nextEv.move,
        thisEnt = entities[ent.idx];
        thisEnt.pos.i += f * ent.pos.i;
        thisEnt.pos.j += f * ent.pos.j;
    } else if('damage' in nextEv) {
        var ent = entities[nextEv.damage.idx];
        ent.health -= f * nextEv.damage.amt;
        ent.flags.damaged = true;
    } else if('death' in nextEv) {
        if(dir == 0) {
            dead[nextEv.death] = entities[nextEv.death];
            delete entities[nextEv.death];
        } else {
            entities[nextEv.death] = dead[nextEv.death];
            delete dead[nextEv.death];
        }
    }
    seek += f;
    resetButtons();
}


function clearFlags() {
    var key;
    for(key in entities) {
        if(entities.hasOwnProperty(key)) {
            entities[key].flags = {};
        }
    }
}

function clearFlagsAttack() {
    var key;
    for(key in entitiesAttack) {
        if(entitiesAttack.hasOwnProperty(key)) {
            entitiesAttack[key].flags = {};
        }
    }
}

const F_SIZE = 13;
function drawState() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bgCanvas, 0, 0);

    ctxAttack.clearRect(0, 0, attackCanvas.width, attackCanvas.height);
    ctxAttack.drawImage(bgCanvasAttack, 0, 0);

    var ent, img, drawX, drawY;
    for(key in entities) {
        if(entities.hasOwnProperty(key)) {
            ent = entities[key];
            img = ent.image;
            drawX = ent.pos.j * map.tilewidth;
            drawY = ent.pos.i * map.tileheight;
            ctx.drawImage(images[img.name], img.j * map.tilewidth, img.i * map.tileheight, 
                          map.tilewidth, map.tileheight, drawX, drawY, map.tilewidth, map.tileheight);
            ctx.font = F_SIZE + 'pt Serif';
            ctx.fillText('' + ent.health, drawX, drawY + map.tileheight / 2);
        }
    }

    for(key in entitiesAttack) {
        if(entitiesAttack.hasOwnProperty(key)) {
            ent = entitiesAttack[key];
            img = ent.image;
            drawX = ent.pos.j * map.tilewidth;
            drawY = ent.pos.i * map.tileheight;
            ctxAttack.drawImage(images[img.name], img.j * map.tilewidth, img.i * map.tileheight, 
                          map.tilewidth, map.tileheight, drawX, drawY, map.tilewidth, map.tileheight);
            ctxAttack.font = F_SIZE + 'pt Serif';
            ctxAttack.fillText('' + ent.health, drawX, drawY + map.tileheight / 2);
        }
    }
}

function disableButtons() {
    prevButton.disabled = nextButton.disabled = true;
}

function disableButtonsAttack() {
	prevButtonAttack.disabled = nextButtonAttack.disabled = true;
}

function resetButtons() {
    if(seek > 0) {
        prevButton.disabled = false;
    }
    if(seek <= (replay.length - 1)){
        nextButton.disabled = false;
    }
}

function resetButtonsAttack() {
    if(seekAttack > 0) {
        prevButtonAttack.disabled = false;
    }
    if(seekAttack <= (replayAttack.length - 1)){
        nextButtonAttack.disabled = false;
    }
}

function nextFrameAttack() {
    if(seekAttack > (replayAttack.length - 1)) {
        return;
    }
    dirAttack = 0;
    updateAttack();
}

function nextFrame() {
    if(seek > (replay.length - 1)) {
        return;
    }
    dir = 0;
    update();
}

function prevFrameAttack() {
    if(seekAttack <= 0) {
        return;
    }
    dirAttack = -1;
    updateAttack();
}

function prevFrame() {
    if(seek <= 0) {
        return;
    }
    dir = -1;
    update();
}

function drawText(ctxArray, text, size) {
	ctxArray.forEach(function(ctx) {
		ctx.fillText(text, canvas.width / 2 - (text.length * size) / 2, canvas.height / 2 - size / 2, size);
	});
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctxAttack.clearRect(0, 0, attackCanvas.width, attackCanvas.height);
    if(state == LOADING) {
        drawText([ctx, ctxAttack], 'Loading...', 32);
    } else if(state == ERROR) {
        
    } else if(state == DONE) {
        drawState();
    }
    requestAnimationFrame(draw);
}

/* DEBUG */
initElements();
window.addEventListener('load', initElements, false);
