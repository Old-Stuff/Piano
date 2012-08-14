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
            var domNotes = that.container.find(".note");

            // Iterate through the array and replace the notes with their id's a.k.a note numbers
            fluid.each(domNotes, function (note, i) {
                that.model.renderedNotes[i] = note.id;
            });

            // Sort that array
            that.model.renderedNotes.sort();

            // Iterate again, this time replace the id numbers with note names
            fluid.each(that.model.renderedNotes, function (note, i) {
                that.model.renderedNotes[i] = {"number": note, "name": (that.model.notes[note % 12] + (Math.floor(note / 12) - 1))};
            });

        };

        that.setTitle = function () {
            var ariaContainer = that.container.find("#aria");
            ariaContainer.append("<div id='ariaTitle'>The Automagic Music Maker</div>");
        };

        that.render = function () {
            var ariaContainer = that.container.find("#aria");
            if (ariaContainer.length < 1) {
                that.container.append("<div id='aria' style='display:none;'><ul></ul></div>");
                ariaContainer = that.container.find("#aria").children();
            } else {
                ariaContainer.empty();
                ariaContainer.append('<ul></ul>');
            }
            fluid.each(that.model.renderedNotes, function (note) {
                ariaContainer.append("<li id='aria" + note.number + "'>" + note.name + "</li>");
            });
            that.setTitle();
        };

        // that.noteArray = function () {
        //     fluid.each(that.model.renderedNotes, function (note, i) {
        //         that.model.noteArray[i] = that.container.find("#" + note.number);
        //     });
        //     that.model.noteArray = $(that.model.noteArray);
        // };

        that.fluidInit = function () {
            var instrumentType = that.container.children().eq(0),
                noteArray = $(automm.fetchNotes(that.container, that.model.renderedNotes));
            instrumentType.fluid("tabbable");
            instrumentType.fluid("selectable", {
                // the default orientation is vertical, so we need to specify that this is horizontal.
                // this affects what arrow keys will move selection
                direction: fluid.a11y.orientation.HORIZONTAL,
                selectableElements: noteArray,

                onSelect: function (note) {
                    console.log(note);
                }
                // onUnselect: function (thumbEl) {
                //     $(thumbEl).removeClass(demo.imageViewer.styles.selected);
                // }
            });
        };

        that.update = function () {
            that.getNotes();
            that.render();
            that.fluidInit();
        };
    };

    automm.aria.postInitFunction = function (that) {
        that.update();
        that.events.afterUpdate.addListener(that.update);
    };

    automm.fetchNotes = function (container, noteModel) {
        return fluid.transform(noteModel, function (note) {
            var noteSelector = "#" + note.number;
            return container.find(noteSelector)[0];
        });
    };

}(jQuery));