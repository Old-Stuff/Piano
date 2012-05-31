// I have no idea what I'm doing . gif

var piano = piano || {};

(function ($, piano) {
    var that = piano;
    that.note = 440;
    var toFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    that.synth = flock.synth({
        id: "carrier",
        ugen: "flock.ugen.sinOsc",
        freq: piano.note,
        mul: {
            id: "asr",
            ugen: "flock.ugen.env.simpleASR",
            attack: 0.25,
            sustain: 0.6,
            release: 0.5,
            gate: {
                ugen: "flock.ugen.mouse.click"
            }
        }
    });
    flock.enviro.shared.play();
    noteOn = function (midinote, id){
        that.note = toFreq(midinote);
	};
    
    noteOff = function (midinote, id){
        that.note = null;
	};
})(jQuery, piano);