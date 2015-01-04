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

    -h, --help  output usage information
    --bn <val>  Num of Brokers
    --wn <val>  Num of Workers (for each Broker)
    --cn <val>  Num of Clients
    --m <val>   Use memory cache (1=enabled|0=disabled) (default=0)
    --p <val>   Num of messages (for each Client)

Examples:
	node perf --bn 4 --wn 2 --cn 2 --p 50000
```

######Examples
```node perf.js --bn 4 --wn 2 --cn 2 --p 100000```
