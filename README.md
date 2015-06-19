pigato-perf
===========

Performance tests for [PIGATO](https://github.com/prdn/pigato), a microservices framework for Node.js

### INSTALL
```npm install```


### USAGE 
```node perf --help``` for the usage
```
  Usage: perf [options]

  Options:

    -h, --help    output usage information
    --bn <val>    Num of Brokers
    --wn <val>    Num of Workers (for each Broker)
    --cn <val>    Num of Clients (for each Broker)
    --pn <val>    Num of Parallel Requests (for each Client)
    --p <val>     Num of messages (for each Client)
    --m <val>     Use memory cache (1=enabled|0=disabled) (default=0)
    --s <val>     Num of waves (default=1)
    --e <val>     Num of waves (default=tcp://127.0.0.1:7777)
    -N, --nofork  Don't use fork
```

######Examples
```node perf.js --bn 4 --wn 2 --cn 2 --p 100000```
