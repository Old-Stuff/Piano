#!/bin/bash

# check if automm.min.js exists yet
if [ -e "./automm.min.js" ]; then
	rm ./automm.min.js
fi
cat oscillator.js | jsmin > automm.min.js
cat arpeggiator.js | jsmin >> automm.min.js
cat aria.js | jsmin >> automm.min.js
cat piano.js | jsmin >> automm.min.js
cat grid.js | jsmin >> automm.min.js
cat instrument.js | jsmin >> automm.min.js
cat highlighter.js | jsmin >> automm.min.js
cat gui.js | jsmin >> automm.min.js
cat eventBinder.js | jsmin >> automm.min.js