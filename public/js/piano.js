// I have no idea what I'm doing . gif

var piano_0_1 = piano_0_1 || {};

(function (piano) {
    var note = 440;
    var toFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    
    var synth = flock.synth({
        ugen: "flock.ugen.sinOsc",
        freq: note,
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
    noteOn = function (midinote, id){
        console.log(synth.freq);
        
	};
    
    noteOff = function (midinote, id){
        // flock.enviro.shared.stop();
	};
})(piano_0_1);