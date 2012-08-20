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
            onClick: null,
            afterClick: null,
            onSelect: null
        }
    });

    automm.aria.preInitFunction = function (that) {
        that.currentlySelected = null;

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
            var ariaContainer = that.container.find("#aria"),
                instrumentType = that.container.children()[0].id;
            // Append a div that will be used to title the aria application
            ariaContainer.append("<div id='ariaTitle'>AutoMM " + that.container[0].id + " type: " + instrumentType + "</div>");
        };

        that.setDescription = function () {
            var ariaContainer = that.container.find("#aria"),
                instrumentType = that.container.children()[0].id;
            ariaContainer.append("<div id='ariaDescription'>Welcome to the Automagic Music Maker "
                + "Within this application you will find a " + instrumentType + " in which you can interact with.  "
                + "The " + instrumentType + " has " + that.model.renderedNotes.length + " notes "
                + "starting with " + that.model.renderedNotes[0].name + " and ending with "
                + that.model.renderedNotes[that.model.renderedNotes.length - 1].name
                + " you can use the left and right keys to move between notes, and press the space bar to activate them. "
                + "You can deactivate individual notes by pressing spacebar a second time while it is selected. "
                + "If you find that you have too many notes playing at a time, you can stop them all by hitting escape. "
                + "The application also has an arpeggiator, which plays note patterns based on the first note you press. "
                + "To enable the arpeggiator, press alt at any time. "
                + "This application does not follow aria standards, and you will not hear any notification of where your "
                + "current selection is, but don't fret, this was a design choice. It was found to be too distracting to "
                + "play the piano while having your screen reader constantly yelling over top. "
                + "I plan to add keyboard bindings in the near future, this should make the application much more pleasurable "
                + "to interact with.  If you have any question or suggestions please email me at myles DOT borins AT gmail DOT"
                + " com or tweet me @the_alpha_nerd" + "<div>");
        };

        that.render = function () {
            // Find jquery for aria element
            var ariaContainer = that.container.find("#aria");
            // If that container does not exist, make it
            if (ariaContainer.length < 1) {
                that.container.append("<div id='aria' style='display:none;'></div>");
            }
            ariaContainer.empty();
            // Call the function to make the div used to title application
            that.setTitle();
            that.setDescription();
        };

        // The Below function is called when spacebar is hit on a selected Note
        // It fires onClick and afterClick events depending on if a note is currently playing
        that.onActivation = function (note) {
            // get the id of the current note and see if it is already playing
            var noteId = note.id,
                noteState = $.inArray(noteId, that.model.playingNotes);
            note = $(note);
            // If the note is in the playingNotes array, splice it out and fire afterClick
            if (noteState > -1) {
                that.model.playingNotes.splice(noteState, 1);
                that.events.afterClick.fire(note);
            // If it is not in the array, put it in there and fire onClick
            } else {
                that.model.playingNotes[that.model.playingNotes.length] = noteId;
                that.events.onClick.fire(note);
            }
        };

        // The below function is ran when the escape button is hit
        // It stops all currently playing notes
        // Perhaps this should be moved into the oscillator
        that.escaped = function () {
            fluid.each(that.model.playingNotes, function (note) {
                note = that.container.find("#" + note);
                that.events.afterClick.fire(note);
            });
            that.model.playingNotes = [];
        };

        // Binds the escape key to that.escaped
        that.bindEscape = function () {
            $(document).keydown(function (event) {
                if (event.keyCode === 27) {
                    that.escaped();
                }
            });
        };

        // This function intializes a container to be selectable
        // and traversable using the arrow keys
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
                    that.currentlySelected = note;
                    that.events.onSelect.fire(note);
                }
            });
            // Set the handler to be used when notes are activated
            /*jslint unparam: true*/
            instrumentType.fluid("activatable", function (evt) {
                that.onActivation(that.currentlySelected);
            });
            /*jslint unparam: false*/
        };

        that.update = function () {
            that.getNotes();
            that.render();
            that.fluidInit();   // Take the instrument container, make it both tabbable and able to be traverse with keys
        };
    };

    automm.aria.postInitFunction = function (that) {
        that.bindEscape();
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