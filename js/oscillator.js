/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/

/*global jQuery, fluid, flock, navigator*/



var automm = automm || {};

(function ($) {
    "use strict";
    fluid.defaults("automm.oscillator", {
        gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"],
        preInitFunction: "automm.oscillator.preInitFunction",
        postInitFunction: "automm.oscillator.postInitFunction",

        model: {
            arpActive: false,
            freq: 440,
            osc: "flock.ugen.sin",
            attack: 0.25,
            sustain: 0.7,
            release: 0.5,
            gate: 0,
            afour: 69,
            afourFreq: 440,
            octaveNotes: 12,
            isShift: false
        },

        events: {
            onNote: null,
            afterNote: null,
            onClick: null,
            afterClick: null,
            afterInstrumentUpdate: null
        },
        // Maps parameter between this model and the model of flocking
        paramMap: {
            "freq": "carrier.freq",
            "attack": "env.attack",
            "sustain": "env.sustain",
            "release": "env.release",
            "gate": "env.gate"
        }
    });

    automm.oscillator.preInitFunction = function (that) {
        if (!flock.enviro.shared) {
            flock.init();
        }
        
        that.polysynth = flock.synth.polyphonic({
            id: "carrier",
            ugen: that.model.osc,
            freq: that.model.freq,
            mul: {
                id: "env",
                ugen: "flock.ugen.env.simpleASR",
                attack: that.model.attack,
                sustain: that.model.sustain,
                release: that.model.release
            }
        });

        that.update = function (param, value) {
            if (that.model.hasOwnProperty(param)) {
                that.applier.requestChange(param, value);
            }
        };

        that.onNote = function (note) {
            var freq;
            if (typeof (note) === "object") {
                note = note[0].id;
            }
            freq = automm.midiToFreq(note, that.model.octaveNotes, that.model.afour, that.model.afourFreq);
            that.polysynth.noteOn(note, {"carrier.freq": freq});
        };

        that.afterNote = function (note) {
            if (typeof (note) === "object") {
                note = note[0].id;
            }
            if (!that.isShift) {
                that.polysynth.noteOff(note);
            }
        };

        that.onClick = function (note) {
            if (!that.model.arpActive) {
                that.onNote(note);
            }
        };

        that.afterClick = function (note) {
            if (!that.model.arpActive) {
                that.afterNote(note);
            }
        };
    };

    automm.oscillator.postInitFunction = function (that) {
        // That.update creates a function that takes a parameter from the model
        // and updates it's value
        //  the applier directly below adds a listener to all instances of the model chaning
        //  it then updates the synth accordingly
        /*jslint unparam: true*/
        that.applier.modelChanged.addListener("*", function (newModel, oldModel, changeSpec) {
            var path = changeSpec[0].path,
                oscPath = that.options.paramMap[path];
            that.polysynth.input(oscPath, newModel[path]);
        });
        /*jslint unparam: false*/
        flock.enviro.shared.play();
        that.events.onNote.addListener(that.onNote);
        that.events.afterNote.addListener(that.afterNote);
        that.events.onClick.addListener(that.onClick);
        that.events.afterClick.addListener(that.afterClick);
        that.events.afterInstrumentUpdate.addListener(that.update);
    };

    automm.midiToFreq = function (noteNum, octaveNotes, afour, afourFreq) {
        return Math.pow(2, ((noteNum - afour) / octaveNotes)) * afourFreq;
    };
}(jQuery));