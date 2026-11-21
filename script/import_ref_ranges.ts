import 'dotenv/config';
import { db } from "../server/db";
import { species, labTests, labRefRanges, labTestCategories } from "../shared/schema";
import { eq, and } from "drizzle-orm";

const HAEMATOLOGY = [
    {
        name: "Hemoglobin (Hb)", unit: "% (g/dL)", ranges: {
            "Dog": ["14", "20"], "Cat": ["11", "16"], "Cow": ["8", "12"], "Goat": ["8", "12"],
            "Horse": ["11", "16"], "Pig": ["10", "14"], "Elephant": ["9.6", "15.3"], "Rabbit": ["10.5", "15.8"]
        }
    },
    {
        name: "PCV (HCT)", unit: "%", ranges: {
            "Dog": ["40", "56"], "Cat": ["34", "51"], "Cow": ["22", "32"], "Goat": ["22", "38"],
            "Horse": ["30", "44"], "Pig": ["34", "44"], "Elephant": ["27", "44"], "Rabbit": ["32", "47"]
        }
    },
    {
        name: "RBC", unit: "x10^6/µL", ranges: {
            "Dog": ["5.7", "8.3"], "Cat": ["7.4", "10.4"], "Cow": ["5.1", "7.6"], "Goat": ["8", "18"],
            "Horse": ["6.6", "11"], "Pig": ["6.4", "8.4"], "Elephant": ["2.1", "3.6"], "Rabbit": ["4.9", "7.5"]
        }
    },
    {
        name: "MCV", unit: "fL", ranges: {
            "Dog": ["64", "74"], "Cat": ["42", "52"], "Cow": ["38", "50"], "Goat": ["16", "25"],
            "Horse": ["38", "51"], "Pig": ["49", "59"], "Elephant": ["111", "138"], "Rabbit": ["52", "72"]
        }
    },
    {
        name: "MCH", unit: "pg", ranges: {
            "Dog": ["22", "26"], "Cat": ["13", "17"], "Cow": ["14", "18"], "Goat": ["5.2", "8.0"],
            "Horse": ["13", "19"], "Pig": ["17", "21"], "Elephant": ["42", "57"], "Rabbit": ["19", "24"]
        }
    },
    {
        name: "MCHC", unit: "% (g/dL)", ranges: {
            "Dog": ["33", "38"], "Cat": ["30", "33"], "Cow": ["36", "39"], "Goat": ["30", "36"],
            "Horse": ["35", "39"], "Pig": ["29", "33"], "Elephant": ["33.4", "35.7"], "Rabbit": ["30.5", "36.3"]
        }
    },
    {
        name: "WBC", unit: "x10^3/µL", ranges: {
            "Dog": ["5.0", "13"], "Cat": ["5.4", "15.4"], "Cow": ["4.9", "12"], "Goat": ["4", "13"],
            "Horse": ["5.6", "11.6"], "Pig": ["15.6", "38.9"], "Elephant": ["8.6", "18.2"], "Rabbit": ["3.4", "12.3"]
        }
    },
    {
        name: "Neutrophils", unit: "%", ranges: {
            "Dog": "68%", "Cat": "63%", "Cow": "52%", "Goat": "55%", "Horse": "58%", "Pig": "42%", "Elephant": "23%", "Rabbit": "65%"
        }
    },
    {
        name: "Lymphocytes", unit: "%", ranges: {
            "Dog": "26%", "Cat": "36%", "Cow": "47%", "Goat": "69%", "Horse": "49%", "Pig": "52%", "Elephant": "27%", "Rabbit": "34%"
        }
    },
    {
        name: "Monocytes", unit: "%", ranges: {
            "Dog": "6%", "Cat": "6%", "Cow": "7%", "Goat": "4%", "Horse": "6%", "Pig": "9%", "Elephant": "50%", "Rabbit": "1%"
        }
    },
    {
        name: "Platelet Count", unit: "x10^3/µL", ranges: {
            "Dog": ["134", "396"], "Cat": ["160", "500"], "Cow": ["190", "640"], "Goat": ["300", "600"],
            "Horse": ["100", "308"], "Pig": ["211", "887"], "Elephant": ["340", "720"], "Rabbit": ["200", "1060"]
        }
    }
];

const BIOCHEMISTRY = [
    {
        name: "AST (SGOT)", unit: "U/L", ranges: {
            "Dog": ["23", "66"], "Cat": ["26", "43"], "Cow": ["78", "132"], "Goat": ["167", "513"],
            "Horse": ["226", "366"], "Pig": ["32", "84"], "Elephant": ["15", "35"], "Rabbit": ["0", "47"]
        }
    },
    {
        name: "ALT (SGPT)", unit: "U/L", ranges: {
            "Dog": ["21", "102"], "Cat": ["6", "83"], "Cow": ["11", "40"], "Goat": ["6", "19"],
            "Horse": ["3", "23"], "Pig": ["31", "58"], "Elephant": ["1.5", "3"], "Rabbit": ["0", "79"]
        }
    },
    {
        name: "ALP", unit: "U/L", ranges: {
            "Dog": ["20", "156"], "Cat": ["25", "93"], "Cow": ["0", "488"], "Goat": ["93", "387"],
            "Horse": ["143", "395"], "Pig": ["118", "395"], "Elephant": ["60", "450"], "Rabbit": ["0", "120"]
        }
    },
    {
        name: "GGT", unit: "U/L", ranges: {
            "Dog": ["1.2", "6.4"], "Cat": ["1.3", "5.1"], "Cow": ["6.1", "17.4"], "Goat": ["20", "56"],
            "Horse": ["4.3", "13.4"], "Pig": ["1.2", "6.4"], "Elephant": ["4", "35"]
        }
    },
    {
        name: "Total Bilirubin", unit: "mg/dL", ranges: {
            "Dog": ["0.10", "0.50"], "Cat": ["0.15", "0.50"], "Cow": ["0.01", "0.5"], "Goat": ["0", "0.1"],
            "Horse": ["1", "2"], "Pig": ["0.10", "0.50"], "Elephant": ["0.2", "1"], "Rabbit": ["0", "0.9"]
        }
    },
    {
        name: "Total Protein", unit: "g/dL", ranges: {
            "Dog": ["5.4", "7.1"], "Cat": ["5.4", "7.8"], "Cow": ["6.7", "7.5"], "Goat": ["6.4", "7.0"],
            "Horse": ["5.2", "7.9"], "Pig": ["7.9", "8.9"], "Elephant": ["5.2", "10"], "Rabbit": ["0", "6.7"]
        }
    },
    {
        name: "Albumin", unit: "g/dL", ranges: {
            "Dog": ["2.6", "3.3"], "Cat": ["2.1", "3.3"], "Cow": ["3.03", "3.55"], "Goat": ["2.7", "3.9"],
            "Horse": ["2.6", "3.7"], "Pig": ["1.9", "3.9"], "Elephant": ["1.5", "3.5"], "Rabbit": ["0", "3.3"]
        }
    },
    {
        name: "Globulin", unit: "g/dL", ranges: {
            "Dog": ["2.7", "4.4"], "Cat": ["2.6", "5.1"], "Cow": ["3.0", "3.48"], "Goat": ["2.7", "4.1"],
            "Horse": ["2.62", "4.04"], "Pig": ["5.29", "6.43"], "Elephant": ["3.7", "6.5"], "Rabbit": ["0", "3.4"]
        }
    },
    {
        name: "Cholesterol", unit: "mg/dL", ranges: {
            "Dog": ["135", "270"], "Cat": ["95", "130"], "Cow": ["8", "120"], "Goat": ["80", "130"],
            "Horse": ["75", "150"], "Pig": ["36", "54"], "Elephant": ["26", "68"], "Rabbit": ["5.3", "71"]
        }
    },
    {
        name: "Triglyceride", unit: "mg/dL", ranges: {
            "Dog": ["20", "112"], "Cat": ["10", "114"], "Cow": ["0", "14"], "Horse": ["4", "44"], "Elephant": ["15", "60"]
        }
    },
    {
        name: "Creatinine", unit: "mg/dL", ranges: {
            "Dog": ["0.5", "1.5"], "Cat": ["0.8", "1.8"], "Cow": ["1.0", "2.0"], "Goat": ["1.0", "1.8"],
            "Horse": ["1.2", "1.9"], "Pig": ["1", "2.7"], "Elephant": ["1.1", "1.9"], "Rabbit": ["0.8", "2.57"]
        }
    },
    {
        name: "Urea (BUN)", unit: "mg/dL", ranges: {
            "Dog": ["10", "28"], "Cat": ["20", "30"], "Cow": ["20", "30"], "Goat": ["10", "20"],
            "Horse": ["10", "24"], "Pig": ["10", "30"], "Elephant": ["5", "20"]
        }
    },
    {
        name: "Amylase", unit: "U/L", ranges: {
            "Dog": ["185", "700"]
        }
    },
    {
        name: "Lipase", unit: "U/L", ranges: {
            "Dog": ["13", "200"], "Cat": ["0", "83"], "Elephant": ["10", "90"]
        }
    },
    {
        name: "CK (CPK)", unit: "U/L", ranges: {
            "Dog": ["0", "400"], "Cow": ["0", "2000"], "Horse": ["0", "2000"], "Pig": ["0", "2000"], "Elephant": ["0", "2000"]
        }
    },
    {
        name: "Calcium", unit: "mg/dL", ranges: {
            "Dog": ["9.0", "11.3"], "Cat": ["6.2", "10.2"], "Cow": ["9.7", "12.4"], "Goat": ["8.9", "11.7"],
            "Horse": ["11.2", "13.6"], "Pig": ["7.1", "11.6"], "Elephant": ["9", "12"], "Rabbit": ["5.84", "14.4"]
        }
    },
    {
        name: "Phosphorus", unit: "mg/dL", ranges: {
            "Dog": ["2.6", "6.2"], "Cat": ["4.5", "8.1"], "Cow": ["5.6", "6.5"], "Goat": ["4.2", "9.1"],
            "Horse": ["3.1", "5.6"], "Pig": ["5.3", "9.6"], "Elephant": ["4", "6"], "Rabbit": ["0", "4.5"]
        }
    },
    {
        name: "Magnesium", unit: "mg/dL", ranges: {
            "Dog": ["1.8", "2.4"], "Cat": ["1.8", "2.4"], "Cow": ["1.8", "2.3"], "Goat": ["2.8", "3.6"],
            "Horse": ["2.2", "2.8"], "Pig": ["2.7", "3.7"], "Elephant": ["1.4", "2.6"], "Rabbit": ["0", "2.3"]
        }
    },
    {
        name: "Sodium", unit: "mEq/L", ranges: {
            "Dog": ["141", "152"], "Cat": ["147", "156"], "Cow": ["132", "152"], "Goat": ["142", "155"],
            "Horse": ["132", "146"], "Pig": ["135", "150"], "Elephant": ["120", "140"], "Rabbit": ["0", "146"]
        }
    },
    {
        name: "Potassium", unit: "mEq/L", ranges: {
            "Dog": ["4.4", "5.3"], "Cat": ["4.0", "4.5"], "Cow": ["3.9", "5.8"], "Goat": ["3.5", "6.7"],
            "Horse": ["2.4", "4.7"], "Pig": ["4.4", "6.7"], "Elephant": ["3", "6"], "Rabbit": ["0", "5.8"]
        }
    },
    {
        name: "Chloride", unit: "mEq/L", ranges: {
            "Dog": ["105", "115"], "Cat": ["117", "123"], "Cow": ["97", "111"], "Goat": ["99", "110"],
            "Horse": ["99", "109"], "Pig": ["94", "106"], "Elephant": ["100", "115"], "Rabbit": ["85", "105"]
        }
    },
    {
        name: "Glucose", unit: "mg/dL", ranges: {
            "Dog": ["65", "118"], "Cat": ["73", "134"], "Cow": ["45", "75"], "Goat": ["50", "75"],
            "Horse": ["75", "115"], "Pig": ["85", "115"], "Elephant": ["60", "116"], "Rabbit": ["50", "93.2"]
        }
    }
];

async function getOrCreateCategory(name: string) {
    let [cat] = await db.select().from(labTestCategories).where(eq(labTestCategories.name, name));
    if (!cat) {
        [cat] = await db.insert(labTestCategories).values({ name }).returning();
    }
    return cat.id;
}

async function getOrCreateTest(name: string, categoryId: number, unit: string) {
    let [test] = await db.select().from(labTests).where(and(eq(labTests.name, name), eq(labTests.categoryId, categoryId)));
    if (!test) {
        [test] = await db.insert(labTests).values({ name, categoryId, unit, sortOrder: 1 }).returning();
    } else if (test.unit !== unit) {
        // Optionally update unit
        await db.update(labTests).set({ unit }).where(eq(labTests.id, test.id));
    }
    return test.id;
}

async function upsertRefRange(testId: number, speciesName: string, range: any) {
    let [existing] = await db.select().from(labRefRanges).where(and(eq(labRefRanges.testId, testId), eq(labRefRanges.species, speciesName)));
    let min = null;
    let max = null;
    let refText = null;
    if (Array.isArray(range)) {
        min = range[0];
        max = range[1];
    } else {
        refText = range;
    }

    if (!existing) {
        await db.insert(labRefRanges).values({ testId, species: speciesName, min, max, refText });
    } else {
        await db.update(labRefRanges).set({ min, max, refText }).where(eq(labRefRanges.id, existing.id));
    }
}

async function main() {
    const speciesList = ["Dog", "Cat", "Cow", "Goat", "Horse", "Pig", "Elephant", "Rabbit"];
    for (const s of speciesList) {
        let [sp] = await db.select().from(species).where(eq(species.name, s));
        if (!sp) {
            console.log(`Creating species: ${s}`);
            await db.insert(species).values({ name: s });
        }
    }

    const hemId = await getOrCreateCategory("Hematology");
    const bioId = await getOrCreateCategory("Biochemistry");

    for (const data of HAEMATOLOGY) {
        const testId = await getOrCreateTest(data.name, hemId, data.unit);
        for (const [sp, range] of Object.entries(data.ranges)) {
            await upsertRefRange(testId, sp, range);
        }
    }

    for (const data of BIOCHEMISTRY) {
        const testId = await getOrCreateTest(data.name, bioId, data.unit);
        for (const [sp, range] of Object.entries(data.ranges)) {
            await upsertRefRange(testId, sp, range);
        }
    }

    console.log("Successfully imported reference ranges!");
    process.exit(0);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
