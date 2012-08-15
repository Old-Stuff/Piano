#!/bin/bash

cd js
./minify.sh
cd third_party
./minifyFlocking.sh
cd ../../