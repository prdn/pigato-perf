pigato-perf
===========

Performance tests for Pigato

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
    --p <val>   Num of messages (for each Client)
```

######Examples
```node perf.js --bn 4 --wn 2 --cn 2 --p 100000```
