# Google Summer of Code 2012: The Automagic Music Maker

## About
The Automagic Music Maker (henceforth referred to as AutoMM) is an open source javascript library used to create responsive and accessible instruments inside the browser.  Instruments are extremely flexible, allowing the end-user to customize almost every aspect. Visually, users can pick what interface they would like to use, piano or grid, and specify colors for both keys and actions.  Instruments can come in any size, pianos can specify number of octaves, grids can specify columns and rows.  The musical canon that the instrument will be based on can be manipulated as well, with the ability to specify the frequency of A4, and the number of notes per octave.  The AutoMM also comes with a nifty Arpeggiator that can be customized in various ways, from the pattern it will play, to the key and mode it will iterate over.  

Don't fret if the above got your head swirling, the AutoMM comes with defaults in place to create a responsive and accessible keyboard based on the western music canon (a.k.a. a normal piano).  That being said, if you are a micro-tonal composer, the AutoMM can be used to create any number of complex instruments to aid you in your compositional process.

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

Once this is done you can open up index.html to take a peak at how to setup a basic piano.  Also included is grid.html (an example of making grid instruments), multiple_divs.html (an example showing how to declare multiple instruments on a single page), and simple.html (and example of using minimal options and minified versions of the source).

If you make any changes to the main source and would like to implement them into the minified version you can do so using the *build.sh* that has been included

````
$ ./build
````

## The Model

The AutoMM has a model that can be viewed via the console
````
> instrument.model
Object // You can use your development tools to dig into the model and see what its current state is
````
Here is an example of the default model for reference
````
model: {
    autoPiano: false,
    autoGrid: false,
    autoGui: false,
    artActive: false,
    columns: 8,
    rows: 8,
    afour: 69,     // The note number of A4
    afourFreq: 440, // Standard freq for A4, used to calculate all other notes
    firstNote: 60, // Middle C
    octaves: 1,
    octaveNotes: 12,
    padding: 0,
    pattern: ['white', 'black', 'white', 'black', 'white', 'white', 'black', 'white', 'black', 'white', 'black', 'white'],
    keys: {
        white: {
            fill: '#ffffff', // White
            stroke: '#000000', //  Black
            highlight: '#fff000', //  Yellow
            selected: '#00F5FF'  // Turquoise
        },
        black: {
            fill: '#000000', // Black
            stroke: '#000000', // Black
            highlight: '#fff000', //  Yellow
            selected: '#00F5FF'  // Turquoise
        }
    },

    arpActive: false,
    // Rate of the metronome... should be in bpm
    interval: 150,
    // Scale and mode to arpeggiate in
    scale: "major",
    mode: "ionian",
    // This pattern is in Note Degrees starting from 0 ({"I"": 0, "II":1, "III":etcetcetc})
    arpPattern: [0, 2, 4],

    // This is a canon which is used to collect modes / scales / etc.... 
    // probably shouldn't live here
    canon: {
        modes: {
            ionian: 0,
            dorian: 1,
            phyrgian: 2,
            lydian: 3,
            mixolydian: 4,
            aeolian: 5,
            locrian: 6
        },
        scales: {
            major: [2, 2, 1, 2, 2, 2, 1],
            minor: [2, 2, 1, 2, 2, 1, 2]
        }
    }

}
````
Any element of that model can be updated while the application is running, these changes (including visual) will automatically be implemented. For example, if you wanted to modify the piano to use a ten note octave you can use the command.
````
> instrument.update("octaveNotes", 10)
````
As you can see the update command is issued as *update(parameter, value)*.  There are some commands that might be trickier, such as modifying a color.
````
> instrument.update("keys.white.fill", "#ffffff")
````
As you can see dot notation is used to reference keys within an object.

The update function can be bound to any event, this allows you the flexibility to make your own user interfaces, or ways in which the application can be interactive.  Updates can also be cascaded, allow for complex model changes.

## Credits

It was primarily written by [Myles Borins](https://github.com/TheAlphaNerd)

Strongly influenced by GSOC Mentor [Colin Clark](https://github.com/colinbdclark)

Special thanks to [Douglas Crockford](http://www.crockford.com/) for his book [JavaScript: The Good Parts](http://shop.oreilly.com/product/9780596517748.do) and his lectures found at http://yuiblog.com/crockford/  The knowledge found in these resources proved invaluable in my architectural design, and growth as a programmer.

I'm going to thank [Colin Clark](https://github.com/colinbdclark) one more time, because he's awesome and I couldn't have done it without him!

I would also like to thank the various individuals at the [IDRC](http://idrc.ocad.ca/), my mentoring organization, who helped me with this project.  It has been educational and inspiring getting to know those of you I have met in person at the office, and those I have only met in #fluidwork.  I'd like to specifically thank Michelle, Anastasia, Alex, Yura, Bosmon and Justin O.

Of course I would also like to thank [Google](http://www.google.com) for making the Google Summer of Code happen, this experience has been life changing!

## Licensing

The Automagic Music Maker is distributed under the terms the MIT or GPL2 Licenses. 
Choose the license that best suits your project. The text of the MIT and GPL 
licenses are at the root of the Piano directory. 
