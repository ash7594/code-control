var stuff = require('./stuff'),
Point = stuff.Point,
Tile = stuff.Tile,
Direction = stuff.Direction,
Side = stuff.Side;

/*
    params = {
        entities: // A key-value pair of (ent.idx, ent),
        grid: [arr, row, col] // Shouldn't really allow the player to experiment with this stuff
        turn: // The value of the current number of turns (not sure how its gonna be useful, but hey)
        self: // The entity which has access to this object
        bombs: // The bomb (Points) of all the bombs in the map at that time
    }

    bomb = {
        pos: ,
        damage: ,
    }
*/

// ------------------------------------------------------------Miscellaneous
function getEntArray(params) {
    var res = [], key;
    for(key in params.entities) {
        if(params.entities.hasOwnProperty(key)) {
            res.push(params.entities[key]);
        }
    }
    return res;
}

function signum(x) {
    return (x > 0) ? 1 : (x < 0) ? -1 : 0;
}

// ------------------------------------------------------------Point functions
function isValid(params, p) {
    return p.i >= 0 && p.i < params.grid.row && p.j >= 0 && p.j < params.grid.col;
}

function getDistance(pointA, pointB) {
    return Math.abs(pointA.i - pointB.i) + Math.abs(pointA.j - pointB.j);
}

// Find another name
function isPointWithinExplosion(center, point, radius) {
    var distance = Math.max(Math.abs(center.i - point.i), Math.abs(center.j - point.j));
    if (distance <= radius)
        return true;

    return false;
}

function pointsAffectedByExplosion(params, center, radius) {
    var points = [];
    var topLeft = new Point(center.i - radius, center.j - radius);

    for (var i = 0; i < 2 * radius; i++) {
        for (var j = 0; j < 2 * radius; j++) {
            var point = new Point(topLeft.i + i, topLeft.j + j);
            if (isValid(params, point))
                points.push(point);
        }
    }

    return points;
}

// Think about removing this function
function getDirection(pointA, pointB) {
    var diffI = pointB.i - pointA.i,
    diffJ = pointB.j - pointA.j;
    if(Math.abs(diffJ) > Math.abs(diffI)) {
        if(diffJ > 0) {
            return Direction.L;
        } else if(diffJ < 0) {
            return Direction.R;
        }
    } else {
        if(diffI > 0) {
            return Direction.U;
        } else if(diffI < 0) {
            return Direction.D;
        }
    }
    return -1;
}

// Entity Status functions
/*
    function hasPlacedBomb(params) {
        var ent = params.self;
        return ent.bombAtPos;
    }

    function getBombsLeft(params) {
        var ent = params.self; 
        var bombData = ent.bombInfo;

        return bombInfo.capacity;
    }

    function getPlayerPos(params) {
        var ent = params.self;
        return ent.pos;
    }

    function getPlayerHealth(params) {
        var ent = params.self;
        return ent.health;
    }

    function getExplosionsLeft(params) {
        var ent = params.self;
        var bombData = ent.explosionData;

        return bombData.capacity;
    }
*/

// ---------------------------------------------------BOMBS
// Should be exposed as a property instead
// or ent.placedBomb
function hasPlacedBomb(ent) {
    return ent.bombAtPos;
}

// Should be exposed as a property instead
function getBombsLeft(ent) {
    return bombCapacity;
}

function getBombDamage(ent) {
    var bombData = ent.bombInfo;
    return bombData.damage;
}

/*
    bombData = {
        count: ,
        damage:
    }
*/
function getBombData(ent) {
    return ent.bombData;
}

// ----------------------------------------------------EXPLOSIONS
// Should be exposed as a property instead
function getExplosionsLeft(ent) {
    return ent.explosionCapacity;
}

function getExplosionDamage(ent) {
    var explosionData = ent.explosionData;
    return explosionData.damage;
}

function getExplosionRadius(ent) {
    var explosionData = ent.explosionData;
    return explosionData.radius;
}

/*
    explosionData = {
        count: ,
        damage: ,
        radius
    }
*/

function getExplosionData(ent) {
    return ent.explosionData;
}

// ------------------------------------------------------ENTITY
// Should be exposed as a property instead
function getPlayerPos(ent) {
    return ent.pos;
}

// Should be exposed as a property instead
function getPlayerHealth(ent) {
    return ent.health;
}


// ----------------------------------------------------------------------Grid functions
function getAt(params, p) {
    return params.grid.arr[p.i * params.grid.col + p.j];
}

/*
    getType will return either one of the following
    * 'free' (if nothing is there)
    * 'bomb'
    * 'warrior'
    * 'tile'
*/
// Should I change 'tile' to 'wall'? 

function getType(object) {
    if(object == 0) {
        return 'free';
    }

    if (object.type == 'Player Item')
        return 'bomb';

    return (object.type || 'none')
}

function isBomb(params, p) {
    var res = getAtRedefinied(params, p);
    if (res.type == 'bomb')
        return true;
}

function isWarrior(params, p) {
    var res = getAtRedefinied(params, p);
    if (res.type == 'warrior')
        return true;
}

function isWall(params, p) {
    var res = getAtRedefinied(params, p);
    if (res.type == 'tile')
        return true;
}

function isFree(params, p) {
    var res = getAtRedefinied(params, p);
    if (res.type == 'free')
        return true;
}

// Make it better, name it better
function getAtRedefinied(params, p) {
    var obj = params.grid.arr[p.i * params.grid.col + p.j];
    var type = getType(obj);

    return {
        item: obj,
        type: type
    };
}

// -------------------------------------------------functions for bomb
// Really should export all these as properties instead of functions
function getDamage(bomb) {
    return bomb.damage;
}

function getBombPos(bomb) {
    return bomb.pos;
}

// ----------------------------------------------------------------------Group Functions
// Will work if and only if there are only two enemies
function getEnemy(params) {
    var entities = getEntArray(params);
    var enemyEntity = {};

    entities.forEach(function(ent) {
        if (ent.idx != params.self.idx)
            enemyEntity = ent;
    });

    return enemyEntity;
}

// If multiple enemies
function getEnemyArray(params) {
    var entities = getEntArray(params);
    var enemies = [];

    entities.forEach(function(ent) {
        if (ent.side != params.self.side) {
            enemies.push(ent);
        }
    });

    return enemies;
}

// For friendlies
function getFriendlyArray(params) {
    var entities = getEntArray(params);
    var friendlies = [];

    friendlies.forEach(function(ent) {
        if (ent.side == params.self.side) {
            enemies.push(ent);
        }
    });

    return friendlies;
}

// Make it a readble property
function getBombArray(params) {
    return params.bomb;
}

// Assume all properties of entities are available.

module.exports.Point = Point;
module.exports.getMove = stuff.getMove;
module.exports.Direction = Direction;
module.exports.log = console.log;
module.exports.getDistance = getDistance;
module.exports.getDirection = getDirection;
module.exports.getEntArray = getEntArray;
module.exports.getType = getType;
module.exports.getAt = getAt;
module.exports.isValid = isValid;
module.exports.hasPlacedBomb = hasPlacedBomb;
module.exports.Side = Side;