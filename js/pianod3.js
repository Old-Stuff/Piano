var automm = automm || {};

(function ($) {
    automm.midiToFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
    automm.piano = function (container){
        var that = {};
        // Initializae values
        var firstNote = 60;         // Note Number of first key drawn
        var octaves = 2;             // Number of Octaves to Draw
        var octaveNotes = 12;       // Number of notes per octave
        var afour = 69;             // Note Number of A4
        var afourFreq = 440;        // Frequency of A4
        var padding = 50;            // Size of padding to be 
        
        // Store variable to be used for drawing
        // Stores width and height of both white and black notes as well as fill colour and highlight colour
        var keys = {
            white: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow", notes: []},
            black: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow", notes: []}
        };
        var pattern = ['white','black','white','black','white','white','black','white','black','white','black','white'];
        
        // Assign Specific Notes to key Based on Pattern
        for (i = firstNote; i < (firstNote + (octaves * octaveNotes)); i+=1){
            keys[pattern[i % octaveNotes]].notes.push(i);
        }
        
        var whiteNotes = keys.white.notes.length; // This is just to simplify things right now... will need to calculate number of white notes
        var blackNotes = keys.black.notes.length;
        // Calculations to figure out size of viewbox
        var viewbox = {
            width: (keys.white.width * whiteNotes) + padding,
            height: keys.white.height + padding,
        };
        viewbox.dim = "0 0 " + viewbox.width + " " + viewbox.height
        
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
        that.draw = function(){
            var blackX = 0 - (keys.black.width / 2),
                prevNote;
            // Draw White Keys
            for (i = 0; i < keys.white.notes.length; i+=1){
                that.drawNote(that.svg, keys.white, i * keys.white.width, 0, keys.white.notes[i]);
            }
            for (i = 0; i < octaves * octaveNotes; i+=1){
                if (pattern[i%12] === "black") {
                    blackX = blackX + keys.white.width;
                    that.drawNote(that.svg, keys.black, blackX, 0, keys.black.notes[i]);
                }
                if (pattern[i%12] === prevNote){
                    blackX = blackX + keys.white.width;
                }
                prevNote = pattern[i%12]
            }
        }
        
        // Start Drawing
        that.init = function(){
            that.container = $(container);
            that.svg = d3.select(container)
                .append("svg")
                .attr("viewBox", viewbox.dim)
                .append("g")
                .attr("transform", "translate(" + padding / 2 + "," + padding / 2 + ")");
            that.draw();
        };
        that.init();
        return that;
    };
}(jQuery));