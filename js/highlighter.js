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

    fluid.defaults("automm.highlighter", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.highlighter.preInitFunction",
        postInitFunction: "automm.highlighter.postInitFunction",

        model: {
            keys: {
                white: {width: 50, height: 50, stroke: "black", fill: "white", highlight: "yellow", notes: []},
                black: {width: 50, height: 50, stroke: "black", fill: "black", highlight: "yellow", notes: []}
            }
        },

        events: {
            getNoteCalc: null,
            onNote: null,
            afterNote: null,
            afterNoteCalc: null
        }
    });

    automm.highlighter.preInitFunction = function (that) {

        that.afterNoteCalc = function (newKeys) {
            that.model.keys = newKeys;
        };

        that.onNote = function (note) {
            if (typeof (note) === "number") {
                note = that.container.find("#" + note);
            }
            // console.log(note);
            if ($.inArray(parseInt(note[0].id, 10), that.model.keys.white.notes) !== -1) {
                note.css('fill', that.model.keys.white.highlight);
            } else {
                note.css('fill', that.model.keys.black.highlight);
            }
        };

        that.afterNote = function (note) {
            if (typeof (note) === "number") {
                note = that.container.find("#" + note);
            }
            if ($.inArray(parseInt(note[0].id, 10), that.model.keys.white.notes) !== -1) {
                note.css('fill', that.model.keys.white.fill);
            } else {
                note.css('fill', that.model.keys.black.fill);
            }
        };

    };

    automm.highlighter.postInitFunction = function (that) {
        that.events.onNote.addListener(that.onNote);
        that.events.afterNote.addListener(that.afterNote);
        that.events.afterNoteCalc.addListener(that.afterNoteCalc);
        that.events.getNoteCalc.fire();
    };

}(jQuery));