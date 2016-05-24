#!/bin/bash

DIRECTORY="/var/log/node-image-farmer"

if [ ! -d "$DIRECTORY" ]; then
  mkdir $DIRECTORY
fi

if [ -d "$DIRECTORY" ]; then
  nohup ./imageFarmerService.sh > /var/log/node-image-farmer/node-image-farmer.log 2>&1 &
fi