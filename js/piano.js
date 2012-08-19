/*
Google Summer of Code 2012: Automagic Music Maker

Primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the Infusion framework and Flocking Library

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

*/

/*global jQuery, fluid, d3*/

var automm = automm || {};

(function () {
    "use strict";

    fluid.defaults("automm.piano", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.piano.preInitFunction",
        postInitFunction: "automm.piano.postInitFunction",

        model: {
            firstNote: 60, // Middle C
            octaves: 1,
            octaveNotes: 12,
            padding: 50,
            pattern: ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'],
            keys: {
                white: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow", notes: []},
                black: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow", notes: []}
            },
            viewBox: {
                width: null,
                height: null
            }
        },

        events: {
            afterUpdate: null,
            afterInstrumentUpdate: null,
            afterNoteCalc: null,
            getNoteCalc: null
        }
    });

    automm.piano.preInitFunction = function (that) {
        that.setup = function () {
            var i;
            that.model.keys.white.notes = [];
            that.model.keys.black.notes = [];

            for (i = that.model.firstNote; i < (that.model.firstNote + (that.model.octaves * that.model.octaveNotes)); i += 1) {
                that.model.keys[that.model.pattern[i % that.model.octaveNotes]].notes.push(i);
            }

            that.model.whiteNotes = that.model.keys.white.notes.length;
            that.model.blackNotes = that.model.keys.black.notes.length;

            that.updateValue("viewbox", {
                width: (that.model.keys.white.width * that.model.whiteNotes) + that.model.padding,
                height: that.model.keys.white.height + that.model.padding
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
            r.attr("role", "button");
            r.attr("aria-labelledby", "aria" + id);
            r.attr("noteType", noteType.fill);
        };

        // Automation of drawing all the keys on the canvas
        that.render = function () {
            var blackX = -(that.model.keys.black.width / 2),
                prevNote,
                blackCount = 0,
                i;

            if (that.model.keys.white.notes[0] > that.model.keys.black.notes[0]) {
                blackX = blackX - that.model.keys.white.width + (that.model.keys.black.width / 2);
            }
            // Draw White Keys
            for (i = 0; i < that.model.keys.white.notes.length; i += 1) {
                if (that.model.keys.white.notes[0] > that.model.keys.black.notes[0]) {
                    that.drawNote(that.model.keys.white, (i * that.model.keys.white.width) + that.model.keys.black.width / 2, 0, that.model.keys.white.notes[i]);
                } else {
                    that.drawNote(that.model.keys.white, i * that.model.keys.white.width, 0, that.model.keys.white.notes[i]);
                }
            }

            // Draw Black Keys
            for (i = that.model.firstNote; i < (that.model.octaves * that.model.octaveNotes) + that.model.firstNote; i += 1) {
                //get width going

                // If the current key in the pattern is black then draw it!
                if (that.model.pattern[i % that.model.octaveNotes] === "black") {
                    blackX = blackX + that.model.keys.white.width;
                    that.drawNote(that.model.keys.black, blackX, 0, that.model.keys.black.notes[blackCount]);
                    blackCount = blackCount + 1;
                }

                // If it is white, but the previous key was white, skip the key
                if (that.model.pattern[i % that.model.octaveNotes] === prevNote) {
                    blackX = blackX + that.model.keys.white.width;
                }

                // Keep track of previous key
                prevNote = that.model.pattern[i % that.model.octaveNotes];
            }
        };

        that.draw = function () {
            // Calculate it all
            that.setup();
            // Draw viewbox and subsequent group to draw keys into
            that.d3container = d3.select("#" + that.container.attr('id')).select('#piano');  // ??????
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
            that.noteGroup.attr("role", "controlgroup");
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
            that.container.children("#piano").empty();
            that.draw();
            // Fire event that piano is drawn
            that.events.afterUpdate.fire();
        };

        that.sendNoteCalc = function () {
            that.events.afterNoteCalc.fire(that.model.keys);
        };
    };

    automm.piano.postInitFunction = function (that) {
        var pianoElements = that.container.find("#piano").length;
        if (that.model.auto && pianoElements < 1) {
            that.container.append("<div id='piano'></div>");
            pianoElements = 1;
        }
        if (pianoElements > 0) {
            // Draw the svg
            that.draw();
            that.events.afterUpdate.fire();
            // Fire event that piano is drawn
            that.events.afterInstrumentUpdate.addListener(that.update);
            that.events.getNoteCalc.addListener(that.sendNoteCalc);
        }

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
    //         return "<" + that.model.shape +" style\"stoke: " + piano.model[that.model.keyType].stroke + "><" + that.model.shape + ">";
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

}());
