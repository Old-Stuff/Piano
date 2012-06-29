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
/*global jQuery, fluid, */

var automm = automm || {};

(function ($) {
    "use strict";
    fluid.defaults("automm.instrument", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        postInitFunction: "automm.instrument.postInitFunction",
        
        events: {
            onNote: null,
            afterNote: null
        },
        
        components: {
            piano: {
                type: "automm.piano",
                container: "{instrument}.container",
                options: {
                    model: {
                        firstNote: "{instrument}.model.firstNote",
                        octaves: 2,
                        keys: {
                            white: {
                                fill: "yellow",
                                highlight: "black"
                            },
                            black: {
                                fill: "orange",
                                highlight: "white"
                            }
                        }
                    },
                    listeners: {
                        afterUpdate: "{instrument}.bindEvents"
                    }
                }
            },
            
            oscillator: {
                type: "automm.oscillator",
                options: {
                    listeners: {
                        
                    }
                }
            }
        }
    });
    
    automm.instrument.postInitFunction = function(that) {
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
                    
                    that.events.onNote.fire(note);                    
                    
                    // noteOn function (fire event?) !!! that.noteOn(note[0].id);
                    // if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                    //                        note.css('fill',keys.white.highlight);
                    //                    }
                    //                    else{
                    //                        note.css('fill',keys.black.highlight);
                    //                    }
                    
                });
                // mousup event binding
                note.mouseup(function(){
                    isClicking = false;
                    // that.noteOff(note[0].id);
                    // if($.inArray(parseInt(note[0].id), whiteNotes) != -1){
                    //                         note.css('fill',keys.white.fill);
                    //                     }
                    //                     else{
                    //                         note.css('fill',keys.black.fill);
                    //                     }
                    lastClicked = {};
                });
                // mouse hover event binding
                note.hover(function(){
                    if(isClicking){
                        // Turn off the last note played
                        // Set its fill back to what it was before (This is the reason the css stuff was moved to note on / off)
                        // Turn on  New Note
                        
                    }
                });
            });
            // that.events.onNote.addListener("that.piano.noteOn");
        };
    };
}(jQuery));