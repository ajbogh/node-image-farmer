#!/bin/bash

DIRECTORY="/var/log/node-image-farmer"

if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi

if [ -d "$DIRECTORY" ]; then
  DEBUG=node-image-farmer* nohup npm run app "imageFarmer" > /var/log/node-image-farmer/node-image-farmer.log 2>&1 &
fi