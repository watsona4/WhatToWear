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

    this.coats = [// "navy",
                  "grey",
                  "brown",
                  // "charcoal",
                  "tan"];

    this.pantss = ["khaki",
                   // "navy",
                   // "brown",
                   // "grey",
                   // "olive",
                  ];

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

    this.shortShirtFilter = function() {
        return element => !this.oldShortShirts.includes(element);
    }

    this.longShirtFilter = function() {
        return element => !this.oldLongShirts.includes(element);
    }

    this.sweaterFilter = function(longShirt) {
        return element => element != this.oldSweaters &&
            (!(longShirt in this.shirtData) ||
             !this.shirtData[longShirt].includes(element));
    }

    this.coatFilter = function(sweater) {
        return element => element != this.oldCoats &&
            (!(sweater in this.sweaterCoatData) ||
             !this.sweaterCoatData[sweater].includes(element));
    }

    this.pantsFilter = function(coat, sweater) {
        if (coat && sweater) {
            return element => this.coatData[coat].includes(element) &&
                (!(sweater in this.sweaterData) ||
                 !this.sweaterData[sweater].includes(element));
        } else if (coat) {
            return element => this.coatData[coat].includes(element);
        } else if (sweater) {
            return element => (!(sweater in this.sweaterData) ||
                               !this.sweaterData[sweater].includes(element));
        } else {
            return element => true;
        }
    }

    this.nextCombo = function(clothing) {

        var combos = [];
        if (clothing.longShirt && clothing.sweater && clothing.pants && clothing.coat) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const sweater of this.sweaters.filter(this.sweaterFilter(longShirt)))
                    for (const coat of this.coats.filter(this.coatFilter(sweater)))
                        for (const pants of this.pantss.filter(this.pantsFilter(coat, sweater)))
                            combos.push([longShirt, sweater, coat, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = combo[1];
            this.coat = combo[2];
            this.pants = combo[3];

        } else if (clothing.longShirt && clothing.sweater && clothing.pants) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const sweater of this.sweaters.filter(this.sweaterFilter(longShirt)))
                    for (const pants of this.pantss.filter(this.pantsFilter(false, sweater)))
                        combos.push([longShirt, sweater, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = combo[1];
            this.coat = false;
            this.pants = combo[2];

        } else if (clothing.longShirt && clothing.pants && clothing.coat) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const coat of this.coats.filter(this.coatFilter(sweater)))
                    for (const pants of this.pantss.filter(this.pantsFilter(coat, false)))
                        combos.push([longShirt, coat, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = false;
            this.coat = combo[1];
            this.pants = combo[2];

        } else if (clothing.longShirt && clothing.pants) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const pants of this.pantss.filter(this.pantsFilter(false, false)))
                    combos.push([longShirt, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = false;
            this.coat = false;
            this.pants = combo[1];

        } else if (clothing.shortShirt && clothing.pants && clothing.coat) {

            for (const shortShirt of this.shortShirts.filter(this.shortShirtFilter()))
                for (const coat of this.coats.filter(this.coatFilter(sweater)))
                    for (const pants of this.pantss.filter(this.pantsFilter(coat, false)))
                        combos.push([shortShirt, coat, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = combo[0];
            this.longShirt = false;
            this.sweater = false;
            this.coat = combo[1];
            this.pants = combo[2];

        } else if (clothing.shortShirt && clothing.pants) {

            for (const shortShirt of this.shortShirts.filter(this.shortShirtFilter()))
                for (const pants of this.pantss.filter(this.pantsFilter(false, false)))
                    combos.push([shortShirt, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = combo[0];
            this.longShirt = false;
            this.sweater = false;
            this.coat = false;
            this.pants = combo[1];

        } else if (clothing.longShirt && clothing.sweater) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const sweater of this.sweaters.filter(this.sweaterFilter(longShirt)))
                    combos.push([longShirt, sweater]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = combo[1];
            this.coat = false;
            this.pants = false;

        } else if (clothing.longShirt) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                combos.push([longShirt]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = false;
            this.coat = false;
            this.pants = false;

        } else if (clothing.shortShirt) {

            for (const shortShirt of this.shortShirts.filter(this.shortShirtFilter()))
                combos.push([shortShirt]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = combo[0];
            this.longShirt = false;
            this.sweater = false;
            this.coat = false;
            this.pants = false;

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
    let clothing = getClothing();
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
    let clothing = getClothing();
    let combo = selector.getCombo();
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
});

if (HAVE_LS)
    $("#wear").html(localStorage.Clothing);

update();

function generate()
{
    let clothing = getClothing();
    let combo = selector.nextCombo(clothing);
    let sugg = getAttire(combo);
    $("#attire").html(toTitleCase(sugg));
}

function update()
{
    let url = getUrl();

    getWeatherData(url);

    let clothing = getClothing();
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
    let clothing = {
        shortShirt: false,
        longShirt: false,
        sweater: false,
        pants: false,
        coat: false,
        desc: null,
    };

    let activity = $("#activity").find("a.active").text();
    let jacket = jacketOn($("#jacket").button());

    if (activity == "Work") {

        clothing.pants = true;
        if (jacket)
            clothing.coat = true;

        if (temperature < -22.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, heavy " +
            "gloves, earmuffs, scarf, boots, silk pants, and silk shirt";
        } else if (temperature < -13.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, heavy " +
            "gloves, earmuffs, scarf, boots, and silk pants";
        } else if (temperature < -4.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, scarf, boots, and silk pants";
        } else if (temperature < 5.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, scarf, and boots";
        } else if (temperature < 14.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, gloves, " +
            "earmuffs, and scarf";
        } else if (temperature < 23.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, gloves, " +
            "and earmuffs";
        } else if (temperature < 32.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat, and gloves";
        } else if (temperature < 41.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves, sweater, coat and hat";
        } else if (temperature < 50.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Long sleeves and sweater";
        } else if (temperature < 59.0) {
            clothing.longShirt = true;
            clothing.desc = "Long sleeves";
            if (jacket) clothing.desc += " and jacket";
        } else if (temperature < 68.0) {
            clothing.longShirt = true;
            clothing.desc = "Rolled sleeves";
            if (jacket) clothing.desc += " and jacket";
        } else if (temperature < 77.0) {
            clothing.shortShirt = true;
            clothing.desc = "Short sleeves";
            if (jacket) clothing.desc += " and jacket";
        } else {
            clothing.shortShirt = true;
            clothing.coat = false;
            clothing.desc = "Short sleeves";
            if (jacket) clothing.desc += ", no jacket";
        }
    }

    else {

        if (temperature < -22.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, long undershirt, snow boots, " +
            "balaclava";
        } else if (temperature < -13.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, long undershirt, snow boots";
        } else if (temperature < -4.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear, snow boots";
        } else if (temperature < 5.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, long underwear";
        } else if (temperature < 14.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, scarf, shoes";
        } else if (temperature < 23.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "earmuffs, shoes";
        } else if (temperature < 32.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, coat and hat, sweater, gloves, " +
            "shoes";
        } else if (temperature < 41.0) {
            clothing.longShirt = true;
            clothing.sweater = true;
            clothing.desc = "Pants, long sleeves, jacket, sweater, shoes";
        } else if (temperature < 50.0) {
            clothing.longShirt = true;
            clothing.desc = "Pants, long sleeves, jacket, shoes";
        } else if (temperature < 59.0) {
            clothing.longShirt = true;
            clothing.desc = "Pants, long sleeves, shoes";
        } else if (temperature < 68.0) {
            clothing.shortShirt = true;
            clothing.desc = "Pants, short sleeves, shoes";
        } else if (temperature < 77.0) {
            clothing.shortShirt = true;
            clothing.desc = "Shorts, short sleeves, shoes";
        } else {
            clothing.shortShirt = true;
            clothing.desc = "Shorts, short sleeves, sandals";
        }
    }

    $("#wear").html(clothing.desc);

    if (HAVE_LS)
        localStorage.Clothing = clothing;

    return clothing;
}

function getAttire(combo)
{
    let sugg = "";

    if (combo.longShirt)
        sugg += combo.longShirt + " shirt";
    else if (combo.shortShirt)
        sugg += combo.shortShirt + " shirt";

    if (combo.sweater) {
        if (sugg.length > 0)
            sugg += ", ";
        sugg += combo.sweater + " sweater";
    }

    if (combo.coat) {
        if (sugg.length > 0)
            sugg += ", ";
        sugg += combo.coat + " coat";
    }

    if (combo.pants) {
        if (sugg.length > 0)
            sugg += ", ";
        sugg += combo.pants + " pants";
    }

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
