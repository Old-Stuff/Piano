var automm = automm || {};

(function ($, fluid) {
    fluid.defaults("automm.piano", {
        gradeNames: ["fluid.viewComponent", "autoInit"],
        preInitFunction: "automm.piano.preInitFunction",
        postInitFunction: "automm.piano.postInitFunction",
        
        model: {
            firstNote: 60, // Middle C
            octaves: 2,
            octaveNotes: 12,
            afour: 69,
            afourFreq: 440,
            padding: 50,
            pattern: ['white','black','white','black','white','white','black','white','black','white','black','white'],
            keys: {
                white: {width: 50, height: 200, stroke: "black", fill: "white", highlight: "yellow", notes: []},
                black: {width: 30, height: 125, stroke: "black", fill: "black", highlight: "yellow", notes: []}
            },
        },
                
        selectors: {
            
        },
        
        events: {
            
        },
        
        listeners: {
            
        }
    });
    
    automm.piano.preInitFunction = function (that) {
        for (i = that.model.firstNote; i < (that.model.firstNote + (that.model.octaves * that.model.octaveNotes)); i+=1){
            that.model.keys[that.model.pattern[i % that.model.octaveNotes]].notes.push(i);
        }
        
        that.model.whiteNotes = that.model.keys.white.notes.length;
        that.model.blackNotes = that.model.keys.black.notes.length;
        
        that.model.viewbox = {
            width: (that.model.keys.white.width * that.model.whiteNotes) + that.model.padding,
            height: that.model.keys.white.height + that.model.padding,
        };
        
        // Calculate to create string neccesary to generate viewbox (should be in JSON?)
        that.model.viewbox.dim = "0 0 " + that.model.viewbox.width + " " + that.model.viewbox.height
        
        // Automation of drawing all the keys on the canvas
        that.drawNote = function(noteType, x, y, id){
            var r = that.noteGroup.append("rect");
            r.style("stroke", noteType.stroke);
            r.style("fill", noteType.fill);
            r.attr("x", x);
            r.attr("y", y);
            r.attr("width", noteType.width);
            r.attr("height", noteType.height);
            r.attr("id", id);
            r.attr("class", "note");
        };
        
        // Automation of drawing all the keys on the canvas
        that.draw = function(){
            var blackX = 0 - (that.model.keys.black.width / 2),
                prevNote,
                blackCount = 0;
            
            // Draw White Keys
            for (i = 0; i < that.model.keys.white.notes.length; i+=1){
                that.drawNote(that.model.keys.white, i * that.model.keys.white.width, 0, that.model.keys.white.notes[i]);
            }
            
            // Draw Black Keys
            for (i = 0; i < that.model.octaves * that.model.octaveNotes; i+=1){
                
                // If the current key in the pattern is black then draw it!
                if (that.model.pattern[i%12] === "black") {
                    blackX = blackX + that.model.keys.white.width;
                    that.drawNote(that.model.keys.black, blackX, 0, that.model.keys.black.notes[blackCount]);
                    blackCount = blackCount + 1;
                }
                
                // If it is white, but the previous key was white, skip the key
                if (that.model.pattern[i%12] === prevNote){
                    blackX = blackX + that.model.keys.white.width;
                }
                
                // Keep track of previous key
                prevNote = that.model.pattern[i%12]
            }
        };
        
        that.init = function(){            
            // Draw viewbox and subsequent group to draw keys into
            that.d3container = d3.select("#piano");  // ??????
            var svg = that.d3container.append("svg");
            svg.attr("viewBox", that.model.viewbox.dim)
            svg.attr("id", "viewbox")
            
            that.noteGroup = svg.append("g")
            that.noteGroup.attr("transform", "translate(" + that.model.padding / 2 + "," + that.model.padding / 2 + ")");
            
            // Draw the keys
            that.draw();
        };
    };
    
    automm.piano.postInitFunction = function (that) {
        that.init();
    };
    
})(jQuery, fluid_1_4);
