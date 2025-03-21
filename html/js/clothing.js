import { ClothingSelector, saveData, loadData } from "./modules/clothing_selector.js";

function generate()
{
    let clothing = getClothing();
    let combo = selector.nextCombo(clothing);
    let sugg = getAttire(combo);
    return toTitleCase(sugg);
}

function update()
{
    let clothing = getClothing();
    let combo = selector.getCombo();
    let sugg = getAttire(combo);
    return toTitleCase(sugg);
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
    if (units == "wmoUnit:degC")
        return temp * 9 / 5 + 32.0;
    return temp;
}

function getWeatherData(url)
{
    $.getJSON(url.current, data => {

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

    $.getJSON(url.forecast, data => {

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

    saveData("Clothing", clothing);

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

function filterSummer(selector)
{
    let today = new Date();
    let year = today.getFullYear();

    let may31Date = new Date(Date.UTC(year, 4, 31));
    let may31Day = may31Date.getDay();
    let memorialDayDays = (28 - may31Day) % 7 + 24;
    let memorialDay = new Date(year, 4, memorialDayDays);

    let sept1Date = new Date(Date.UTC(year, 8, 1));
    let sept1Day = sept1Date.getDay();
    let laborDayDays = (8 - sept1Day) % 7;
    let laborDay = new Date(year, 8, laborDayDays);
    
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

var selector = new ClothingSelector();

await selector.loadData();

$("#againButton").button().hide();
$("#acceptButton").button().hide();

filterSummer(selector);

$("#location a").on("shown.bs.tab", function (event) {
    getWeatherData(getUrl());
    $("#attire").html(update());
});

$("#location a").click(function () {
    $(this).tab("show");
});

$("#activity a").on("shown.bs.tab", function (event) {
    if ($("#activity").find("a.active").text() == "Home")
        $("#jacket").button().prop("disabled", true);
    else
        $("#jacket").button().prop("disabled", false);
    $("#attire").html(update());
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
    $("#attire").html(generate());
    $("#againButton").button().show();
    $("#acceptButton").button().show();
});

$("#againButton").click(function () {
    $("#attire").html(generate());
    $("#acceptButton").prop("disabled", false);
});

$("#acceptButton").click(function () {
    selector.saveData();
    $(this).button().prop("disabled", true);
});

$("#jacket").click(function () {
    $(this).button().toggleClass("btn-default btn-secondary");
    $("#attire").html(update());
});

$("#wear").html(loadData("Clothing"));

getWeatherData(getUrl());
$("#attire").html(update());
