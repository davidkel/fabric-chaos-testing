docker run --rm -it --network host -v ${PWD}/../fabric-network:/fabric-network tempclient:latest node dist/start.js $1