var cluster = require('cluster');
var pigato = require('pigato');
var async = require('async');
var _ = require('lodash');
var cmd = require('commander');

cmd
.option('--bn <val>', 'Num of Brokers', 1)
.option('--wn <val>', 'Num of Workers (for each Broker)', 1)
.option('--cn <val>', 'Num of Clients', 1)
.option('--p <val>', 'Num of messages (for each Client)', 100000)
.option('--m <val>', 'Use memory cache (1=enabled|0=disabled) (default=0)', 0);

cmd.on('--help', function() {
  console.log('Examples:');
  console.log('\tnode ' + cmd.name() + ' --bn 2 --wn 2 --cn 2 --p 50000');
});

cmd.parse(process.argv);

_.each(['bn', 'wn', 'cn', 'p', 'm'], function(k) {
  cmd[k] = +cmd[k];
});

var chunk = 'foo';

if (cluster.isMaster) {
  console.log("RUNNING CONF");
  console.log("\t", [
    cmd.bn + " brokers",
    cmd.wn + " workers",
    cmd.cn + " clients",
    "cache " + (cmd.m ? 'on' : 'off'),
    cmd.p + " requests"
  ].join(", ")); 
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
    var broker = new pigato.Broker(
      'tcp://*:7777' + workerID,
      { cache: !!cmd.m }
    );
    broker.on('error', function(err) { console.log("broker", err); });
  
    broker.start(function() {
      console.log("BROKER " + workerID);
    });

  } else if (workerID <= cmd.bn + (cmd.bn * cmd.wn)) {
    var b = (workerID % cmd.bn) + 1;
    var worker = new pigato.Worker(
      'tcp://127.0.0.1:7777' + b, 'echo',
      { concurrency: 10 }
    );

    worker.on('error', function(err) { console.log("worker", err); });

    worker.on('request', function(inp, res) {
      if (cmd.m) {
        res.opts.cache = 50000;
      }
      setImmediate(function() {
        res.end(inp + 'FINAL');
      });
    });

    worker.start();
    console.log("WORKER (BROKER " + b + ")");

  } else {
    var bs = [];
    
    for (var i = 0; i < cmd.bn; i++) {
      bs.push('tcp://127.0.0.1:7777' + (i + 1));
    }

    var client = new pigato.Client(bs);
    client.start();
    console.log("CLIENT (" + cmd.p + " reqs)");

    client.on('error', function(err) {
      console.log(err);       
    });

    var d1;
    var rcnt = 0;

    function done() {
      var d2 = new Date();
      var hmany = d2.getTime() - d1.getTime();
       
      console.log("CLIENT GOT answer", hmany + " milliseconds. " + (cmd.p / (hmany / 1000)).toFixed(2) + " requests/sec.");
      client.stop();
      setTimeout(function() {
        process.exit(-1);
      }, 1000);
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
      d1 = new Date();
      send();
    }, 2000);
  }
}
