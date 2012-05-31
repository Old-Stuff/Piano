// I have no idea what I'm doing . gif

var piano_0_1 = piano_0_1 || {};

(function ($, piano) {
	
    noteOn = function (midinote, id){
	    console.log(midinote + " " + id);
	};
    
    noteOff = function (midinote, id){
	    console.log(midinote + " " + id);
	};
})(jQuery, piano_0_1);    

// var test = function (string){
//     console.log(string);
// }

// function cat(name) {
//   var that = {};
//   that.name = name;
//   that.meow = function () {
//     console.log(that.name + " says Meow!");
// 
//     };
// 
//   return that;
//   }
// var myCat = cat("Richard");
// 
// myCat.meow();