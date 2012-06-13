var automm = automm || {};

(function ($) {
    automm.synth = function(){
        var that = {};
        that.synth = flock.synth({
            id: "carrier",
            ugen: "flock.ugen.sinOsc",
            freq: 440,
            mul: {
                id: "asr",
                ugen: "flock.ugen.env.simpleASR",
                attack: 0.25,
                sustain: 0.6,
                release: 0.5
            }
        });
    };
}(jQuery));