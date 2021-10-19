#!/bin/bash
ids=$(docker ps -a --format='{{.ID}}')
for id in $ids
do
        echo $(docker ps -a --format='{{.ID}} ### {{.Names}} ### {{.Image}}' | fgrep $id)
        truncate -s 0 $(docker inspect --format='{{.LogPath}}' $id)
        ls -llh $(docker inspect --format='{{.LogPath}}' $id)
done


# echo "" > $(docker inspect --format='{{.LogPath}}' <container_name_or_id>)

# : > $(docker inspect --format='{{.LogPath}}' <container_name_or_id>)

# truncate -s 0 $(docker inspect --format='{{.LogPath}}' <container_name_or_id>)
