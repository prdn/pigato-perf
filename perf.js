var cluster = require('cluster');
var pigato = require('pigato');
var async = require('async');
var _ = require('lodash');
var cmd = require('commander');

cmd
.option('--bn <val>', 'Num of Brokers', 1)
.option('--wn <val>', 'Num of Workers (for each Broker)', 1)
.option('--cn <val>', 'Num of Clients', 1)
.option('--p <val>', 'Num of messages (for each Client)', 100000);

cmd.on('--help', function() {
  console.log('Examples:');
  console.log('\tnode ' + cmd.name() + ' --bn 4 --wn 2 --cn 2 --p 40000');
});

cmd.parse(process.argv);

_.each(['bn', 'wn', 'cn', 'p'], function(k) {
  cmd[k] = +cmd[k];
});

var chunk = 'foo';

if (cluster.isMaster) {
  for (var i = 0; i < (cmd.bn + (cmd.bn * cmd.wn) + cmd.cn); i++) {
    cluster.fork();
  }

  var kills = 0;
  cluster.on('exit', function(worker, code, signal) {
    kills++;
    if (kills === cmd.cn) {
      for (var id in cluster.workers) {
        cluster.workers[id].kill();
      }
    }
  });
} else {

  var workerID = cluster.worker.workerID || cluster.worker.id;
  
  if (workerID <= cmd.bn) {
    var broker = new pigato.Broker('tcp://*:5555' + workerID);
    broker.start(function() {
      console.log("BROKER " + workerID);
    });

  } else if (workerID <= cmd.bn + (cmd.bn * cmd.wn)) {
    var b = (workerID % cmd.bn) + 1;
    var worker = new pigato.Worker('tcp://127.0.0.1:5555' + b, 'echo');
    worker.on('request', function(inp, res) {
      res.opts.cache = 50000;
      res.end(inp + 'FINAL');
    });
    worker.start();
    console.log("WORKER (BROKER " + b + ")");

  } else {
    var bs = [];
    
    for (var i = 0; i < cmd.bn; i++) {
      bs.push('tcp://127.0.0.1:5555' + (i + 1));
    }

    var client = new pigato.Client(bs);
    client.start();
    console.log("CLIENT (" + cmd.p + " reqs)");

    var timer;
    var rcnt = 0;

    function done() {
      var elapsed = process.hrtime(timer);
      var dts = elapsed[0] + (elapsed[1] / 1000000000);
      console.log("CLIENT GOT answer", dts + " milliseconds. " + (cmd.p / dts).toFixed(2) + " requests/sec.");
      client.stop();
      process.exit(-1);
    }

    function send() {
      for (var k = 0; k < cmd.p; k++) {
        client.request(
          'echo', chunk + (k % 1000),
          { timeout: -1 }
        )
        .on('data', function() {})
        .on('end', function() {
          rcnt++;

          if (rcnt < cmd.p) {
            return;
          }

          done();
        });
      }
    }

    setTimeout(function() {
      timer = process.hrtime();
      send();
    }, 1000);
  }
}
