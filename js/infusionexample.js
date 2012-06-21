var tutorials = tutorials || {};

(function ($, fluid){
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