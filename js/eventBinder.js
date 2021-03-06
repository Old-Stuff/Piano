/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/
/*global jQuery, fluid, document*/

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
            afterClick: null,
            onClick: null
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
                note.mousedown(function () {
                    // For Keeping track
                    lastClicked = note;
                    isClicking = true;
                    that.onClick(note);
                });
                // mousup event binding
                note.mouseup(function () {
                    isClicking = false;
                    if (!that.model.isShift) {
                        that.events.afterClick.fire(note);
                    }
                    lastClicked = {};
                });
                // mouse hover event binding
                note.mouseover(function () {
                    if (isClicking) {
                        if (!that.model.isShift) {
                            that.events.afterClick.fire(lastClicked);
                        }
                        that.onClick(note);
                    }
                    lastClicked = note;
                });
            });
            /*jslint unparam: false*/
        };

        that.onClick = function (note) {
            var inArray = $.inArray(note, that.polyNotes);
            if (that.model.isShift) {
                if (inArray >= 0) {
                    that.events.afterClick.fire(note);
                    that.polyNotes.splice(inArray, 1);
                    return that;
                } else {
                    that.polyNotes[that.polyNotes.length] = note;
                }
            }
            that.events.onClick.fire(note);
        };

        that.afterShift = function () {
            /*jslint unparam: true*/
            fluid.each(that.polyNotes, function (note) {
                that.events.afterClick.fire(note);
            });
            that.polyNotes = [];
            /*jslint unparam: false*/
        };
    };

    automm.eventBinder.postInitFunction = function (that) {
        that.bindEvents();
        that.events.afterUpdate.addListener(that.bindEvents);
    };
}(jQuery));
