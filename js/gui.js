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
/*global jQuery, fluid, dat */

var automm = automm || {};

(function () {
    "use strict";
    fluid.defaults("automm.gui", {
        gradeNames: ["fluid.viewComponent", "autoInit"],

        model: {
            drawGui: false,
            afour: 69,     // The note number of A4... this could probably be calculate based on all the other stuff (probably should be)
            afourFreq: 440, // Standard freq for A4, used to calculate all other notes
            firstNote: 60, // Middle C
            octaves: 1,
            octaveNotes: 12,
            padding: 0,
            pattern: ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'],
            keys: {
                white: {
                    fill: '#fff000',
                    stroke: '#000000',
                    highlight: '#ffffff'
                },
                black: {
                    fill: '#ffa400',
                    stroke: '#000000',
                    highlight: '#000000'
                }
            }
        },

        events: {
            afterGuiUpdate: null
        },

        preInitFunction: "automm.gui.preInitFunction",
        postInitFunction: "automm.gui.postInitFunction"
    });

    automm.gui.preInitFunction = function (that) {
        that.init = function () {
            that.datgui = new dat.GUI({ autoPlace: false });
            that.customContainer = that.container.children('#gui');
            that.datgui.close();
            that.customContainer.append(that.datgui.domElement);
            that.customContainer.attr('align', 'center').children().attr('align', 'left');

            that.datgui.octaves = that.datgui.add(that.model, 'octaves', 1, 5);
            that.datgui.firstNote = that.datgui.add(that.model, 'firstNote', 24, 84).step(1);

            // Folder for style
            that.datgui.style = that.datgui.addFolder('Style');
            that.datgui.padding = that.datgui.style.add(that.model, 'padding', 0, 200);

            // Do White Keys
            that.datgui.whiteKeys = that.datgui.style.addFolder('White Keys');
            that.datgui.whiteKeysFill = that.datgui.whiteKeys.addColor(that.model.keys.white, 'fill');
            that.datgui.whiteKeysStroke = that.datgui.whiteKeys.addColor(that.model.keys.white, 'stroke');
            that.datgui.whiteKeysHighlight = that.datgui.whiteKeys.addColor(that.model.keys.white, 'highlight');

            // Do Black Keys
            that.datgui.blackKeys = that.datgui.style.addFolder('Black Keys');
            that.datgui.blackKeysFill = that.datgui.blackKeys.addColor(that.model.keys.black, 'fill');
            that.datgui.blackKeysStroke = that.datgui.blackKeys.addColor(that.model.keys.black, 'stroke');
            that.datgui.blackKeysHighlight = that.datgui.blackKeys.addColor(that.model.keys.black, 'highlight');

            // Events ~ should be bubbled or at least done cleaner... this is so bad :(
            that.datgui.octaves.onChange(function (value) {
                that.update("octaves", value);
            });
            that.datgui.firstNote.onChange(function (value) {
                that.update("firstNote", value);
            });
            that.datgui.padding.onChange(function (value) {
                that.update("padding", value);
            });
            that.datgui.whiteKeysFill.onChange(function (value) {
                that.update("keys.white.fill", value);
            });
            that.datgui.whiteKeysStroke.onChange(function (value) {
                that.update("keys.white.stroke", value);
            });
            that.datgui.whiteKeysHighlight.onChange(function (value) {
                that.update("keys.white.highlight", value);
            });
            that.datgui.blackKeysFill.onChange(function (value) {
                that.update("keys.black.fill", value);
            });
            that.datgui.blackKeysStroke.onChange(function (value) {
                that.update("keys.black.stroke", value);
            });
            that.datgui.blackKeysHighlight.onChange(function (value) {
                that.update("keys.black.highlight", value);
            });

        };

        // Not sure if I should even bother with this
        // that.addControl = function (param) {
        //     that.datgui[param] = that.datgui[param] || that.datgui.add(that.model, param, 1, 5);
        // };
        // that.addFolder = function (name) {
        //     
        // };
        // that.appendFolder = function (name) {
        //     
        // }

        that.update = function (param, value) {
            that.applier.requestChange(param, value);
            that.events.afterGuiUpdate.fire(param, value);
            return that;
        };
    };

    automm.gui.postInitFunction = function (that) {
        var emptyArray = [];
        if (that.container.find("#gui") !== emptyArray) {
            that.init();
        }
    };
}());
