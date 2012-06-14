var automm = automm || {};

(function ($) {
    automm.midiToFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    
    automm.synth = function(container){
        var that = {};
        that.container = $(container);
        that.svg = d3.select(container)
        
        // Initializae key values ~ These should be coming in via JSON
        var firstNote = 60;         // Note Number of first key drawn
        var octaves = 2;             // Number of Octaves to Draw
        var octaveNotes = 12;       // Number of notes per octave
        var afour = 69;             // Note Number of A4
        var afourFreq = 440;        // Frequency of A4
        
        // Store variable to be used for drawing
        // Stores width and height of both white and black notes as well as fill colour and highlight colour
        // This too should be coming in via json
        var keys = {
            white: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow", notes: []},
            black: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow", notes: []}
        };
        
        // Pattern of how keys should be drawn
        var pattern = ['white','black','white','black','white','white','black','white','black','white','black','white'];
        
        // Assign Specific Notes to key Based on Pattern
        // Assuming that info is coming in via JSON these three lines could be executed outside of this code
        // JSON could serve the keys object complete with all notes already in there
        for (i = firstNote; i < (firstNote + (octaves * octaveNotes)); i+=1){
            keys[pattern[i % octaveNotes]].notes.push(i);
        }
        
        // Perhaps these would be better as part of the keys object, but for not this was a bit cleaner
        var whiteNotes = keys.white.notes;
        var blackNotes = keys.black.notes;
        
        that.noteOn = function(midinote){
            var freq = automm.midiToFreq(midinote);
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
                    that.noteOn(note[0].id);
                    note.css('fill', 'yellow');
                });
                note.mouseup(function(){
                    that.noteOff(note[0].id);
                    if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                        note.css('fill','white');
                    }
                    else{
                        note.css('fill','black');
                    }
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
}(jQuery));
