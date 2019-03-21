var TODAY = new Date();

var Holidays = require("date-holidays");
var hd = new Holidays('US');

function ClothingSelector()
{
    // localStorage.removeItem("Shirts");
    // localStorage.removeItem("ShortShirts");
    // localStorage.removeItem("LongShirts");
    // localStorage.removeItem("Sweaters");
    // localStorage.removeItem("Coats");
    // localStorage.removeItem("Pants");
    // localStorage.removeItem("Clothing");

    this.longShirts = ["blue check",
                       "green check",
                       "brown",
                       "red blue"];

    this.shortShirts = ["red blue",
                        "light blue",
                        "green stripe",
                        "dark blue"];

    this.sweaters = ["khaki",
                     "olive",
                     "green",
                     "red",
                     "charcoal",
                     "navy"];

    this.coats = ["navy",
                  "grey",
                  "brown",
                  "charcoal",
                  "tan"];

    this.pantss = ["khaki",
                   // "navy",
                   "brown",
                   "grey"];

    this.summerPants = [];
    this.summerCoats = ["tan"];

    // Key is coat, value is list of pants that go with coat.
    this.coatData = {navy: ["grey",
                            "tan",
                            "khaki",
                            "brown",
                            "white"],
                     tan: ["charcoal",
                           "grey",
                           "olive",
                           "brown",
                           "white"],
                     brown: ["charcoal",
                             "grey",
                             "olive",
                             "white"],
                     olive: ["charcoal",
                             "grey",
                             "tan",
                             "khaki",
                             "brown"],
                     grey: ["charcoal",
                            "navy",
                            "white"],
                     blue: ["navy",
                            "tan",
                            "khaki",
                            "white"],
                     charcoal: ["grey",
                                "khaki"]
                    };

    // Key is shirt, value is list of sweaters that *dont* go with shirt.
    this.shirtData = {"rust": ["khaki", "red", "green"],
                      "green check": ["olive", "green"],
                      "blue check": [],
                      "brown": ["khaki", "red", "green"],
                      "red blue": ["olive"]};

    // Key is sweater, value is list of pants that *dont* go with sweater.
    this.sweaterData = {navy: ["navy"],
                        khaki: ["khaki"],
                        charcoal: ["grey"]};

    // Key is sweater, value is list of coats that *dont* go with sweater.
    this.sweaterCoatData = {navy: ["navy"],
                            khaki: ["tan"],
                            charcoal: ["grey"]};

    this.noStorage = !lsTest();

    if (this.noStorage || !("ShortShirts" in localStorage)) {
        this.oldShortShirts = [];
        this.shortShirt = "";
    }
    else {
        this.oldShortShirts = JSON.parse(localStorage.ShortShirts);
        this.shortShirt = this.oldShortShirts[this.oldShortShirts.length - 1];
    }

    if (this.noStorage || !("LongShirts" in localStorage)) {
        this.oldLongShirts = [];
        this.longShirt = "";
    }
    else {
        this.oldLongShirts = JSON.parse(localStorage.LongShirts);
        this.longShirt = this.oldLongShirts[this.oldLongShirts.length - 1];
    }

    if (this.noStorage || !("Sweaters" in localStorage)) {
        this.oldSweaters = "";
        this.sweater = "";
    }
    else {
        this.oldSweaters = localStorage.Sweaters;
        this.sweater = this.oldSweaters;
    }

    if (this.noStorage || !("Coats" in localStorage)) {
        this.oldCoats = "";
        this.coat = "";
    }
    else {
        this.oldCoats = localStorage.Coats;
        this.coat = this.oldCoats;
    }

    if (this.noStorage || !("Pants" in localStorage)) {
        this.oldPants = "";
        this.pants = "";
    }
    else {
        this.oldPants = localStorage.Pants;
        this.pants = this.oldPants;
    }

    this.getCombo = function() {
        return {shortShirt: this.shortShirt,
                longShirt: this.longShirt,
                sweater: this.sweater,
                coat: this.coat,
                pants: this.pants};
    };

    this.nextShortShirt = function() {

        var counts = makeArray(this.shortShirts.length);
        while (true) {
            var idx = Math.floor(Math.random() * this.shortShirts.length);
            counts[idx]++;
            this.shortShirt = this.shortShirts[idx];
            if (!this.oldShortShirts.includes(this.shortShirt))
                return true;
            if (all(counts))
                return false;
        }
    };

    this.nextLongShirt = function() {

        var counts = makeArray(this.longShirts.length);
        while (true) {
            var idx = Math.floor(Math.random() * this.longShirts.length);
            counts[idx]++;
            this.longShirt = this.longShirts[idx];
            if (!this.oldLongShirts.includes(this.longShirt))
                return true;
            if (all(counts))
                return false;
        }
    };

    this.nextSweater = function() {

        var counts = makeArray(this.sweaters.length);
        while (true) {
            var idx = Math.floor(Math.random() * this.sweaters.length);
            counts[idx]++;
            this.sweater = this.sweaters[idx];
            if (this.sweater != this.oldSweaters &&
                (!(this.shirt in this.shirtData) ||
                 !this.shirtData[this.shirt].includes(this.sweater)))
                return true;
            if (all(counts))
                return false;
        }
    };

    this.nextCoat = function() {

        var counts = makeArray(this.coats.length);
        while (true) {
            var idx = Math.floor(Math.random() * this.coats.length);
            counts[idx]++;
            this.coat = this.coats[idx];
            if (this.coat != this.oldCoats)
                return true;
            if (all(counts))
                return false;
        }
    };

    this.nextPants = function() {

        var counts = makeArray(this.pantss.length);
        while (true) {
            var idx = Math.floor(Math.random() * this.pantss.length);
            counts[idx]++;
            this.pants = this.pantss[idx];
            if (this.coatData[this.coat].includes(this.pants) &&
                (!(this.sweater in this.sweaterData) ||
                 !this.sweaterData[this.sweater].includes(this.pants)) &&
                (!(this.sweater in this.sweaterCoatData) ||
                 !this.sweaterCoatData[this.sweater].includes(this.coat)))
                return true;
            if (all(counts))
                return false;
        }
    };

    this.nextCombo = function() {

        while (true) {
            if (!this.nextShortShirt())
                continue;
            if (!this.nextLongShirt())
                continue;
            if (!this.nextSweater())
                continue;
            if (!this.nextCoat())
                continue;
            if (!this.nextPants())
                continue;
            break;
        }

        return this.getCombo();
    }

    this.saveData = function () {

        var shortArray = [];

        var shortShirtNum = Math.min(this.shortShirts.length - 1, 4);
        if (this.oldShortShirts.length < shortShirtNum)
            shortArray = this.oldShortShirts.slice();
        else
            shortArray = this.oldShortShirts.slice(1, shortShirtNum);

        var longArray = [];

        var longShirtNum = Math.min(this.longShirts.length - 1, 4);
        if (this.oldLongShirts.length < longShirtNum)
            longArray = this.oldLongShirts.slice();
        else
            longArray = this.oldLongShirts.slice(1, longShirtNum);

        shortArray.push(this.shortShirt);
        longArray.push(this.longShirt);

        if (!this.noStorage) {
            localStorage.ShortShirts = JSON.stringify(shortArray);
            localStorage.LongShirts = JSON.stringify(longArray);
            localStorage.Sweaters = this.sweater;
            localStorage.Coats = this.coat;
            localStorage.Pants = this.pants;
        }
    }
}

var selector = new ClothingSelector();

$("#againButton").button().hide();
$("#acceptButton").button().hide();

// Remove coats/pants if it isn't summer
var holidays = hd.getHolidays(TODAY.getFullYear());
var memorialDay = holidays.filter(function(val, idx, arr) {
    return val.name == 'Memorial Day';
})[0].start;
var laborDay = holidays.filter(function(val, idx, arr) {
    return val.name == 'Labor Day';
})[0].end;
if (TODAY < memorialDay || TODAY >= laborDay) {
    selector.coats = selector.coats.filter(function(val, idx, arr) {
	return !selector.summerCoats.includes(val);
    });
    selector.pantss = selector.pantss.filter(function(val, idx, arr) {
	return !selector.summerPants.includes(val);
    });
}

$("#location a").on("shown.bs.tab", function (event) {
    update();
});

$("#location a").click(function () {
    $(this).tab("show");
});

$("#activity a").on("shown.bs.tab", function (event) {
    getClothing();
    if ($("#attireButton").button().is(":hidden")) {
        $("#attire").html("");
        $("#attireButton").button().show();
    }
});

$("#activity a").click(function () {
    $(this).tab("show");
});

$("#attireButton").click(function () {
    $(this).button().hide();
    generate();
    $("#againButton").button().show();
    $("#acceptButton").button().show();
});

$("#againButton").click(function () {
    generate();
    $("#acceptButton").prop("disabled", false);
});

$("#acceptButton").click(function () {
    selector.saveData();
    $(this).button().prop("disabled", true);
});

if (lsTest())
    $("#wear").html(localStorage.Clothing);

update();

function generate()
{
    var combo = selector.nextCombo();
    var sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
}

function update()
{
    var url = getUrl();

    getWeatherData(url);

    var combo = selector.getCombo();
    var sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
}

function getUrl()
{
    var greenwichUrl = {
        current: "https://api.weather.gov/stations/KGFL/observations/latest",
        forecast: "https://api.weather.gov/gridpoints/ALY/63,79/forecast",
    };
    var schenectadyUrl = {
        current: "https://api.weather.gov/stations/KALB/observations/latest",
        forecast: "https://api.weather.gov/gridpoints/ALY/53,65/forecast",
    };
    var houstonUrl = {
        current: "https://api.weather.gov/stations/KSGR/observations/latest",
        forecast: "https://api.weather.gov/gridpoints/HGX/55,92/forecast",
    };

    switch ($("#location").find("a.active").text()) {
    case "Greenwich":
        return greenwichUrl;
    case "Schenectady":
        return schenectadyUrl;
    case "Houston":
        return houstonUrl;
    }
}

function convertTemp(units, temp)
{
    if (units == "unit:degC")
        return temp * 9 / 5 + 32.0;
    return temp;
}

function getWeatherData(url)
{
    $.getJSON(url.current, function (data) {

        var current = data.properties;

        var temperature = current.temperature.value;
        var units = current.temperature.unitCode;
        temperature = convertTemp(units, temperature);
        $("#temp").attr("value", temperature).html(
            "Temp: " + temperature.toFixed(1) + " &deg;F");

        var feelslike = current.heatIndex.value;
        units = current.heatIndex.unitCode;
        if (feelslike == null) {
            feelslike = current.windChill.value;
            units = current.windChill.unitCode;
            if (feelslike == null)
                feelslike = temperature;
            else
                feelslike = convertTemp(units, feelslike);
        }
        else {
            feelslike = convertTemp(units, feelslike);
        }
        $("#feels").html("Feels like " + feelslike.toFixed(0) + " &deg;F");

        getClothing();

        $.getJSON(url.forecast, function(data) {

            var forecast = data.properties;

            var i;
            var high, low;
            for (i = 0; i < 2; ++i)
                if (forecast.periods[i].isDaytime)
                    high = forecast.periods[i].temperature;
            else
                low = forecast.periods[i].temperature;

            $("#hilo").html("High: " + high.toFixed(0) + " &deg;F, " +
                            "Low: " + low.toFixed(0) + " &deg;F");

            forecast = forecast.periods[0].detailedForecast;

            $("#fcst").html(forecast);
        });

        $("#image").attr("src", current.icon);
    });
}

function getClothing()
{
    var temperature = parseFloat($("#temp").attr("value"));
    var clothing;

    var activity = $("#activity").find("a.active").text();
    var jacket = $("#jacket").checked();

    if (jacket && activity == "Work") {

        if (temperature < -22.0)
            clothing = "Long sleeves, sweater, coat and hat, heavy " +
            "gloves, earmuffs, scarf, boots, silk pants, and silk shirt";
        else if (temperature < -13.0)
            clothing = "Long sleeves, sweater, coat and hat, heavy " +
            "gloves, earmuffs, scarf, boots, and silk pants";
        else if (temperature < -4.0)
            clothing = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, scarf, boots, and silk pants";
        else if (temperature < 5.0)
            clothing = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, scarf, and boots";
        else if (temperature < 14.0)
            clothing = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, and scarf";
        else if (temperature < 23.0)
            clothing = "Long sleeves, sweater, coat and hat, gloves, " +
            "and earmuffs";
        else if (temperature < 32.0)
            clothing = "Long sleeves, sweater, coat and hat, and gloves";
        else if (temperature < 41.0)
            clothing = "Long sleeves, sweater, coat and hat";
        else if (temperature < 50.0)
            clothing = "Long sleeves and sweater";
        else if (temperature < 59.0)
            clothing = "Long sleeves and jacket";
        else if (temperature < 68.0)
            clothing = "Rolled sleeves and jacket";
        else if (temperature < 77.0)
            clothing = "Short sleeves and jacket";
        else
            clothing = "Short sleeves, no jacket";
    }

    else {

        if (temperature < -22.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, long undershirt, snow boots, " +
            "balaclava";
        else if (temperature < -13.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, long undershirt, snow boots";
        else if (temperature < -4.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, snow boots";
        else if (temperature < 5.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear";
        else if (temperature < 14.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, shoes";
        else if (temperature < 23.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, shoes";
        else if (temperature < 32.0)
            clothing = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "shoes";
        else if (temperature < 41.0)
            clothing = "Pants, long sleeves, jacket, sweater, shoes";
        else if (temperature < 50.0)
            clothing = "Pants, long sleeves, jacket, shoes";
        else if (temperature < 59.0)
            clothing = "Pants, long sleeves, shoes";
        else if (temperature < 68.0)
            clothing = "Pants, short sleeves, shoes";
        else if (temperature < 77.0)
            clothing = "Shorts, short sleeves, shoes";
        else
            clothing = "Shorts, short sleeves, sandals";
    }

    $("#wear").html(clothing);

    if (lsTest())
	localStorage.Clothing = clothing;
}

function getAttire(combo)
{
    var sugg = "";
    var clothing = $("#wear").text();

    if (clothing.toLowerCase().includes("long sleeves") ||
        clothing.toLowerCase().includes("rolled sleeves")) {
        sugg += combo.longShirt + " shirt";
    }

    else if (clothing.toLowerCase().includes("short sleeves")) {
        sugg += combo.shortShirt + " shirt";
    }

    if (clothing.includes("sweater")) {
        if (sugg.length > 0)
            sugg += ", ";
        sugg += combo.sweater + " sweater";
    }

    if (clothing.includes("jacket") ||
        clothing.includes("sweater")) {
        if (sugg.length > 0)
            sugg += ", ";
        sugg += combo.coat + " coat";
    }

    if (sugg.length > 0)
        sugg += ", ";

    sugg += combo.pants + " pants";

    return sugg;
}

function toTitleCase(str)
{
    return str.replace(/\w\w*/g, function (txt) {
        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
    });
}

function makeArray(size)
{
    var i;
    var array = [];
    for (i = 0; i < size; ++i)
	array.push(0);
    return array;
}

function all(array)
{
    for (i in array)
	if (array[i] == 0)
	    return false;
    return true;
}

function lsTest()
{
    var test = "test";
    try {
	localStorage.setItem(test, test);
	localStorage.remove(test);
	return true;
    } catch(e) {
	return false;
    }
}
