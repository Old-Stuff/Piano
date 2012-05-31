// I have no idea what I'm doing . gif

var piano_0_1 = piano_0_1 || {};

(function ($, piano) {
    var toFreq = function(m){
        return Math.pow(2, ((m-69)/12))*440;
    };
	
    noteOn = function (midinote, id){
	    var freq =  toFreq(midinote);
        console.log(freq + " " + id);
	};
    
    noteOff = function (midinote, id){
	    var freq =  toFreq(midinote);
        console.log(freq + " " + id);
	};
})(jQuery, piano_0_1);