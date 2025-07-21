export { ClothingSelector, saveData, loadData };

class ClothingSelector {

    constructor() {
        this.longShirts = ["maroon",
                           "green1",
                           "green2",
                           "white1",
                           "white2",
                           "grey1",
                           "grey2"];

        this.shortShirts = ["black",
                            "grey",
                            "maroon",
                            "navy",
                            "nnl"];

        this.sweaters = ["black",
                         "grey",
                         "maroon",
                         "navy",
                         "nnl"];

        this.coats = ["navy",
                      "grey",
                      "brown",
                      "charcoal",
                      "tan"];

        this.pantss = ["khaki",
                       "tan",
                       "grey",
                       "jeans"];

        this.summerPants = [];
        this.summerCoats = ["tan"];

        // Key is coat, value is list of pants that go with coat.
        this.coatData = new Map(Object.entries(
            {navy: ["grey",
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
            }));

        // Key is shirt, value is list of sweaters that *dont* go with shirt.
        this.shirtData = new Map(Object.entries(
            {maroon: ["maroon", "nnl"],
             green: ["nnl"],
             grey: ["grey", "navy", "nnl"]}));

        // Key is sweater, value is list of pants that *dont* go with sweater.
        this.sweaterData = new Map(Object.entries(
            {black: ["khaki"],
             grey: ["grey"],
             navy: ["khaki"]}));

        // Key is long shirt, value is list of pants that *dont* go with shirt.
        this.shirtPantData = new Map(Object.entries(
            {maroon: ["khaki"],
             green: ["grey"],
             grey: ["khaki"]}));

        // Key is short shirt, value is list of pants that *dont* go with shirt.
        this.shortShirtPantData = new Map(Object.entries(
            {black: ["khaki"],
             grey: ["grey"],
             navy: ["khaki"]}));

        // Key is sweater, value is list of coats that *dont* go with sweater.
        this.sweaterCoatData = new Map(Object.entries(
            {navy: ["navy"],
             khaki: ["tan"],
             charcoal: ["grey"]}));
    }

    async loadData() {
        this.oldShortShirts = await loadData("ShortShirts");
        console.log('loadData(): oldShortShirts:', this.oldShortShirts);
        if (this.oldShortShirts == null) {
            this.oldShortShirts = [];
            this.shortShirt = null;
        } else
            this.shortShirt = this.oldShortShirts[this.oldShortShirts.length - 1];
        console.log('loadData(): shortShirt:', this.shortShirt)

        this.oldLongShirts = await loadData("LongShirts");
        console.log('loadData(): oldLongShirts:', this.oldLongShirts)
        if (this.oldLongShirts == null) {
            this.oldLongShirts = [];
            this.longShirt = null;
        } else
            this.longShirt = this.oldLongShirts[this.oldLongShirts.length - 1];
        console.log('loadData(): longShirt:', this.longShirt)

        this.oldSweaters = await loadData("Sweaters");
        console.log('loadData(): oldSweaters:', this.oldSweaters)
        if (this.oldSweaters == null) {
            this.oldSweaters = [];
            this.sweater = null;
        } else
            this.sweater = this.oldSweaters[this.oldSweaters.length - 1];
        console.log('loadData(): sweater:', this.sweater)

        this.oldCoats = await loadData("Coats");
        console.log('loadData(): oldCoats:', this.oldCoats)
        this.coat = this.oldCoats;
        console.log('loadData(): coat:', this.coat)

        this.oldPants = await loadData("Pants");
        console.log('loadData(): oldPants:', this.oldPants)
        this.pants = this.oldPants;
        console.log('loadData(): pants:', this.pants)
    }

    getCombo() {
        return {shortShirt: this.shortShirt,
                longShirt: this.longShirt,
                sweater: this.sweater,
                coat: this.coat,
                pants: this.pants};
    };

    shortShirtFilter() {
        const today = new Date();
        let isFriday = e => (today.getDay() == 4) == (e == "nnl");
        return elem => !this.oldShortShirts.includes(elem) && isFriday(elem);
    }

    longShirtFilter() {
        return elem => !this.oldLongShirts.includes(elem);
    }

    sweaterFilter(shirt) {
        const today = new Date();
        let isFriday = e => (today.getDay() == 4) == (e == "nnl");
        let hasShirt = elem => shirt in this.shirtData && this.shirtData.get(shirt).includes(elem);
        return elem => !this.oldSweaters.includes(elem) && !hasShirt(elem) && isFriday(elem);
    }

    coatFilter(sweater) {
        let hasSweater = elem => sweater in this.sweaterCoatData && this.sweaterCoatData.get(sweater).includes(elem);
        return elem => elem != this.oldCoats && !hasSweater(elem);
    }

    pantsFilter(coat, sweater, longShirt, shortShirt) {
        const today = new Date();
        let isFriday = e => (today.getDay() == 4) == (e == "jeans");
        let hasCoat = e => typeof coat !== 'undefined' ? coat in this.coatData && this.coatData.get(coat).includes(e) : true;
        let hasSweater = e => typeof sweater !== 'undefined' ? sweater in this.sweaterData && this.sweaterData.get(sweater).includes(e) : false;
        let hasLongShirt = e => typeof longShirt !== 'undefined' ? longShirt in this.shirtPantData && this.shirtPantData.get(longShirt).includes(e) : false;
        let hasShortShirt = e => typeof shortShirt !== 'undefined' ? shortShirt in this.shortShirtPantData && this.shortShirtPantData.get(shortShirt).includes(e) : false;
        if (coat && sweater && longShirt) {
            return elem => isFriday(elem) && hasCoat(elem) && !hasSweater(elem) && !hasLongShirt(elem);
        } else if (coat && sweater && shortShirt) {
            return elem => isFriday(elem) &&hasCoat(elem) && !hasSweater(elem) && !hasShortShirt(elem);
        } else if (coat && longShirt) {
            return elem => isFriday(elem) &&hasCoat(elem) && !hasLongShirt(elem);
        } else if (coat && shortShirt) {
            return elem => isFriday(elem) &&hasCoat(elem) && !hasShortShirt(elem);
        } else if (sweater && longShirt) {
            return elem => isFriday(elem) &&!hasSweater(elem) && !hasLongShirt(elem);
        } else if (sweater && shortShirt) {
            return elem => isFriday(elem) &&!hasSweater(elem) && !hasShortShirt(elem);
        } else if (longShirt) {
            return elem => isFriday(elem) &&!hasLongShirt(elem);
        } else if (shortShirt) {
            return elem => isFriday(elem) &&!hasShortShirt(elem);
        } else {
            return elem => isFriday(elem);
        }
    }

    nextCombo(clothing) {

        var combos = [];
        if (clothing.longShirt && clothing.sweater && clothing.pants && clothing.coat) {

            for (const longShirt of this.longShirts.filter(this.longShirtFilter()))
                for (const sweater of this.sweaters.filter(this.sweaterFilter(longShirt)))
                    for (const coat of this.coats.filter(this.coatFilter(sweater)))
                        for (const pants of this.pantss.filter(this.pantsFilter(coat, sweater, longShirt, undefined)))
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
                    for (const pants of this.pantss.filter(this.pantsFilter(undefined, sweater, longShirt, undefined)))
                        combos.push([longShirt, sweater, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = combo[1];
            this.coat = false;
            this.pants = combo[2];

        } else if (clothing.longShirt && clothing.pants && clothing.coat) {

            for (const longShirt of this.shortShirts.filter(this.shortShirtFilter()))
                for (const coat of this.coats.filter(this.coatFilter(sweater)))
                    for (const pants of this.pantss.filter(this.pantsFilter(coat, undefined, longShirt, undefined)))
                        combos.push([longShirt, coat, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = false;
            this.longShirt = combo[0];
            this.sweater = false;
            this.coat = combo[1];
            this.pants = combo[2];

        } else if (clothing.longShirt && clothing.pants) {

            for (const longShirt of this.shortShirts.filter(this.shortShirtFilter()))
                for (const pants of this.pantss.filter(this.pantsFilter(undefined, undefined, longShirt, undefined)))
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
                    for (const pants of this.pantss.filter(this.pantsFilter(coat, undefined, undefined, shortShirt)))
                        combos.push([shortShirt, coat, pants]);

            var combo = combos[Math.floor(Math.random() * combos.length)];

            this.shortShirt = combo[0];
            this.longShirt = false;
            this.sweater = false;
            this.coat = combo[1];
            this.pants = combo[2];

        } else if (clothing.shortShirt && clothing.pants) {

            for (const shortShirt of this.shortShirts.filter(this.shortShirtFilter()))
                for (const pants of this.pantss.filter(this.pantsFilter(undefined, undefined, undefined, shortShirt)))
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

            for (const longShirt of this.shortShirts.filter(this.shortShirtFilter()))
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

    saveData() {

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

        let sweaterArray = [];

        let sweaterNum = Math.min(this.sweaters.length - 1, 4);
        if (this.oldSweaters.length < sweaterNum)
            sweaterArray = this.oldSweaters.slice();
        else
            sweaterArray = this.oldSweaters.slice(1, sweaterNum);

        shortArray.push(this.shortShirt);
        longArray.push(this.longShirt);
        sweaterArray.push(this.sweater);

        console.log('saveData(): ShortShirts:', shortArray)
        saveData("ShortShirts", shortArray);
        console.log('saveData(): LongShirts:', longArray)
        saveData("LongShirts", longArray);
        console.log('saveData(): Sweaters:', sweaterArray)
        saveData("Sweaters", sweaterArray);
        console.log('saveData(): Coats:', this.coat)
        saveData("Coats", this.coat);
        console.log('saveData(): Pants:', this.pants)
        saveData("Pants", this.pants);
    }
}

function saveData(name, data) {
    fetch('flask/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: name, data: data})
    }).catch(console.error);
}

async function loadData(name) {

    let response = await fetch('flask/load_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({name: name})
    }).catch(console.error);

    if (response.ok)
        return await response.json();
}
