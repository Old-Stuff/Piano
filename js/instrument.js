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

var automm = automm || {};

(function ($, fluid) {
    fluid.defaults("automm.instrument", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.instrument.preInitFunction",
        postInitFunction: "automm.instrument.postInitFunction",
        
        model: {
            freq: 440,
            osc: "flock.ugen.sinOsc",
            attack: 0.25,
            sustain: 0.6,
            release: 0.5,
            gate: 0
        }
    });
    
    automm.instrument.preInitFunction = function(that) {
        that.bindEvents = function(){
            // Variables to keep track of currently pressed notes
            var lastClicked = {};
            var isClicking = false;
            
            // Get an Array of all notes on canvas
            that.notes = that.container.find(".note");
            
            // Iterate through each note
            that.notes.each(function(i,note){
                // Make sure the note element is set up properly
                note = $(note);
                
                // mousedown event binding
                note.mousedown(function(){
                    // For Keeping track
                    lastClicked = note;
                    isClicking = true;
                    
                    // noteOn function (fire event?) !!! that.noteOn(note[0].id);
                    
                    if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                        note.css('fill',keys.white.highlight);
                    }
                    else{
                        note.css('fill',keys.black.highlight);
                    }
                    
                });
                // mousup event binding
                note.mouseup(function(){
                    isClicking = false;
                    // that.noteOff(note[0].id);
                    if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                        note.css('fill',keys.white.fill);
                    }
                    else{
                        note.css('fill',keys.black.fill);
                    }
                    lastClicked = {};
                });
                // mouse hover event binding
                note.hover(function(){
                    if(isClicking){
                        // Turn off the last note played
                        // that.noteOff(lastClicked[0].id);
                        // Set its fill back to what it was before (This is the reason the css stuff was moved to note on / off)
                        // if($.inArray(parseInt(lastClicked[0].id), whiteNotes) != -1){
                        //     lastClicked.css('fill',keys.white.fill);
                        // }
                        // else{
                        //     lastClicked.css('fill',keys.black.fill);
                        // }
                        // Turn on  New Note
                        // that.noteOn(note[0].id);
                        lastClicked = note;
                        // if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                        //     note.css('fill',keys.white.highlight);
                        // }
                        // else{
                        //     note.css('fill',keys.black.highlight);
                        // }
                    }
                });
            });
        };
    };
    
    automm.instrument.postInitFunction = function(that) {
        that.bindEvents()
    };
})(jQuery, fluid_1_4);