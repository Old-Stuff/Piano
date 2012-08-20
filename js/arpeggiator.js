/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/

/*global jQuery, fluid, flock, document, d3, setTimeout*/

var automm = automm || {};

(function ($) {
    "use strict";

    fluid.defaults("automm.arpeggiator", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.arpeggiator.preInitFunction",
        postInitFunction: "automm.arpeggiator.postInitFunction",

        model: {
            // Is it active?
            arpActive: false,
            notificationShowing: false,
            // Rate of the metronome... should be in bpm
            interval: 150,
            // Scale and mode to arpeggiate in
            scale: "major",
            mode: "ionian",
            // This pattern is in Note Degrees starting from 0 ({"I"": 0, "II":1, "III":etcetcetc})
            arpPattern: [0, 2, 4],
            // Stuff from the instrument model
            firstNote: 60,
            octaves: 1,
            octaveNotes: 12,

            // This is a connanon which is used to collect modes / scales / etc.... 
            // probably shouldn't live here
            canon: {
                modes: {
                    ionian: 0,
                    dorian: 1,
                    phyrgian: 2,
                    lydian: 3,
                    mixolydian: 4,
                    aeolian: 5,
                    locrian: 6
                },
                scales: {
                    major: [2, 2, 1, 2, 2, 2, 1],
                    minor: [2, 2, 1, 2, 2, 1, 2]
                }
            }
        },

        events: {
            onClick: null,
            afterClick: null,
            onNote: null,
            afterNote: null,
            metronomeEvent: null,
            afterInstrumentUpdate: null,
            arpActive: null
        }
    });

    automm.arpeggiator.preInitFunction = function (that) {
        that.metronome = flock.scheduler.async();

        that.runningArpeggiators = {};

        that.currentlyPlaying = [];

        that.drawNotification = function (isAlt) {
            var container = that.container.find("#viewBox"),
                viewBox,
                textRect;
            that.model.notificationShowing = true;
            container = container[0];
            that.svg = d3.select(container);
            viewBox = that.svg.attr("viewBox").split(' ');
            fluid.each(viewBox, function (value, i) {
                viewBox[i] = parseFloat(value);
            });
            that.svgTextGroup = that.svg.append("g");
            textRect = that.svgTextGroup.append("rect");
            textRect.attr("x", viewBox[2] / 4);
            textRect.attr("y", viewBox[3] / 4);
            textRect.attr("height", "50%");
            textRect.attr("width", "50%");
            textRect.attr("fill", "black");
            textRect.attr("opacity", 0.5);
            textRect.attr("rx", "20");
            textRect.attr("ry", "20");
            that.svgText = that.svgTextGroup.append("text");
            that.svgText.attr("x", viewBox[2] / 2);
            that.svgText.attr("y", viewBox[3] / 1.8);
            that.svgText.attr("text-anchor", "middle");
            that.svgText.attr("fill", "white");
            that.svgText.attr("font-size", 25);
            if (isAlt) {
                that.svgText.text("Arpeggiator On");
            } else {
                that.svgText.text("Arpeggiator Off");
            }
            setTimeout(that.removeNotification, 500);
        };

        that.removeNotification = function () {
            that.svgTextGroup.remove();
            that.model.notificationShowing = false;
        };

        that.onClick = function (note) {
            if (that.model.arpActive) {
                note = parseFloat(note[0].id);
                that.startArpeggiator(note);
            }
        };

        that.afterClick = function (note) {
            if (that.model.arpActive) {
                note = parseFloat(note[0].id);
                that.stopArpeggiator(note);
            }
        };

        that.bindAlt = function () {
            $(document).keydown(function (event) {
                if (event.altKey === true && !that.model.notificationShowing) {
                    that.update("arpActive", !that.model.arpActive);
                    that.events.arpActive.fire(that.model.arpActive);
                }
            });
        };

        //  The below metronome are Web Workers running at a particular time interval
        //  They are by creating flock.
        // that.setMetronome = function (interval) {
        //     
        // };

        that.startMetronome = function (interval) {
            interval = interval || that.model.interval;
            that.metronome.repeat(interval, that.events.metronomeEvent.fire);
        };

        that.stopMetronome = function (interval) {
            interval = interval || that.model.interval;
            that.metronome.clearRepeat(interval);
        };

        that.startArpeggiator = function (root) {
            var count = 0,
                firstTime = true,

                metronomeEvent = function () {
                    var range = {
                            low: that.model.firstNote,
                            high: (that.model.octaves * that.model.octaveNotes) + that.model.firstNote
                        },
                        note = automm.whichNote(root, that.model.canon.scales[that.model.scale],
                            that.model.canon.modes[that.model.mode], that.model.arpPattern, count, range),
                        prevNote = count - 1;

                    if (prevNote === -1) {
                        prevNote = that.model.arpPattern.length - 1;
                    }

                    prevNote = automm.whichNote(root, that.model.canon.scales[that.model.scale],
                            that.model.canon.modes[that.model.mode], that.model.arpPattern, prevNote, range);

                    if (!firstTime) {
                        that.events.afterNote.fire(prevNote);
                        that.currentlyPlaying.splice(($.inArray(note, that.currentlyPlaying)), 1);
                    } else {
                        firstTime = false;
                    }

                    that.events.onNote.fire(note);
                    that.currentlyPlaying.push(note);

                    if (count >= that.model.arpPattern.length - 1) {
                        count = 0;
                    } else {
                        count = count + 1;
                    }
                };

            if (that.runningArpeggiators[root] === undefined) {
                that.runningArpeggiators[root] = [];
            }

            that.runningArpeggiators[root].push(metronomeEvent);

            that.events.metronomeEvent.addListener(metronomeEvent);
        };

        that.stopArpeggiator = function (root) {
            fluid.each(that.runningArpeggiators[root], function (event) {
                that.removeMetronomeEvent(event);
            });
            that.runningArpeggiators[root].length = 0;

            fluid.each(that.currentlyPlaying, function (note) {
                that.events.afterNote.fire(note);
            });
        };

        that.clearArpeggiators = function () {
            fluid.each(that.runningArpeggiators, function (root) {
                that.stopArpeggiator(root);
            });
        };

        that.setMetronomeEvent = function (callback) {
            that.events.metronomeEvent.addListener(callback);
        };

        that.removeMetronomeEvent = function (callback) {
            that.events.metronomeEvent.removeListener(callback);
        };

        that.update = function (param, value) {
            that.applier.requestChange(param, value);
            return that;
        };
    };

    automm.arpeggiator.postInitFunction = function (that) {
        that.startMetronome(that.model.interval);
        that.events.afterInstrumentUpdate.addListener(that.update);
        that.events.onClick.addListener(that.onClick);
        that.events.afterClick.addListener(that.afterClick);
        that.events.arpActive.addListener(that.drawNotification);
        that.bindAlt();

        /*jslint unparam: true*/
        that.applier.modelChanged.addListener("interval", function (newModel, oldModel, changeSpec) {
            that.stopMetronome(oldModel.interval);
            that.startMetronome(newModel.interval);
        });
        /*jslint unparam: false*/
    };

    automm.relativeScale = function (scale, mode) {
        var relativeScale = [],
            i;
        for (i = 0; i < scale.length; i = i + 1) {
            if (i === 0) {
                relativeScale[i] = 0;
            } else {
                relativeScale[i] = relativeScale[i - 1] + scale[(i - 1 + mode) % scale.length];
            }
        }

        return relativeScale;
    };

    automm.whichNote = function (root, scale, mode, arpPattern, count, range) {
        var relativeScale = automm.relativeScale(scale, mode),
            note = root + relativeScale[arpPattern[count]];
        note = automm.offsetMod(note, range);

        return note;
    };

    automm.offsetMod = function (i, range) {
        // i is any number
        // range is an object
        // 
        // See if the number is below the range and needs to be modded down
        // range = {
        //     low: that.model.firstNote,
        //     high: (that.model.octaves * that.model.octaveNotes) + that.model.firstNote
        // };
        var count = range.high - range.low;

        if (i - range.low < 0) {
            i = i + count;
            i = automm.offsetMod(i, range);
        } else if (i >= range.high) {
            i = i - count;
            i = automm.offsetMod(i, range);
        }

        return i;
    };
}(jQuery));