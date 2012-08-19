/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/

/*global jQuery, fluid, flock*/

var automm = automm || {};

(function ($) {
    "use strict";

    fluid.defaults("automm.arpeggiator", {
        gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"],
        preInitFunction: "automm.arpeggiator.preInitFunction",
        postInitFunction: "automm.arpeggiator.postInitFunction",

        model: {
            // Rate of the metronome... should be in npm
            interval: 500,
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
            onclick: null,
            onNote: null,
            afterNote: null,
            metronomeEvent: null,
            afterInstrumentUpdate: null
        }
    });

    automm.arpeggiator.preInitFunction = function (that) {
        that.metronome = flock.enviro.shared.asyncScheduler;

        that.metronomeEvents = {};

        that.currentlyPlaying = [];

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
                    var note = automm.whichNote(root, that.model.canon.scales[that.model.scale],
                            that.model.canon.modes[that.model.mode], that.model.arpPattern, count),
                        prevNote = count - 1;

                    if (prevNote === -1) {
                        prevNote = that.model.arpPattern.length - 1;
                    }

                    prevNote = automm.whichNote(root, that.model.canon.scales[that.model.scale],
                            that.model.canon.modes[that.model.mode], that.model.arpPattern, prevNote);

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

            if (that.metronomeEvents[root] === undefined) {
                that.metronomeEvents[root] = [];
            }

            that.metronomeEvents[root].push(metronomeEvent);

            that.events.metronomeEvent.addListener(metronomeEvent);
        };

        that.stopArpeggiator = function (root) {
            fluid.each(that.metronomeEvents[root], function (event) {
                that.removeMetronomeEvent(event);
            });
            that.metronomeEvents.length = 0;

            fluid.each(that.currentlyPlaying, function (note) {
                that.events.afterNote.fire(note);
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

        that.applier.modelChanged.addListener("interval", function (newModel, oldModel) {
            that.stopMetronome(oldModel.interval);
            that.startMetronome(newModel.interval);
        });
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

    automm.whichNote = function (root, scale, mode, arpPattern, count) {
        var relativeScale = automm.relativeScale(scale, mode),
            note = root + relativeScale[arpPattern[count]];

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
        } else if (i > range.high) {
            i = i - count;
            i = automm.offsetMode(i, range);
        }

        return i;
    };
}(jQuery));