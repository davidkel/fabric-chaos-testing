
#!/bin/bash

#
# SPDX-License-Identifier: Apache-2.0
#
echo 'waiting for network to discover itself'
sleep 30
echo 'Starting Client'
node client/dist/app.js &
last_pid=$!
sleep 10
node chaos-engine/dist/start.js ./scenarios/stop-scenarios peer1-org1 random 5
echo 'Chaos engine completed, waiting 60 secs before terminating client'
sleep 60
kill -s SIGINT $last_pid
wait $last_pid
client_exit=$?
echo $client_exit
exit $client_exit