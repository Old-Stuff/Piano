/*
Copyright 2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

var automm = automm || {};

(function ($, fluid) {
    fluid.defaults("automm.oscillator", {
        gradeNames: ["fluid.modelComponent", "autoInit"],
        postInitFunction: "automm.oscillator.postInitFunction",
        
        model: {
            freq: 440,
            osc: "flock.ugen.sinOsc",
            attack: 0.25,
            sustain: 0.6,
            release: 0.5,
            gate: 0
        }
    });
    
    automm.oscillator.postInitFunction = function (that) {
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
        that.updateFreq = function (newFreq){
            that.applier.requestChange("freq", newFreq);
            that.osc.input("carrier.freq", newFreq);
        };
        
        // Not sure how to get this one to work just yet
        // that.updateOSC = function (newOSC){
        //     that.applier.requestChange("osc", newOSC);
        //     that.osc.input("carrier.ugen", newOSC);
        // };
        
        that.updateAttack = function (newAttack){
            that.applier.requestChange("attack", newAttack);
            that.osc.input("asr.attack", newAttack);
        };
        that.updateSustain = function (newSustain){
            that.applier.requestChange("sustain", newSustain);
            that.osc.input("asr.sustain", newSustain);
        };
        that.updateRelease = function (newRelease){
            that.applier.requestChange("release", newRelease);
            that.osc.input("asr.release", newRelease);
        };
        that.updateGate = function (newGate){
            that.applier.requestChange("gate", newGate);
            that.osc.input("asr.gate", newGate);
        };  
        
        flock.enviro.shared.play();
        console.log("it's alive");      
    };
    
})(jQuery, fluid_1_4);