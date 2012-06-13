var automm = automm || {};

(function ($) {
    automm.midiToFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    automm.piano = function (container){
        var that = {};
        // Initializae values
        var firstNote = 60;         // Note Number of first key drawn
        var octaves = 1;             // Number of Octaves to Draw
        var octaveNotes = 12;       // Number of notes per octave
        var afour = 69;             // Note Number of A4
        var afourFreq = 440;        // Frequency of A4
        var buffer = 50;            // Size of buffer to be 
        
        // Store variable to be used for drawing
        // Stores width and height of both white and black notes as well as fill colour and highlight colour
        var typeNote = {};
        typeNote.white = {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow"};
        typeNote.black = {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow"};
        var pattern = ['white','black','white','black','white','white','black','white','black','white','black','white'];
        // for (i = 0; i < 128; i+=1){
        //     that.keys[that.pattern[i % 12]].push(i);
        // }
        
        var whiteNotes = 7; // This is just to simplify things right now... will need to calculate number of white notes
        
        // Calculations to figure out size of viewbox
        var viewbox = {
            width: (typeNote.white.width * octaves * whiteNotes) + buffer,
            height: typeNote.white.height + buffer
        };
        var viewboxDim = "0 0 " + viewbox.width + " " + viewbox.height;
       
        
        // Equation for converting note numbers to frequencies
        that.noteToFreq = function(notenum){
            return Math.pow(2, ((notenum-afour)/octaveNotes))*afourFreq;
        }
        that.drawNote = function(svg, noteType, x, y, id){
            svg.append("rect")
                .style("stroke", noteType.stroke)
                .style("fill", noteType.fill)
                .attr("x", x)
                .attr("y", y)
                .attr("width", noteType.width)
                .attr("height", noteType.height)
                .attr("id", id)
                .attr("class", "note");
        };
        // keycodes = function(){... generate key bindings for keyboard to displayed octaves}
        // Start Drawing
        that.init = function(){
            that.container = $(container);
            that.svg = d3.select(container)
                .append("svg")
                .attr("viewBox", viewboxDim)
                .append("g")
                .attr("transform", "translate(25,25)");
            that.drawNote(that.svg, typeNote.white, 0, 0, 60);
            that.drawNote(that.svg, typeNote.white, 50, 0, 60);
        };
        that.init();
        return that;
    };
}(jQuery));

// Things to keep track of.
// number of octaves
// number of notes per octave
// number of first note
// note number for a4
// frequency of a4
// pattern for note rendering