/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the grid directory. 

*/

/*global jQuery, fluid, d3*/

var automm = automm || {};

(function () {
    "use strict";

    fluid.defaults("automm.grid", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.grid.preInitFunction",
        postInitFunction: "automm.grid.postInitFunction",

        model: {
            auto: false,
            columns: 8,
            rows: 8,
            firstNote: 60, // Middle C
            octaves: 1,
            octaveNotes: 12,
            padding: 50,
            pattern: ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'],
            keys: {
                white: {width: 50, height: 50, stroke: "black", fill: "white", highlight: "yellow", notes: []},
                black: {width: 50, height: 50, stroke: "black", fill: "black", highlight: "yellow", notes: []}
            },
            viewBox: {
                height: null,
                width: null
            }
        },

        events: {
            afterUpdate: null,
            onNote: null,
            afterNote: null,
            afterInstrumentUpdate: null,
            afterNoteCalc: null,
            getNoteCalc: null
        }
    });

    automm.grid.preInitFunction = function (that) {
        that.setup = function () {
            var noteNum = that.model.firstNote,
                i;
            that.model.keys.white.notes = [];
            that.model.keys.black.notes = [];

            for (i = 0; i < (that.model.columns * that.model.rows); i += 1) {
                that.model.keys[that.model.pattern[i % that.model.octaveNotes]].notes.push(noteNum);
                noteNum += 1;
            }

            that.updateValue("viewbox", {
                width: (that.model.keys.white.width * that.model.columns) + that.model.padding,
                height: (that.model.keys.white.height * that.model.rows) + that.model.padding
            });

            // Calculate to create string neccesary to generate viewbox (should be in JSON?)
            that.model.viewbox.dim = "0 0 " + that.model.viewbox.width + " " + that.model.viewbox.height;
        };

        // Automation of drawing all the keys on the canvas
        that.drawNote = function (noteType, x, y, id) {
            var r = that.noteGroup.append("rect");
            r.style("stroke", noteType.stroke);
            r.style("fill", noteType.fill);
            r.attr("x", x);
            r.attr("y", y);
            r.attr("width", noteType.width);
            r.attr("height", noteType.height);
            r.attr("id", id);
            r.attr("class", "note");
            r.attr("noteType", noteType.fill);
        };

        that.calcNoteDim = function (noteType, noteNumber, dim) {
            var calculation = (noteNumber - that.model.firstNote);
            if (dim === "width") {
                calculation = calculation % that.model.columns;
            } else {
                calculation = Math.floor(calculation / that.model.columns);
            }
            calculation = calculation * noteType[dim];
            return (calculation);
        };

        // Automation of drawing all the keys on the canvas
        that.render = function () {
            var notePos = {},
                noteNum,
                i;

            for (i = 0; i < that.model.keys.white.notes.length; i += 1) {
                noteNum = that.model.keys.white.notes[i];
                notePos.width = that.calcNoteDim(that.model.keys.white, noteNum, "width");
                notePos.height = that.calcNoteDim(that.model.keys.white, noteNum, "height");
                that.drawNote(that.model.keys.white, notePos.width, notePos.height, noteNum);
            }
            for (i = 0; i < that.model.keys.black.notes.length; i += 1) {
                noteNum = that.model.keys.black.notes[i];
                notePos.width = that.calcNoteDim(that.model.keys.black, noteNum, "width");
                notePos.height = that.calcNoteDim(that.model.keys.black, noteNum, "height");
                that.drawNote(that.model.keys.black, notePos.width, notePos.height, noteNum);
            }

        };

        that.draw = function () {
            // Calculate it all
            that.setup();
            // Draw viewbox and subsequent group to draw keys into
            that.d3container = d3.select("#" + that.container.attr('id')).select('#grid');  // ??????
            var svg = that.d3container.append("svg");
            svg.attr("style", "height: 100%;");
            svg.attr("viewBox", that.model.viewbox.dim);
            svg.attr("role", "application");
            svg.attr("focusable", true);
            svg.attr("tabindex", "0");
            svg.attr("id", "viewBox");
            svg.attr("aria-labelledby", "ariaTitle");

            that.noteGroup = svg.append("g");
            that.noteGroup.attr("transform", "translate(" + that.model.padding / 2 + "," + that.model.padding / 2 + ")");
            that.noteGroup.attr("id", "noteGroup");
            that.noteGroup.attr("focusable", true);
            // Draw the keys
            that.render();

        };

        that.updateValue = function (param, value) {
            that.applier.requestChange(param, value);
        };

        that.update = function (param, value) {
            that.applier.requestChange(param, value);
            that.container.children("#grid").empty();
            that.draw();
            // Fire event that grid is drawn
            that.events.afterUpdate.fire();
        };

        that.sendNoteCalc = function () {
            that.events.afterNoteCalc.fire(that.model.keys);
        };
    };

    automm.grid.postInitFunction = function (that) {
        var gridElements = that.container.find("#grid").length;
        if (that.model.auto && gridElements < 1) {
            that.container.append("<div id='grid'></div>");
            gridElements = 1;
        }
        if (gridElements > 0) {
            // Draw the svg
            that.draw();
            that.events.afterUpdate.fire();
            // Fire event that grid is drawn
            that.events.onNote.addListener(that.onNote);
            // Bind functions to event listeners
            that.events.afterNote.addListener(that.afterNote);
            that.events.afterInstrumentUpdate.addListener(that.update);
            that.events.getNoteCalc.addListener(that.sendNoteCalc);
        }
    };
}());