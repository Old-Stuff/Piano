#!/bin/bash

# check if flocking.min.js exists yet
if [ -e "./flocking.min.js" ]; then
	rm ./flocking.min.js
fi
cat ./Flocking/flocking/flocking-core.js | jsmin > flocking.min.js
cat ./Flocking/flocking/flocking-parser.js| jsmin >> flocking.min.js
cat ./Flocking/flocking/flocking-ugens.js | jsmin >> flocking.min.js