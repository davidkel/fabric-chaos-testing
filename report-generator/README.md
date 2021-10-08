# Report Generator

Collect the logs from client/chaincode/chaos engine (optionally peer)

search for errors in the client log and determine the start of the chaos activity that may have caused it and generate output
that shows chaos start and end
shows the all the client/chaincode entries between start/end

Only include entries that match transaction ids that fail.This could mean that between a failing chaos run there could be multiple transactions
