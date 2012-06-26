var tutorials = tutorials || {};

(function ($, fluid){
    
    // //First is the example made as a little component
    //     fluid.defaults("tutorials.currencyConverterAuto", {
    //         gradeNames: ["fluid.littleComponent", "autoInit"],
    //         exchangeRate: 1.035,
    //         finalInitFunction: "tutorials.currencyConverterAuto.finalInit"
    //     });
    // 
    //     // The final init function
    //     tutorials.currencyConverterAuto.finalInit = function (that) {
    //         that.convert = function (amount) {
    //             return amount * that.options.exchangeRate;
    //         }
    //     };
    
    // // Second and example of it being done with a model component
    //     fluid.defaults("tutorials.currencyConverter", {
    //         gradeNames: ["fluid.modelComponent", "autoInit"],
    //         model: {
    //             currentSelection: "euro",
    //             rates: {
    //                 euro: 0.712,
    //                 yen: 81.841,
    //                 yuan: 6.609,
    //                 usd: 1.02,
    //                 rupee: 45.789
    //             }
    //         },
    //         finalInitFunction: "tutorials.currencyConverter.finalInit"
    //     });
    // 
    //     tutorials.currencyConverter.finalInit = function (that) {
    //         // Add methods to the component object
    //         that.updateCurrency = function (newCurrency) {
    //             that.applier.requestChange("currentSelection", newCurrency);
    //         };
    // 
    //         that.updateRate = function (currency, newRate) {
    //             that.applier.requestChange("rates." + currency, newRate);
    //         };
    // 
    //         that.convert = function (amount) {
    //             return amount * that.model.rates[that.model.currentSelection];
    //         };
    //     };
    
    // // Third is the inclusion of evented components
    //     
    //     fluid.defaults("tutorials.currencyConverter", {
    //         gradeNames: ["fluid.modelComponent", "fluid.eventedComponent", "autoInit"],
    //         model: {
    //             rates: {
    //                 euro: 0.712,
    //                 yen: 81.841,
    //                 yuan: 6.609,
    //                 usd: 1.02,
    //                 rupee: 45.789
    //             },
    //             currentSelection: "euro",
    //             amount: 0,
    //             convertedAmount: 0
    //         },
    //         events: {
    //             conversionUpdated: null
    //         },
    //         finalInitFunction: "tutorials.currencyConverter.finalInit"
    //     });
    // 
    //     tutorials.currencyConverter.finalInit = function (that) {
    // 
    //         // Add methods to the component object
    //         that.updateCurrency = function (newCurrency) {
    //             that.applier.requestChange("currentSelection", newCurrency);
    //         };
    // 
    //         that.updateRate = function (currency, newRate) {
    //             that.applier.requestChange("rates." + currency, newRate);
    //         };
    // 
    //         that.convert = function (amount) {
    //             var convertedAmount = amount * that.model.rates[that.model.currentSelection];
    //             that.applier.requestChange("convertedAmount", convertedAmount);
    //             return amount;
    //         };
    // 
    //         that.applier.modelChanged.addListener("convertedAmount", function (model, oldModel, changeRequest) {
    //             that.events.conversionUpdated.fire(model.convertedAmount);
    //         });
    //     };
    
    // Using Renderer Component
    
    fluid.defaults("tutorials.currencyConverter", {
        gradeNames: ["fluid.rendererComponent", "autoInit"],
        selectors: {
            amount: ".tut-currencyConverter-amount",
            currency: ".tut-currencyConverter-currency-selecter",
            result: ".tut-currencyConverter-result"
        },
        model: {
            rates: {
                names: ["euro", "yen", "yuan", "usd", "rupee"],
                values: ["0.712", "81.841", "6.609", "1.02", "45.789"]
            },
            currentSelection: "0.712",
            amount: 0,
            result: 0
        },
        events: {
            conversionUpdated: null
        },
        produceTree: "tutorials.currencyConverter.produceTree",
        finalInitFunction: "tutorials.currencyConverter.finalInit",
        renderOnInit: true
    });

    var bindEventHanders = function (that) {
        // When the model changes, update the resulting "converted" value
        that.applier.modelChanged.addListener("amount", function () {
            that.convert(that.model.amount);
        });
        that.applier.modelChanged.addListener("currentSelection", function () {
            that.convert(that.model.amount);
        });
        that.applier.modelChanged.addListener("result", function () {
            that.refreshView();
        });
    };

    tutorials.currencyConverter.produceTree = function (that) {
        return {
            amount: "${amount}",
            currency: {
                optionnames: "${rates.names}",
                optionlist: "${rates.values}",
                selection: "${currentSelection}"
            },
            result: "${result}"
        };
    };

    tutorials.currencyConverter.finalInit = function (that) {

        // Add a method to the component object
        that.convert = function (amount) {
            var convertedAmount = parseInt(amount) * that.model.currentSelection;
            that.applier.requestChange("result", convertedAmount);
            that.events.conversionUpdated.fire(convertedAmount);
        };
    
        bindEventHanders(that);
    };
})(jQuery, fluid_1_4);