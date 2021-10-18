# Client

- To run :
     npm run start

- To run client as docker container :

    Build Image:
        docker build . -t client

    Run docker container:
        docker run --rm -it --network host -v ${PWD}/.env:/.env -v ${PWD}/../fabric-network:/fabric-network client:latest


