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
    fluid.defaults("automm.eventBinder", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        postInitFunction: "automm.eventBinder.postInitFunction",

        events: {
            afterUpdate: null,
            onNote: null,
            afterNote: null
        }

    });

    automm.eventBinder.postInitFunction = function (that) {
        that.bindEvents = function () {
            // Variables to keep track of currently pressed notes
            var lastClicked = {},
                isClicking = false;

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
                    that.events.onNote.fire(note);
                });
                // mousup event binding
                note.mouseup(function () {
                    isClicking = false;
                    that.events.afterNote.fire(note);
                    lastClicked = {};
                });
                // mouse hover event binding
                note.mouseover(function () {
                    if (isClicking) {
                        that.events.afterNote.fire(lastClicked);
                        that.events.onNote.fire(note);
                    }
                    lastClicked = note;
                });
            });
            /*jslint unparam: false*/
        };
        that.bindEvents();
        that.events.afterUpdate.addListener(that.bindEvents);
    };
}(jQuery));
