var vm = require('vm'),
linter = require('../common/lint.js'),
child_proc = require('child_process');
var req_func = {
    0 : 'defend',
    1 : 'attack'
}
function SandboxException(i, m) {
    this.m = m;
    this.i = i;
}
SandboxException.prototype.toString = function() {
    return 'SBOX_ERR: P_' + this.i + ' - ' + this.m;
}

function TimeoutException() { }

TimeoutException.prototype.toString = function() {
    return "Subprocess timed out";
}

const INIT = 0, DONE = 1, RUN = 2, KILLED = 3;
function Runner(api, code, cBack, errBack, timeLimit) {
    var proc = [], cback = [], i, offset = 0;
	this.code = code;

    function timeoutKill(i) {
        return function() {
            if (proc[i].state != KILLED) {
                proc[i].p.kill('SIGKILL');
                if(proc[i].state == INIT) {
                    setImmediate(errBack, i, new TimeoutException);
                } else if(proc[i].state == RUN) {
                    var e = new TimeoutException;
                    setImmediate(proc[i].callback, false, e);
                }
                proc[i].state = KILLED;
            }
        }
    }

    function messageHandler(i) {
        return function(m) {
            var type = m.type, data = m.data;
            if(type == 'init_done') {
                console.log("In runner MSG Handler " + i);
                clearTimeout(proc[i].timeout);
                proc[i].state = DONE;
                setImmediate(cBack);
            } else if(type == 'result') {
                clearTimeout(proc[i].timeout);
                proc[i].callback(true, data);
                proc[i].state = DONE;        
            } else if(type == 'error') {
                console.log("ERROR "+m);
                if(proc[i].state == INIT) {
                    setImmediate(errBack, i, new Error(data))
                } else if(proc[i].state == RUN) {
                    var e = new SandboxException(i, data);
                    setImmediate(proc[i].callback, false, e);
                }
                proc[i].state = DONE;
            }

            if(proc[i].q.length > 0) {
                runCode.apply(this, proc[i].q.pop());
            }
        }
    }

    function appendToLog(i) {
        return function(data) {
            proc[i].log += data;
        }
    }

	function reverseRunnerStatus() {
		/*
			for (var i = 0; i < this.code.length; i++) {
				proc[i].state = INIT;
				proc[i].timeout = setTimeout(timeoutKill(i), timeLimit);
				// console.log(code[(i + 1) % 2][i]);
				
				proc[i].p.send({ type: 'init_code', data: code[(i + 1) % 2][i] });
				proc[i].p.stdout.on('data', appendToLog(i));
			}
			console.log("Done reversing");
		*/

		offset = 2;
	}
	// this.reverseRunnerStatus = reverseRunnerStatus;

    for(var i = 0; i < code.length; i++) {
        var err = linter.process(code[i][i], require(api[i]), [req_func[i]]);
        if(err.length > 0) {
            setImmediate(errBack, i, new Error('Code failed to lint ' + err[0].text));
            return;
        }
        proc[i] = {};
        proc[i].q = [];
        proc[i].log = '';
        proc[i].p = child_proc.fork('./simulation/sandbox.js', [], {silent: true});
        proc[i].p.on('message', messageHandler(i));
        proc[i].p.send({ type: 'init_context', data: api[i] });
        proc[i].state = INIT;
        proc[i].timeout = setTimeout(timeoutKill(i), timeLimit);
        proc[i].p.send({ type: 'init_code', data: code[i][i] });
        proc[i].p.stdout.on('data', appendToLog(i));
    }


    // Uncommenting the below code will cause the error.
	/*
        for(var i = 0; i < code.length; i++) {
    		console.log(code[(i + 1) % 2][i]);
    		console.log(req_func[i]);
            var err = linter.process(code[(i + 1) % 2][i], require(api[i]), [req_func[i]]);
            if(err.length > 0) {
                setImmediate(errBack, i + 2, new Error('Code failed to lint ' + err[0].text));
                return;
            }
            proc[i + 2] = {};
            proc[i + 2].q = [];
            proc[i + 2].log = '';
            proc[i + 2].p = child_proc.fork('./simulation/sandbox.js', [], {silent: true});
            proc[i + 2].p.on('message', messageHandler(i + 2));
            proc[i + 2].p.send({ type: 'init_context', data: api[i] });
            proc[i + 2].state = INIT;
            proc[i + 2].timeout = setTimeout(timeoutKill(i + 2), timeLimit);
            proc[i + 2].p.send({ type: 'init_code', data: code[(i + 1) % 2][i] });
            proc[i + 2].p.stdout.on('data', appendToLog(i + 2));
        }
    */
	
	function runCode(i, input, cback, f_name, timeLimit) {
        
        if(proc[i].state != DONE) {
            proc[i].q.push(arguments);
        }
        proc[i].state = RUN;
        proc[i].callback = cback;
        proc[i].p.send({ type: 'load_param', data: input });
		proc[i].timeout = setTimeout(timeoutKill(i), timeLimit);
		proc[i].p.send({ type: 'run_code', data: f_name[i] });
        
        
    }
    this.runCode = runCode;

    function flushStr(i) {
        var res = proc[i].log;
        proc[i].log = '';
        return res;
    }
    this.flushStr = flushStr;
}

module.exports.Runner = Runner;
module.exports.TimeoutException = TimeoutException;
