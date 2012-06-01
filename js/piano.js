// I have no idea what I'm doing . gif
// Starting to figure it out though yipee

var myles = myles || {};

(function ($) {
    myles.midiToFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    myles.piano = function (container){
        var that = {};
        that.container = $(container);
        that.svg = that.container.svg()
        that.keys = {
            white: [60,62,64,65,67,69,71],
            black: [61,63,66,68,70]
        };
        // console.log(that.keys);
        that.noteOn = function(midinote){
            var freq = myles.midiToFreq(midinote);
            that.synth.input("carrier.freq", freq);
            that.synth.input("asr.gate", 1.0);
        };
        that.noteOff = function(midinote){
            that.synth.input("asr.gate", 0.0);
        };
        that.bindEvents = function(){
            that.notes = that.container.find(".note");
            that.notes.each(function(i,note){
                note = $(note);
                note.mousedown(function(){
                    note.css('fill', 'yellow');
                    that.noteOn(note[0].id);
                });
                note.mouseup(function(){
                    if($.inArray(parseInt(note[0].id), that.keys.white) != -1){
                        note.css('fill', 'white');
                    }
                    else{
                        note.css('fill', 'black');
                    }
                    that.noteOff(note[0].id);
                });
            });
        };
        that.init = function(){
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
            that.bindEvents();
            flock.enviro.shared.play();
        };
        that.init();
        return that;
    };
})(jQuery);