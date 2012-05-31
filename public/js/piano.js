// I have no idea what I'm doing . gif

var piano_0_1 = piano_0_1 || {};

(function (piano) {
    var that = piano;
    that.note = 440;
    var toFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    
    var synth = flock.synth({
        ugen: "flock.ugen.sinOsc",
        freq: piano.note,
        mul: {
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
    console.log(piano.note);
    console.log(synth);
    noteOn = function (midinote, id){
        that.note = toFreq(midinote);
        console.log(that.note);
	};
    
    noteOff = function (midinote, id){
	};
})(piano_0_1);