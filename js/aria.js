/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/

/*global jQuery, fluid*/

var automm = automm || {};

(function ($) {
    "use strict";

    fluid.defaults("automm.aria", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.aria.preInitFunction",
        postInitFunction: "automm.aria.postInitFunction",

        model: {
            notes: ["C", "C-Sharp", "D", "D-Sharp", "E", "F", "F-Sharp", "G", "G-Sharp", "A", "A-Sharp", "B"],
            octaveNotes: 12,
            renderedNotes: []
        },

        events: {
            afterUpdate: null
        }
    });

    automm.aria.preInitFunction = function (that) {
        that.getNotes = function () {
            // Dump all notes within the container into an array
            that.model.renderedNotes = that.container.find(".note");

            // Iterate through the array and replace the notes with their id's a.k.a note numbers
            fluid.each(that.model.renderedNotes, function (note, i) {
                that.model.renderedNotes[i] = note.id;
            });

            // Sort that array
            that.model.renderedNotes.sort();

            // Iterate again, this time replace the id numbers with note names
            fluid.each(that.model.renderedNotes, function (note, i) {
                that.model.renderedNotes[i] = [note, that.model.notes[note % 12] + (Math.floor(note / 12) - 1)];
            });

        };

        that.render = function () {
            that.ariaContainer = $("#aria");
            if (that.ariaContainer.length < 1) {
                that.container.append("<div id='aria'><ul></ul></div>");
                that.ariaContainer = $("#aria").children();
            } else {
                that.ariaContainer.html('');
                that.ariaContainer.append('<ul></ul>');
            }
            fluid.each(that.model.renderedNotes, function (note) {
                that.ariaContainer.append("<li>" + note + "</li>");
            });
        };
        
        that.update = function () {
            that.getNotes();
            that.render();
        };
    };

    automm.aria.postInitFunction = function (that) {
        that.update();
        that.events.afterUpdate.addListener(that.update);
    };

}(jQuery));