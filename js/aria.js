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

    fluid.defaults("automm.aria", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.aria.preInitFunction",
        postInitFunction: "automm.aria.postInitFunction",

        model: {
            notes: ["C", "C-Sharp", "D", "D-Sharp", "E", "F", "F-Sharp", "G", "G-Sharp", "A", "A-Sharp", "B"],
            octaveNotes: 12,
            renderedNotes: [],
            playingNotes: []
        },

        events: {
            afterUpdate: null,
            onNote: null,
            afterNote: null
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
            // Append a div that will be used to title the aria application
            ariaContainer.append("<div id='ariaTitle'>The Automagic Music Maker</div>");
        };

        that.render = function () {
            // Find jquery for aria element
            var ariaContainer = that.container.find("#aria");
            // If that container does not exist, make it
            if (ariaContainer.length < 1) {
                that.container.append("<div id='aria' style='display:none;'><ul></ul></div>");
                ariaContainer = that.container.find("#aria").children();
            } else {
                // If it does exist empty it out and put an unordered list in it
                ariaContainer.empty();
                ariaContainer.append('<ul></ul>');
            }
            // For each note that has been rendered to the screen make a list element
            fluid.each(that.model.renderedNotes, function (note) {
                ariaContainer.append("<li id='aria" + note.number + "'>" + note.name + "</li>");
            });
            // Call the function to make the div used to title application
            that.setTitle();
        };

        that.onActivation = function (note) {
            // get the id of the current note and see if it is already playing
            var noteId = note.id,
                noteState = $.inArray(noteId, that.model.playingNotes);
            note = $(note);
            // If the note is in the playingNotes array, splice it out and fire afterNote
            if (noteState > -1) {
                that.model.playingNotes.splice(noteState, 1);
                that.events.afterNote.fire(note);
            // If it is not in the array, put it in there and fire onNote
            } else {
                that.model.playingNotes[that.model.playingNotes.length] = noteId;
                that.events.onNote.fire(note);
            }
        };

        that.escaped = function () {
            fluid.each(that.model.playingNotes, function (note, i) {
                note = that.container.find("#" + note);
                that.events.afterNote.fire(note);
            });
            that.model.playNotes = [];
        };

        that.bindEscape = function () {
            $(document).keydown(function (event) {
                if (event.keyCode === 27) {
                    that.escaped();
                }
            });
        };

        that.fluidInit = function () {
            // Find type of instrument that has been rendered
            var instrumentType = that.container.children().eq(0),
                // Create an array fille dwith objects stating note numbers and names of all rendered notes
                noteArray = $(automm.fetchNotes(that.container, that.model.renderedNotes));
            // Make the container tabbable
            instrumentType.fluid("tabbable");
            // Make the elements inside selectable
            instrumentType.fluid("selectable", {
                // the default orientation is vertical, so we need to specify that this is horizontal.
                // this affects what arrow keys will move selection
                direction: fluid.a11y.orientation.HORIZONTAL,
                selectableElements: noteArray,
                autoSelectFirstItem: false,

                onSelect: function (note) {
                    note.focus();
                }
            });
            // Set the handler to be used when notes are activated
            instrumentType.fluid("activatable", function (evt) {
                that.onActivation(evt.target);
            });
        };

        that.update = function () {
            that.getNotes();
            that.render();
            that.fluidInit();
            that.bindEscape();
        };
    };

    automm.aria.postInitFunction = function (that) {
        that.update();
        that.events.afterUpdate.addListener(that.update);
    };

    automm.fetchNotes = function (container, noteModel) {
        // take a container and model of renderedNotes, return an array of the elements of those notes
        return fluid.transform(noteModel, function (note) {
            var noteSelector = "#" + note.number;
            return container.find(noteSelector)[0];
        });
    };

}(jQuery));