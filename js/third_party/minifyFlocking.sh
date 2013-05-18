#!/bin/bash

# check if flocking.min.js exists yet
if [ -e "./flocking.min.js" ]; then
	rm ./flocking.min.js
fi
cat ./Flocking/flocking/flocking-core.js | jsmin > flocking.min.js
cat ./Flocking/flocking/flocking-scheduler.js| jsmin >> flocking.min.js
cat ./Flocking/flocking/flocking-firefox.js| jsmin >> flocking.min.js
cat ./Flocking/flocking/flocking-webaudio.js| jsmin >> flocking.min.js
cat ./Flocking/flocking/flocking-parser.js| jsmin >> flocking.min.js
cat ./Flocking/flocking/flocking-ugens.js | jsmin >> flocking.min.js

# check if infusion-framework.min.js exists yet
if [ -e "./infusion-framework.min.js" ]; then
	rm ./infusion-framework.min.js
fi

cat ./infusion-framework.js | jsmin > infusion-framework.min.js
