var cluster = require('cluster');
var pigato = require('pigato');
var async = require('async');
var _ = require('lodash');
var cmd = require('commander');

cmd
.option('--bn <val>', 'Num of Brokers', 1)
.option('--wn <val>', 'Num of Workers (for each Broker)', 1)
.option('--cn <val>', 'Num of Clients (for each Broker)', 1)
.option('--pn <val>', 'Num of Parallel Requests (for each Client)', 1)
.option('--p <val>', 'Num of messages (for each Client)', 50000)
.option('--m <val>', 'Use memory cache (1=enabled|0=disabled) (default=0)', 0)
.option('--s <val>', 'Num of waves (default=1)', 1)
.option('--e <val>', 'Num of waves (default=tcp://127.0.0.1:7777)', 'tcp://127.0.0.1:777')
.option('-N, --nofork', 'Don\'t use fork' );

cmd.on('--help', function() {
  console.log('Examples:');
  console.log('\tnode ' + cmd.name() + ' --bn 2 --wn 2 --cn 2 --p 50000');
});

cmd.parse(process.argv);

_.each(['bn', 'wn', 'cn', 'p', 'm', 's'], function(k) {
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
  for (var i = 0; i < (cmd.bn + (cmd.bn * cmd.wn) + (cmd.bn * cmd.cn)); i++) {
    fork(i+1);
  }

  var kills = 0;
  cluster.on('exit', function(worker, code, signal) {
    kills++;
    if (kills === (cmd.cn * cmd.bn)) {
      process.exit(0);
    }
  });

  return
}else{
  fork();
};


function fork(ID){ 
  if(!cmd['nofork'] && ID){
    return cluster.fork();
  } 

  setImmediate(function() { 
    var processID = ID || cluster.worker.processID || cluster.worker.id;

    if (processID <= cmd.bn) {  
      var broker = new pigato.Broker(
        cmd.e + processID,
        { cache: !!cmd.m }
      );

      broker.on('error', function(err) { 
        console.log("broker", err); 
      });

      broker.start(function() {
        console.log('BROKER ' + processID);
      });

    } else if (processID <= cmd.bn + (cmd.bn * cmd.wn)) {
      var b = (processID % cmd.bn) + 1;
      var worker = new pigato.Worker(
        cmd.e + b, 'echo',
        { concurrency: 1000 }
      );

      worker.on('error', function(err) { 
        console.log("worker", err); 
     });

      worker.on('request', function(inp, res) {
        if (cmd.m) {
          res.opts.cache = 100000;
        }

        setImmediate(function() {
          res.end(inp + 'FINAL');
        });
      });

      worker.start();
      console.log("WORKER (BROKER " + b + ")");

    } else {
      var b = (processID % cmd.bn) + 1;
      var client = new pigato.Client( cmd.e + b);

      var sn = 0;
      var tp = cmd.p * cmd.s;

      console.log("CLIENT (" + tp + " reqs/" + cmd.s + " waves) (BROKER " + b + ")");

      client.on('connect', function() {
        console.log('connected');
      })
      .on('disconnect', function() {
        console.log('disconnected');
      })
      .on('error', function(err) {
        console.log(err);       
      });

      client.start();

      var d1;
      var rcnt = 0;

      function done() {
        var d2 = new Date();
        var hmany = d2.getTime() - d1.getTime();

        console.log("CLIENT GOT answer", hmany + " milliseconds. " + (tp / (hmany / 1000)).toFixed(2) + " requests/sec.");
        client.stop();
        setTimeout(function() {
          cluster.worker.kill();
        }, 1000);
      }

      function send() {
        var prcnt = 0;
        sn++;

        console.log("C/" + processID + ": WAVE=" + sn);

        for (var k = 0; k < cmd.p; k++) {
          client.request(
            'echo', chunk,
            { timeout: -1 }
          )
          .on('data', function() {})
          .on('end', function() {
            rcnt++;
            prcnt++;

            if (prcnt === cmd.p && sn < cmd.s) {
              send();
              return;
            }

            if (rcnt < tp) {
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
  })
};

