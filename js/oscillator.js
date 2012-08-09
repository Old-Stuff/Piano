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
            freq: 440,
            osc: "flock.ugen.sinOsc",
            attack: 0.25,
            sustain: 0.6,
            release: 0.5,
            gate: 0,
            afour: 69,
            afourFreq: 440,
            octaveNotes: 12
        },

        events: {
            onNote: null,
            afterNote: null,
            afterInstrumentUpdate: null
        },
        // Maps parameter between this model and the model of flocking
        paramMap: {
            "freq": "carrier.freq",
            "attack": "asr.attack",
            "sustain": "asr.sustain",
            "release": "asr.release",
            "gate": "asr.gate"
        }
    });

    automm.oscillator.preInitFunction = function (that) {
        // Manually adjust buffer size on some platforms until
        // Flocking does this automatically.
        // See https://github.com/colinbdclark/Flocking/issues/21 for more details.
        var platform = navigator.platform || "";
        flock.enviro.shared = platform.indexOf("Linux") !== -1 ?
                flock.enviro({bufferSize: 2048}) : $.browser.mozilla && platform === "Win32" ?
                flock.enviro({bufferSize: 4096}) : flock.enviro.shared;

        that.osc = flock.synth({
            id: "carrier",
            ugen: that.model.osc,
            freq: that.model.freq,
            mul: {
                id: "asr",
                ugen: "flock.ugen.env.simpleASR",
                attack: that.model.attack,
                sustain: that.model.sustain,
                release: that.model.release
            }
        });
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
            that.osc.input(oscPath, newModel[path]);
        });
        /*jslint unparam: false*/
        that.update = function (param, value) {
            if (that.model.hasOwnProperty(param)) {
                that.applier.requestChange(param, value);
            }
        };

        that.onNote = function (note) {
            var freq = that.midiToFreq(note[0].id);
            that.update("freq", freq);
            that.update("gate", 1);
        };

        that.afterNote = function () {
            that.update("gate", 0);
        };

        that.midiToFreq = function (noteNum) {
            return Math.pow(2, ((noteNum - that.model.afour) / that.model.octaveNotes)) * that.model.afourFreq;
        };
        // flock.enviro.shared = flock.enviro({bufferSize: 4096})
        flock.enviro.shared.play();
        that.events.onNote.addListener(that.onNote);
        that.events.afterNote.addListener(that.afterNote);
        that.events.afterInstrumentUpdate.addListener(that.update);
    };
}(jQuery));