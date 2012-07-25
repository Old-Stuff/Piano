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

(function ($) {
    "use strict";
    fluid.defaults("automm.gui", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
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
        };
        // that.bind = function () {
        //     that.datgui.octaves = that.datgui.add(instrument.model, 'octaves', 1, 5);
        //     that.datgui.firstNote = that.datgui.add(instrument.model, 'firstNote', 24, 84).step(1);
        // 
        //     // Folder for style
        //     that.datgui.style = that.datgui.addFolder('Style');
        //     that.datgui.padding = that.datgui.style.add(instrument.model, 'padding', 0, 200);
        // 
        //     // Do White Keys
        //     that.datgui.whiteKeys = that.datgui.style.addFolder('White Keys');
        //     that.datgui.whiteKeysFill = that.datgui.whiteKeys.addColor(instrument.model.keys.white, 'fill');
        //     that.datgui.whiteKeysStroke = that.datgui.whiteKeys.addColor(instrument.model.keys.white, 'stroke');
        //     that.datgui.whiteKeysHighlight = that.datgui.whiteKeys.addColor(instrument.model.keys.white, 'highlight');
        // 
        //     // Do Black Keys
        //     that.datgui.blackKeys = that.datgui.style.addFolder('Black Keys');
        //     that.datgui.blackKeysFill = that.datgui.blackKeys.addColor(instrument.model.keys.black, 'fill');
        //     that.datgui.blackKeysStroke = that.datgui.blackKeys.addColor(instrument.model.keys.black, 'stroke');
        //     that.datgui.blackKeysHighlight = that.datgui.blackKeys.addColor(instrument.model.keys.black, 'highlight');
        // };
    };

    automm.gui.postInitFunction = function (that) {
        if (that.container.children("#gui") !== []) {
            that.init();
        }
    };
}(jQuery));
