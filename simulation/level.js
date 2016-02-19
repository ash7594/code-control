var fs = require('fs'),
util = require('util');
stuff = require('./stuff'),
run = require('./runner'),
baseEnt = require('./entities/base'),
Runner = run.Runner,
Controllable = baseEnt.Controllable,
ControlException = baseEnt.ControlException,
Grid = stuff.Grid,
Tile = stuff.Tile,
LinkList = stuff.LinkList,
Point = stuff.Point;

const MAX_TURNS = 100, MAX_ERR = 101;
function Player(id) {
    this.id = id;
    this.ents = {};
    this.errCount = 0;
}

const P_A = 0, P_B = 1;

function randInt(a, b) {
    return a + Math.floor(Math.random() * (b - a));
}

function SwarmTraining(char, swarm, jsonPath, finishCb) {
    var self = this,
    pChar, spawned = [];

    AbstractLevel.call(this, [char, swarm], jsonPath, finishCb);

    function isFinished() {
        return self.turn > MAX_TURNS || pChar.dead;
    }
    this.isFinished = isFinished;

    function getScore() {
        var i, score = 0;
        for(i = 0; i < spawned.length; i++) {
            if(spawned[i].dead) {
                score += 1;
            }
        }
        return score;
    }

	function restartSwarm() {
		self.turn = 0;
		spawned = [];
		self.restart();
	}

    function gameOver() {
		if (this.defendDone)
			setImmediate(finishCb, null, { score: getScore(), replay: [self.defendReplay, self.attackReplay], map: JSON.stringify(self.def) });
		else {
			this.defendDone = true;
			restartSwarm();
		}
    }
    this.gameOver = gameOver;

    function init() {
        pChar = new Controllable(P_A, self.getSpawn(), self, char.getHealth(), char.getAttack())
        spawned.push(new Controllable(P_B, self.getSpawn(), self, swarm.getHealth(), swarm.getAttack()));
    }
    this.init = init;

	function attackInit() {
        pChar = new Controllable(P_B, self.getSpawn(), self, char.getHealth(), char.getAttack())
        spawned.push(new Controllable(P_A, self.getSpawn(), self, swarm.getHealth(), swarm.getAttack()));
	}
	this.attackInit = attackInit;

    function nextIter() {
        if(self.turn % 5 == 0) {
			if (self.defendDone)
				spawned.push(new Controllable(P_A, self.getSpawn(), self, swarm.getHealth(), swarm.getAttack()));
			else
				spawned.push(new Controllable(P_B, self.getSpawn(), self, swarm.getHealth(), swarm.getAttack()));

        }
    }
    this.nextIter = nextIter;

    this.run();
}

util.inherits(SwarmTraining, AbstractLevel);

function BattleLevel(charA, charB, jsonPath, finishCb) {
    var self = this, aP, bP;

    AbstractLevel.call(this, [charA, charB], jsonPath, finishCb);

    function getNumEnt(x) {
        return Object.keys(self.players[x].ents).length;
    }

    function isFinished() {
        return self.turn > MAX_TURNS || aP.dead || bP.dead;
    }
    this.isFinished = isFinished;

    function gameOver() {
        if(bP.dead) {
            setImmediate(finishCb, null, { winner: charA._id, replay: [self.defendReplay, self.attackReplay], map: JSON.stringify(self.def) });
        } else if(aP.dead) {
            setImmediate(finishCb, null, { winner: charB._id, replay: [self.defendReplay, self.attackReplay], map: JSON.stringify(self.def) });
        } else {
            setImmediate(finishCb, null, { winner: null, replay: [self.defendReplay, self.attackReplay], map: JSON.stringify(self.def) });
        }
    }
    this.gameOver = gameOver;

    function init() {
        aP = new Controllable(0, self.getSpawn(), self, charA.getHealth(), charA.getAttack());
        bP = new Controllable(1, self.getSpawn(), self, charB.getHealth(), charB.getAttack());
    }
    this.init = init;
    
    function nextIter() {}
    this.nextIter = nextIter;

    this.run();
}

util.inherits(BattleLevel, AbstractLevel);

/* CHAR IFACE */

/* getAttack()
 * getHealth()
 * code
 * id
 */

function AbstractLevel(chars, jsonPath, finishCb) {
    var entities = {},
    updateList = new LinkList, moveDel = [],
    self = this,
    msg = '', runner, defendDone = false;

    this.players = chars.map(function(x) {
        return new Player(x._id);
    });
    this.grid = null;
    this.tSet = {};
    this.turn = 0;
    this.defendReplay = [];
	this.attackReplay = [];
	this.defendDone = defendDone;

	function restart() {
		entities = {};
		updateList = new LinkList;
		chars.reverse();
		self.players = chars.map(function(x) {
			return new Player(x._id);
		});
		self.grid = null;
		self.tSet = {};
		self.turn = 0;
		fReadCback(self.def);

		// Apparantely, Runner can't be re-initialized
		// self.run();
		// runner.reverseRunnerStatus();
	}
	this.restart = restart;

	// The way things are done right now, chars.length == 2 always. 
    function run() {
        var code = chars.map(function(x) {
            return x.code;  // x.code -> [defend, attack]
        });

		// 0 - defend; 1 - attack;
		// Modify the order of code being sent here.

        // Don't pass ./api.js here. Let defend_api and attack_api
        // be self contained
		
		runner = new Runner(['./defend_api', './attack_api'], code, loadMap, errBack, 1000);
    }
    this.run = run;

    function spawnEvent(ent) {
        addEvent('spawn', ent);
    }
    this.spawnEvent = spawnEvent;

    function getSpawn() {
        var p = {};
        do {
            p.i = randInt(0, self.def.height);
            p.j = randInt(0, self.def.width);
        } while(self.grid.get(p) != 0);
        return p;
    }
    this.getSpawn = getSpawn;

    function damageEvent(idx, amt) {
        addEvent('damage', {
            idx: idx,
            amt: amt
        });
    }
    this.damageEvent = damageEvent;

    function moveEvent(idx, nPos, oPos) {
        var delPos = {
            i: nPos.i - oPos.i,
            j: nPos.j - oPos.j
        };
        addEvent('move', {
            idx: idx,
            pos: delPos
        });
    }
    this.moveEvent = moveEvent;

    function addEvent(type, data) {
        var event = {};
        event[type] = data;

		if(!self.defendDone) {
			self.defendReplay.push(event);
		}
		else {
			self.attackReplay.push(event);
		}
    }

    function errBack(i, e) {
        console.log('INV_CODE Error, must die..');
        setImmediate(finishCb, e, i);
    }

    function logMessage(type, i, t, m) {
        var logObj = { type: type, idx: i, player: t, m: m };
        addEvent('log', logObj);
    }
    this.logMessage = logMessage;

    function updateEntCallback(ent) {
        return function(x, dat) {
            try {
                if(!x) {
                    throw dat;
                }
                ent.update(dat);
                var logs = runner.flushStr(ent.team);
                if(logs != '') {
                    logMessage('MSG', ent.idx, ent.team, logs);
                }
            } catch(e) {
                console.log(e);
                logMessage('ERR', ent.idx, ent.team, e.toString());
                self.players[ent.team].errCount += 1;
                if(self.players[ent.team].errCount > MAX_ERR) {
                    return setImmediate(finishCb, e, ent.team);
                }
            }
            setImmediate(act, updateList.getNext(ent));
        }
    }

    function getParams(ent) {
        return {
            entities: entities,
            grid: self.grid.getRepr(), 
            turn: self.turn,
            self: ent
        };
    }

    function loadMap() {
		if (defendDone)
			return;

        if(++loadMap.count < chars.length) {
            return;
        }
		require("./map_gen").GenerateMap(fReadCback);
    }
    loadMap.count = 0;

    function fReadCback(map) {
        self.def = map;
        self.grid = new Grid(self.def.height, self.def.width);
        // Building tilesets
        for(key in self.def.tiledata) {
            if(self.def.tiledata.hasOwnProperty(key)) {
                self.tSet[key] = new Tile(self.def.tiledata[key], key);
            }
        }

		// Copy this line
        self.grid.loadTilemap(self.def.data, self.tSet);

		if (self.defendDone) {
			self.attackInit();
		} else {
			self.init();
		}

        act(null);
    }

    function destroy(e) {
        updateList.remove(e);
        delete entities[e.idx];
    }
    this.destroy = destroy;

    function deathEvent(e) {
        addEvent('death', e);
    }
    this.deathEvent = deathEvent;
    
    function act(ent) {
        if(ent == null) {
            ent = updateList.getHead();
        }
        if(updateList.isEnd(ent)) {
            self.turn += 1;
            self.nextIter();
            // LOOP DONE
            // UPDATE REST!?
            // ADD HOOK for next
            if(self.isFinished()) {
                self.gameOver();
                return false;
            }
        }
        if(ent instanceof Controllable) {
            try {
                runner.runCode(ent.team, getParams(ent), updateEntCallback(ent), ['defend', 'attack'], 2000);
            } catch(e) {
                setImmediate(finishCb, e, ent.team);
            }
        } else {
            ent.update();
        }
        return true;
    }

    function addEntity(ent) {
        entities[ent.idx] = ent;
        updateList.append(ent);
    }
    this.addEntity = addEntity;

    function getGameState() {
        return entities;
    }
    this.getGameState = getGameState;
}

module.exports.BattleLevel = BattleLevel;
module.exports.SwarmTraining = SwarmTraining;
