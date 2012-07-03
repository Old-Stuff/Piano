/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library


Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/
/*global jQuery, fluid, */

var automm = automm || {};

(function ($) {
    "use strict";
    fluid.defaults("automm.instrument", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        postInitFunction: "automm.instrument.postInitFunction",
        
        model: {
            afour: 69,     // The note number of A4... this could probably be calculate based on all the other stuff (probably should be)
            afourFreq: 440, // Standard freq for A4, used to calculate all other notes
            firstNote: 60, // Middle C
            octaves: 1,
            octaveNotes: 12,
            padding: 50,
            pattern: ['white','black','white','black','white','white','black','white','black','white','black','white'],
            keys: {
                white: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow", notes: []},
                black: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow", notes: []}
            },
            keyTypes: {
                keyOne: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow"},
                keyTwo: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow"}
            }
        },
        
        events: {
            onNote: null,
            afterNote: null
        },
        
        listeners: {
            onNote: "{instrument}.noteOn"
        },
        
        components: {
            piano: {
                type: "automm.piano",
                container: "{instrument}.container",
                options: {
                    model: {
                        firstNote: "{instrument}.model.firstNote", // Middle C
                        octaves: "{instrument}.model.octaves",
                        octaveNotes: "{instrument}.model.octaveNotes",
                        padding: "{instrument}.model.padding",
                        pattern: "{instrument}.model.pattern",
                        keys: "{instrument}.model.keys",
                        keyTypes: "{instrument}.model.keyTypes"
                    }
                    // listeners: {
                    //     afterUpdate: "{instrument}.bindEvents"
                    // }
                }
            },
            
            oscillator: {
                type: "automm.oscillator",
                options: {
                    listeners: {
                        
                    }
                }
            }
        }
    });
    
    automm.instrument.postInitFunction = function(that) {
        that.onNote() = function () {
            console.log("test");
        };
    };
}(jQuery));