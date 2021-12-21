    # start the client
    cd client
    # npm run build
    node -r source-map-support/register --require dotenv/config dist/app.js &
    last_pid=$!
    sleep 10
    cd ../chaos-engine
    node dist/start.js ./scenarios/stop-scenarios peer1-org1 random 5
    cd ..
    sleep 60
    kill -SIGINT $last_pid
    wait $last_pid
    client_exit=$?
    echo $client_exit
    exit $client_exit