import { ClothingSelector, saveData, loadData } from "./modules/clothing_selector.js";
import icons from "./weather_icons_custom.json" with { type: "json" };

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
    let greenwich = {
        latitude: "43.0917827",
        longitude: "-73.4985877",
    };
    let schenectady = {
        latitude: "42.8127319",
        longitude: "-73.9377329",
    };
    let houston = {
        latitude: "29.669227",
        longitude: "-95.594398",
    };
    let columbus = {
        latitude: "29.635357",
        longitude: "-96.630387",
    };

    let latlon = null;

    switch ($("#location").find("a.active").text()) {
    case "Greenwich":
        latlon = greenwich;
        break;
    case "Schenectady":
        latlon = schenectady;
        break;
    case "Houston":
        latlon = houston;
        break;
    case "Columbus":
        latlon = columbus;
        break;
    }

    let url = new URL("https://api.open-meteo.com/v1/forecast");

    url.searchParams.append("latitude", latlon.latitude);
    url.searchParams.append("longitude", latlon.longitude);

    url.searchParams.append("daily", "temperature_2m_max,temperature_2m_min,weather_code,sunrise,sunset");
    url.searchParams.append("current", "temperature_2m,apparent_temperature,weather_code");
    url.searchParams.append("timezone", "auto");
    url.searchParams.append("forecast_days", "1");
    url.searchParams.append("wind_speed_unit", "mph");
    url.searchParams.append("temperature_unit", "fahrenheit");
    url.searchParams.append("precipitation_unit", "inch");

    return url.toString();
}

function convertTemp(units, temp)
{
    if (units == "wmoUnit:degC")
        return temp * 9 / 5 + 32.0;
    return temp;
}

function getWeatherData(url)
{
    $.getJSON(url, data => {

        let current = data.current;
        let daily = data.daily;

        let temperature = current.temperature_2m;
        $("#temp").attr("value", temperature).html(
            "Temp: " + temperature.toFixed(1) + " &deg;F");

        let feelslike = current.apparent_temperature;

        $("#feels").html("Feels like " + feelslike.toFixed(0) + " &deg;F");

        let day_night = "night";
        let time = new Date(current.time);
        let sunrise = new Date(daily.sunrise[0]);
        let sunset = new Date(daily.sunset[0]);

        if (time.getTime() > sunrise.getTime() && time.getTime() < sunset.getTime())
            day_night = "day";

        $("#image").attr("src", "js/icons/" + icons[current.weather_code][day_night].icon);

        getClothing();

        let high = daily.temperature_2m_max[0];
        let low = daily.temperature_2m_min[0];

        $("#hilo").html("High: " + high.toFixed(0) + " &deg;F, " +
                        "Low: " + low.toFixed(0) + " &deg;F");

        let forecast = icons[daily.weather_code[0]].day.description;

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
