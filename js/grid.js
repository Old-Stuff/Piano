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

/*global jQuery, fluid, d3*/

var automm = automm || {};

(function ($) {
    "use strict";

    fluid.defaults("automm.grid", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.grid.preInitFunction",
        postInitFunction: "automm.grid.postInitFunction",

        model: {
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
            }
        },

        events: {
            afterUpdate: null,
            onNote: null,
            afterNote: null,
            afterInstrumentUpdate: null
        },

        components: {
            eventBinder: {
                type: "automm.eventBinder",
                container: "{grid}.container",
                options: {
                    events: {
                        afterUpdate: "{grid}.events.afterUpdate",
                        onNote: "{grid}.events.onNote",
                        afterNote: "{grid}.events.afterNote"
                    }
                }
            }
        }
    });

    automm.grid.preInitFunction = function (that) {
        that.setup = function () {
            var i;
            that.model.keys.white.notes = [];
            that.model.keys.black.notes = [];

            for (i = that.model.firstNote; i < (that.model.firstNote + (that.model.octaves * that.model.octaveNotes)); i += 1) {
                that.model.keys[that.model.pattern[i % that.model.octaveNotes]].notes.push(i);
            }

            that.model.viewbox = {
                width: (that.model.keys.white.width * that.model.columns) + that.model.padding,
                height: (that.model.keys.white.height * that.model.rows) + that.model.padding
            };

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
            r.attr("data-role", "button");
            r.attr("noteType", noteType.fill);
        };
        
        that.calcNoteDim = function (noteType, noteNumber, dim) {
            return (((noteNumber - that.model.firstNote) % that.model.columns) * noteType[dim]);
        };

        // Automation of drawing all the keys on the canvas
        that.render = function () {
            var notePos = {},
                noteNum,
                i;
            
            for (i = 0; i < that.model.keys.white.notes.length; i += 1) {
                noteNum = that.model.keys.white.notes[i];
                notePos.width = that.calcNoteDim("white", noteNum, "width");
                notePos.height = that.calcNoteDim("white", noteNum, "height");
                that.drawNote(that.model.keys.white, notePos.width, notePos.height, noteNum);
            }
            for (i = 0; i < that.model.keys.black.notes.length; i += 1) {
                noteNum = that.model.keys.black.notes[i];
                notePos.width = that.calcNoteDim("black", noteNum, "width");
                notePos.height = that.calcNoteDim("black", noteNum, "height");
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

            that.noteGroup = svg.append("g");
            that.noteGroup.attr("transform", "translate(" + that.model.padding / 2 + "," + that.model.padding / 2 + ")");
            that.noteGroup.attr("data-role", "controlgroup");

            // Draw the keys
            that.render();
        };

        that.update = function (param, value) {
            that.applier.requestChange(param, value);
            that.container.children("#grid").html('');  // Look into jquery clear
            that.draw();
            // Fire event that grid is drawn
            that.events.afterUpdate.fire();
        };

        that.onNote = function (note) {
            if ($.inArray(parseInt(note[0].id, 10), that.model.keys.white.notes) !== -1) {
                note.css('fill', that.model.keys.white.highlight);
            } else {
                note.css('fill', that.model.keys.black.highlight);
            }
        };

        that.afterNote = function (note) {
            if ($.inArray(parseInt(note[0].id, 10), that.model.keys.white.notes) !== -1) {
                note.css('fill', that.model.keys.white.fill);
            } else {
                note.css('fill', that.model.keys.black.fill);
            }
        };

    };

    automm.grid.postInitFunction = function (that) {
        // Draw the svg
        that.draw();
        that.events.afterUpdate.fire();
        // Fire event that grid is drawn
        that.events.onNote.addListener(that.onNote);
        that.events.afterNote.addListener(that.afterNote);
        that.events.afterInstrumentUpdate.addListener(that.update);
    };

    // fluid.defaults("automm.key", {
    //     gradeNames: ["fluid.modelComponent", "autoInit"],
    //     postInitFunction: "automm.key.postInitFunction",
    //         
    //     model: {
    //         x: 0,
    //         y: 0,
    //         id: 60,
    //         cssclass: "note",
    //         shape: "rect",
    //         keyType: "keyOne"
    //     }
    // });
    //     
    // automm.key.postInitFunction = function (that){
    //     that.html = function (){
    //         return "<" + that.model.shape +" style\"stoke: " + grid.model[that.model.keyType].stroke + "><" + that.model.shape + ">";
    //     };
    // };


    // fluid.defaults("automm.viewBox", {
    //     gradeNames: ["fluid.modelComponent", "autoInit"],
    //     postInitFunction: "automm.viewBox.postInitFunction",
    //     
    //     model: {
    //         width: 600,
    //         height: 200
    //     }
    // });
    // 
    // automm.viewBox.postInitFunction = function (that){
    //     that.html = function(){
    //         return ["<svg viewbox=\"0 0 " + that.model.width + " " + that.model.height + "\" id=\"viewbox\">", "</svg>"];
    //     }
    // };

}(jQuery));