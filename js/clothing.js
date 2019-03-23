const HAVE_LS = lsTest();

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

    if (!HAVE_LS || !("ShortShirts" in localStorage)) {
        this.oldShortShirts = [];
        this.shortShirt = "";
    }
    else {
        this.oldShortShirts = JSON.parse(localStorage.ShortShirts);
        this.shortShirt = this.oldShortShirts[this.oldShortShirts.length - 1];
    }

    if (!HAVE_LS || !("LongShirts" in localStorage)) {
        this.oldLongShirts = [];
        this.longShirt = "";
    }
    else {
        this.oldLongShirts = JSON.parse(localStorage.LongShirts);
        this.longShirt = this.oldLongShirts[this.oldLongShirts.length - 1];
    }

    if (!HAVE_LS || !("Sweaters" in localStorage)) {
        this.oldSweaters = "";
        this.sweater = "";
    }
    else {
        this.oldSweaters = localStorage.Sweaters;
        this.sweater = this.oldSweaters;
    }

    if (!HAVE_LS || !("Coats" in localStorage)) {
        this.oldCoats = "";
        this.coat = "";
    }
    else {
        this.oldCoats = localStorage.Coats;
        this.coat = this.oldCoats;
    }

    if (!HAVE_LS || !("Pants" in localStorage)) {
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
	let diff = this.shortShirts.filter(x => !this.oldShortShirts.includes(x));
	if (diff.length == 0)
	    return false;
	this.shortShirt = diff[Math.floor(Math.random() * diff.length)];
        return true;
    };

    this.nextLongShirt = function() {
	let diff = this.longShirts.filter(x => !this.oldLongShirts.includes(x));
	if (diff.length == 0)
	    return false;
	this.longShirt = diff[Math.floor(Math.random() * diff.length)];
        return true;
    };

    this.nextSweater = function() {
	let diff = this.sweaters.filter(x => x != this.oldSweaters &&
					(!(this.longShirt in this.shirtData) ||
					 !this.shirtData[this.longShirt].includes(x)));
	if (diff.length == 0)
	    return false;
	this.sweater = diff[Math.floor(Math.random() * diff.length)];
	return true;
    };

    this.nextCoat = function() {
	let diff = this.coats.filter(x => x != this.oldCoats &&
				     (!(this.sweater in this.sweaterCoatData) ||
				      !this.sweaterCoatData[this.sweater].includes(x)));
	if (diff.length == 0)
	    return false;
	this.coat = diff[Math.floor(Math.random() * diff.length)];
	return true;
    };

    this.nextPants = function() {
	let diff = this.pantss.filter(x => this.coatData[this.coat].includes(x) &&
				      (!(this.sweater in this.sweaterData) ||
				       !this.sweaterData[this.sweater].includes(x)));
	if (diff.length == 0)
	    return false;
	this.pants = diff[Math.floor(Math.random() * diff.length)];
	return true;
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

        let shortArray = [];

        let shortShirtNum = Math.min(this.shortShirts.length - 1, 4);
        if (this.oldShortShirts.length < shortShirtNum)
            shortArray = this.oldShortShirts.slice();
        else
            shortArray = this.oldShortShirts.slice(1, shortShirtNum);

        let longArray = [];

        let longShirtNum = Math.min(this.longShirts.length - 1, 4);
        if (this.oldLongShirts.length < longShirtNum)
            longArray = this.oldLongShirts.slice();
        else
            longArray = this.oldLongShirts.slice(1, longShirtNum);

        shortArray.push(this.shortShirt);
        longArray.push(this.longShirt);

        if (HAVE_LS) {
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

filterSummer(selector);

$("#location a").on("shown.bs.tab", function (event) {
    update();
});

$("#location a").click(function () {
    $(this).tab("show");
});

$("#activity a").on("shown.bs.tab", function (event) {
    if ($("#activity").find("a.active").text() == "Home")
        $("#jacket").button().prop("disabled", true);
    else
        $("#jacket").button().prop("disabled", false);
    getClothing();
    let combo = selector.getCombo();
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
    if ($("#attireButton").button().is(":hidden")) {
        $("#attire").html("");
        $("#attireButton").button().show();
        $("#againButton").button().hide();
        $("#acceptButton").button().hide();
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

$("#jacket").click(function () {
    $(this).button().toggleClass("btn-default btn-secondary");
    getClothing();
    let combo = selector.getCombo();
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
});

if (HAVE_LS)
    $("#wear").html(localStorage.Clothing);

update();

function generate()
{
    let combo = selector.nextCombo();
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
}

function update()
{
    let url = getUrl();

    getWeatherData(url);

    let combo = selector.getCombo();
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
}

function getUrl()
{
    let greenwichUrl = {
        current: "https://api.weather.gov/stations/KGFL/observations/latest",
        forecast: "https://api.weather.gov/gridpoints/ALY/63,79/forecast",
    };
    let schenectadyUrl = {
        current: "https://api.weather.gov/stations/KALB/observations/latest",
        forecast: "https://api.weather.gov/gridpoints/ALY/53,65/forecast",
    };
    let houstonUrl = {
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

        let current = data.properties;

        let temperature = current.temperature.value;
        let units = current.temperature.unitCode;
        temperature = convertTemp(units, temperature);
        $("#temp").attr("value", temperature).html(
            "Temp: " + temperature.toFixed(1) + " &deg;F");

        let feelslike = current.heatIndex.value;
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

        $("#image").attr("src", current.icon);

        getClothing();
     });

    $.getJSON(url.forecast, function (data) {

        let forecast = data.properties;

        let high, low;
        for (let i = 0; i < 2; ++i) {
            if (forecast.periods[i].isDaytime)
                high = forecast.periods[i].temperature;
            else
                low = forecast.periods[i].temperature;
	}

        $("#hilo").html("High: " + high.toFixed(0) + " &deg;F, " +
                        "Low: " + low.toFixed(0) + " &deg;F");

        forecast = forecast.periods[0].detailedForecast;

        $("#fcst").html(forecast);
    });
}

function getClothing()
{
    let temperature = parseFloat($("#temp").attr("value"));
    let clothing;

    let activity = $("#activity").find("a.active").text();
    let jacket = jacketOn($("#jacket").button());

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

    if (HAVE_LS)
        localStorage.Clothing = clothing;
}

function getAttire(combo)
{
    let sugg = "";
    let clothing = $("#wear").text();
    let activity = $("#activity").find("a.active").text();
    let jacket = jacketOn($("#jacket").button());

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

    if (jacket && activity != "Home" && (clothing.includes("jacket") ||
					 clothing.includes("sweater"))) {
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
    return str.replace(/\w\w*/g, (txt) =>
		       txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

function makeArray(size)
{
    let array = [];
    for (let i = 0; i < size; ++i)
        array.push(0);
    return array;
}

function all(array)
{
    for (let i in array)
        if (array[i] == 0)
            return false;
    return true;
}

function lsTest()
{
    let test = "test";
    try {
        localStorage.setItem(test, test);
        localStorage.removeItem(test);
        return true;
    } catch (e) {
        return false;
    }
}

function filterSummer(selector)
{
    let today = new Date();
    let holidays = hd.getHolidays(today.getFullYear());

    let memorialDay = holidays.filter(
	(val, idx, arr) => val.name == 'Memorial Day')[0].start;
    let laborDay = holidays.filter(
	(val, idx, arr) => val.name == 'Labor Day')[0].end;

    if (today < memorialDay || today >= laborDay) {
	selector.coats = selector.coats.filter(
	    (val, idx, arr) => !selector.summerCoats.includes(val));
	selector.pantss = selector.pantss.filter(
	    (val, idx, arr) => !selector.summerPants.includes(val));
    }
}

function jacketOn(obj)
{
    return obj.hasClass("btn-secondary");
}
