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
            },
            arpActive: false
        },

        events: {
            getNoteCalc: null,
            onNote: null,
            afterNote: null,
            afterNoteCalc: null,
            onSelect: null
        }
    });

    automm.highlighter.preInitFunction = function (that) {
        that.currentlySelected = null;
        that.currentlyPlaying = [];

        that.afterNoteCalc = function (newKeys) {
            that.model.keys = newKeys;
        };

        that.onNote = function (note) {
            note = automm.numberToNote(note, that.container);
            automm.updateCssFill(note, 'highlight', that.model.keys);
            that.currentlyPlaying.push(note[0].id);
        };

        that.afterNote = function (note) {
            var playPosition;
            note = automm.numberToNote(note, that.container);
            playPosition = automm.isCurrentlyPlaying(note[0].id, that.currentlyPlaying);
            if (note[0] === that.currentlySelected[0]) {
                automm.updateCssFill(note, 'selected', that.model.keys);
            } else {
                automm.updateCssFill(note, 'fill', that.model.keys);
            }
            that.currentlyPlaying.splice(playPosition, 1);
        };

        that.onClick = function (note) {
            if (!that.model.arpActive) {
                that.onNote(note);
            }
        };

        that.afterClick = function (note) {
            if (!that.model.arpActive) {
                that.afterNote(note);
            }
        };

        that.onSelect = function (note) {
            var prevPlaying;
            note = automm.numberToNote(note, that.container);
            if (that.currentlySelected !== null) {
                prevPlaying = automm.isCurrentlyPlaying(that.currentlySelected[0].id, that.currentlyPlaying);
                if (prevPlaying === -1) {
                    automm.updateCssFill(that.currentlySelected, 'fill', that.model.keys);
                } else {
                    automm.updateCssFill(that.currentlySelected, 'highlight', that.model.keys);
                }
            }
            automm.updateCssFill(note, 'selected', that.model.keys);
            that.currentlySelected = note;
        };
    };

    automm.highlighter.postInitFunction = function (that) {
        that.events.onNote.addListener(that.onNote);
        that.events.afterNote.addListener(that.afterNote);
        that.events.afterNoteCalc.addListener(that.afterNoteCalc);
        that.events.onClick.addListener(that.onClick);
        that.events.afterClick.addListener(that.afterClick);
        that.events.onSelect.addListener(that.onSelect);
        that.events.getNoteCalc.fire();
    };

    automm.numberToNote = function (note, container) {
        if (typeof (note) === "number") {
            note = container.find("#" + note);
        }
        note = $(note);
        return note;
    };

    automm.updateCssFill = function (note, attribute, keys) {
        if ($.inArray(parseInt(note[0].id, 10), keys.white.notes) !== -1) {
            note.css("fill", keys.white[attribute]);
        } else {
            note.css("fill", keys.black[attribute]);
        }
    };

    automm.isCurrentlyPlaying = function (note, currentlyPlaying) {
        var isPlaying = $.inArray(note, currentlyPlaying);
        return isPlaying;
    };
    
}(jQuery));