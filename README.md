#Google Summer of Code 2012: The Automagic Music Maker

##About
The Automagic Music Maker (henceforth refered to as AutoMM) is an open source javascript library used to create responsive and accessible instruments inside the browser.  Instruments are extremely flexible, allowing the end-user to customize almost every aspect. Visually, users can pick what interface they would like to use, piano or grid, and specify colors for both keys and actions.  Instruments can come in any size, pianos can specify number of octaves, grids can specify coloumns and rows.  The musical canon that the instrument will be based on can be manipulated as well, with the ability to specify the frequency of A4, and the number of notes per octave.  The AutoMM also comes with a nifty Arpeggiator that can be customized in various ways, from the pattern it will play, to the key and mode it will iterate over.  

Dont fret if the above got your head swirling, the AutoMM comes with defaults in place to create a responsive and accessible keyboard based on the western music canon (a.k.a. a normal piano).  That being said, if you are a micro-tonal composer, the AutoMM can be used to create any number of complex instruments to aid you in your compositional process.

The AutoMM utilizes the Flocking synthesis library, allowing for all synthesis to be done in the browser. As such the AutoMM doesn't require Flash or any other proprietary plugins. That being said, the AutoMM does have a few dependencies.  

[jQuery](http://jquery.com/) 

jQuery is a fast and concise JavaScript Library that simplifies HTML document traversing, event handling, animating, and Ajax interactions for rapid web development. jQuery is designed to change the way that you write JavaScript.

[Fluid Infusion](http://www.fluidproject.org/products/infusion/) 

Infusion is a different kind of JavaScript framework. Our approach is to leave you in control-- it's your interface, using your markup, your way. Infusion is accessible and very, very configurable.

[Flocking](http://flockingjs.org/)

Flocking is an open source audio synthesis toolkit that runs inside your Web browser. It doesn't require Flash or any other proprietary plugins. Written entirely in JavaScript, Flocking is designed for artists and musicians building creative Web-based sound projects. It is built on top of Firefox 4's Audio Data API and WebKit's WebAudio API. Flocking was inspired by the SuperCollider desktop synthesis environment. If you're familiar with SuperCollider, you'll feel at home with Flocking.

[D3](http://d3js.org/)

D3.js is a JavaScript library for manipulating documents based on data. D3 helps you bring data to life using HTML, SVG and CSS. D3’s emphasis on web standards gives you the full capabilities of modern browsers without tying yourself to a proprietary framework, combining powerful visualization components and a data-driven approach to DOM manipulation. 

[datGui](http://workshop.chromeexperiments.com/examples/gui)

A lightweight graphical user interface for changing variables in JavaScript. 

## Getting Started

To make you life easy all dependencies have been included in */js/third_party*  A number of the dependencies are included as submodules, you will need to initialize these before anything will work.

````
$ git submodule init
$ git submodule update
````

Once this is done you can open up index.html to take a peak at how to setup a basic piano.  Also included is grid.html (an example of making grid instruments), multiple_divs.html (an example showing how to declare multiple instruments on a single page), and simple.html (and example of using minimal options and minified versions of the source)

## The Model



##Credits

It was primarily written by Myles Borins
Strongly influenced by GSOC Mentor Colin Clark
Using the [Infusion](http://www.fluidproject.org/products/infusion/) framework and the [Flocking](https://www.github.com/colinbdclark/Flocking/) web synthesis Library


##Licensing

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 

