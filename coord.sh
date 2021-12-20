    # start the client
    cd client
    # npm run build
    node -r source-map-support/register --require dotenv/config dist/app.js &
    last_pid=$!
    sleep 5
    cd ../chaos-engine
    node dist/start.js ./scenarios/stop-scenarios peer0-org1
    cd ..
    sleep 5
    kill -SIGINT $last_pid