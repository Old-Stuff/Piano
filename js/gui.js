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
        postInitFunction: "automm.gui.postInitFunction",
        preInitFunction: "automm.gui.preInitFunction"
    });

    automm.eventBinder.preInitFunction = function (that) {
        that.model.datgui = new dat.GUI({ autoPlace: false }),
        that.model.customContainer = that.container.children('#gui');
        that.model.datgui.close();
        that.model.customContainer.append(gui.domElement);
        that.model.customContainer.attr('align', 'center').children().attr('align', 'left');
    };

    automm.eventBinder.postInitFunction = function (that) {
        that.model.datgui.octaves = gui.add(instrument.model, 'octaves', 1, 5);
        that.model.datgui.firstNote = gui.add(instrument.model, 'firstNote', 24, 84).step(1);
        
        // Folder for style
        that.model.datgui.style = gui.addFolder('Style');
        that.model.datgui.padding = that.model.datgui.style.add(instrument.model, 'padding', 0, 200);
        
        // Do White Keys
        that.model.datgui.whiteKeys = that.model.datgui.style.addFolder('White Keys');
        that.model.datgui.whiteKeysFill = that.model.datgui.whiteKeys.addColor(instrument.model.keys.white, 'fill');
        that.model.datgui.whiteKeysStroke = that.model.datgui.whiteKeys.addColor(instrument.model.keys.white, 'stroke');
        that.model.datgui.whiteKeysHighlight = that.model.datgui.whiteKeys.addColor(instrument.model.keys.white, 'highlight');
        
        // Do Black Keys
        that.model.datgui.blackKeys = that.model.datgui.style.addFolder('Black Keys');
        that.model.datgui.blackKeysFill = that.model.datgui.blackKeys.addColor(instrument.model.keys.black, 'fill');
        that.model.datgui.blackKeysStroke = that.model.datgui.blackKeys.addColor(instrument.model.keys.black, 'stroke');
        that.model.datgui.blackKeysHighlight = that.model.datgui.blackKeys.addColor(instrument.model.keys.black, 'highlight');
        
        
        // Events ~ should be bubbled or at least done cleaner... this is so bad :(
        that.model.datgui.octaves.onChange(function(value){
            {piano}.update("octaves",value);
        });
        that.model.datgui.firstNote.onChange(function(value){
            instrument.update("firstNote",value);
        });
        that.model.datgui.padding.onChange(function(value){
            instrument.update("padding",value);
        });
        that.model.datgui.whiteKeysFill.onChange(function(value){
            instrument.update("keys.white.fill",value);
        });
        that.model.datgui.whiteKeysStroke.onChange(function(value){
            instrument.update("keys.white.stroke",value);
        });
        that.model.datgui.whiteKeysHighlight.onChange(function(value){
            instrument.update("keys.white.highlight",value);
        });
        that.model.datgui.blackKeysFill.onChange(function(value){
            instrument.update("keys.black.fill",value);
        });
        that.model.datgui.blackKeysStroke.onChange(function(value){
            instrument.update("keys.black.stroke",value);
        });
        that.model.datgui.blackKeysHighlight.onChange(function(value){
            instrument.update("keys.black.highlight",value);
        });
    };
}(jQuery));
