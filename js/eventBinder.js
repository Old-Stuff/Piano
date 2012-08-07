/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/
/*global jQuery, fluid, document, console*/

var automm = automm || {};

(function ($) {
    "use strict";
    fluid.defaults("automm.eventBinder", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.eventBinder.preInitFunction",
        postInitFunction: "automm.eventBinder.postInitFunction",

        model: {
            isShift: false
        },

        events: {
            afterUpdate: null,
            onNote: null,
            afterNote: null
        }

    });

    automm.eventBinder.preInitFunction = function (that) {
        that.bindEvents = function () {
            // Variables to keep track of currently pressed notes
            var lastClicked = {},
                isClicking = false;
            that.polyNotes = [];

            $(document).keydown(function (event) {
                if (event.shiftKey === true) {
                    that.model.isShift = true;
                }
            });
            $(document).keyup(function (event) {
                if (event.shiftKey === false && that.model.isShift) {
                    that.model.isShift = false;
                    that.afterShift();
                }
            });

            // Get an Array of all notes on canvas
            that.notes = that.container.find(".note");

            // Iterate through each note
            /*jslint unparam: true*/
            that.notes.each(function (i, note) {
                // Make sure the note element is set up properly
                note = $(note);
                // mousedown event binding
                note.bind('mousedown', function () {
                    // For Keeping track
                    lastClicked = note;
                    isClicking = true;
                    that.events.onNote.fire(note);
                });
                // mousup event binding
                note.bind('mouseup', function () {
                    isClicking = false;
                    if (!that.model.isShift) {
                        that.events.afterNote.fire(note);
                    }
                    lastClicked = {};
                });
                // mouse hover event binding
                note.bind('mouseover', function () {
                    if (isClicking) {
                        if (!that.model.isShift) {
                            that.events.afterNote.fire(lastClicked);
                        }
                        that.events.onNote.fire(note);
                    }
                    lastClicked = note;
                });

                note.on('tap', function (event) {
                    event.preventDefault();
                    
                    $("#push").prepend("Type: " + event.type + ", Fingers: " + event.touches.length + ", Direction: " + event.direction + "<br/>");
                });
            });
            /*jslint unparam: false*/
        };

        that.onNote = function (note) {
            if (that.model.isShift) {
                that.polyNotes[that.polyNotes.length] = note;
            }
        };

        that.afterShift = function () {
            /*jslint unparam: true*/
            fluid.each(that.polyNotes, function (note) {
                that.events.afterNote.fire(note);
            });
            that.polyNotes = [];
            /*jslint unparam: false*/
        };
    };

    automm.eventBinder.postInitFunction = function (that) {
        that.bindEvents();
        that.events.afterUpdate.addListener(that.bindEvents);
        that.events.onNote.addListener(that.onNote);
    };
}(jQuery));
