"use strict";

import mysql from "mysql";
import ExcelJS from "exceljs";
import _ from "lodash";
import util from "util";

const connconfig = {
    host: "localhost",
    user: "whitebox",
    password: "password", //get the password from a config file? where to store this secret
    database: "mysql",
    supportBigNumbers: true,
    bigNumberStrings: true
  };

  const workbook = new ExcelJS.Workbook();

  const populateRows = (locale) => {
    let finalDom = [];
    let obj = {}
 
    for (let i = 0; i < locale.length -1; i++) {
        if (locale[i].start_weight === locale[i+1].start_weight) {
 
            obj = {
             ...obj,   
             ...locale[i],
             ...locale[i+1]
            };
            //check for the final push
            if (i == locale.length -2) {
             finalDom.push(obj);
            } 
        }
        else {
         finalDom.push(obj);
        }
    };
    return finalDom;
  };

  const setDomesticWorksheet = (sheet, dom) => {
    let worksheet = workbook.addWorksheet(sheet);

    worksheet.columns = [
    { header: "Start Weight", key: "start_weight", width: 15 },
    { header: "End Weight", key: "end_weight", width: 15 },
    { header: "Zone 1", key: "1", width: 30 },
    { header: "Zone 2", key: "2", width: 30 },
    { header: "Zone 3", key: "3", width: 30 },
    { header: "Zone 4", key: "4", width: 30 },
    { header: "Zone 5", key: "5", width: 30 },
    { header: "Zone 6", key: "6", width: 30 },
    { header: "Zone 7", key: "7", width: 30 },
    { header: "Zone 8", key: "8", width: 30 },
    ];

    let localeRows = populateRows(dom);
    worksheet.addRows(localeRows);
  };

  const setInternationalWorksheet = (sheet, dom) => {
    let worksheet = workbook.addWorksheet(sheet);

    //Make this dynamic
    worksheet.columns = [
    { header: "Start Weight", key: "start_weight", width: 15 },
    { header: "End Weight", key: "end_weight", width: 15 },
    { header: "A", key: "A", width: 30 },
    { header: "B", key: "B", width: 30 },
    { header: "C", key: "C", width: 30 },
    { header: "D", key: "D", width: 30 },
    { header: "E", key: "E", width: 30 },
    { header: "F", key: "F", width: 30 },
    { header: "G", key: "G", width: 30 },
    { header: "H", key: "H", width: 30 },
    { header: "I", key: "I", width: 30 },
    { header: "J", key: "J", width: 30 },
    { header: "K", key: "K", width: 30 },
    { header: "L", key: "L", width: 30 },
    { header: "M", key: "M", width: 30 },
    { header: "N", key: "N", width: 30 },
    { header: "O", key: "O", width: 30 },
    ];

    let localeRows = populateRows(dom);
    worksheet.addRows(localeRows);
  };

  const getLocaleRates = (locale, shipping, jsonRates) => {
    return _.filter(jsonRates, (rate) => {
        if ((rate.locale == locale) && (rate.shipping_speed == shipping)) {
            return rate;
        }
    }).map((rate) => _.pickBy(rate, _.identity));
  }


function makeDb( config ) {
    const connection = mysql.createConnection( config );
    return {
      query( sql, args ) {
        return util.promisify( connection.query )
          .call( connection, sql, args );
      },
      close() {
        return util.promisify( connection.end ).call( connection );
      }
    };
  }


  const db = makeDb( connconfig );
  
  async function getRates () {
  try {
    await db.query( `set @sql = (
        select group_concat(distinct
            concat(
                "case when \`zone\`='", zone, "' then \`rate\` end as \`", \`zone\`, "\`"
            )
        )
        FROM
      (select
         zone, rate, start_weight, end_weight, shipping_speed, locale
       from
         rates
       group by
         zone, rate, start_weight, end_weight, shipping_speed, locale) z
    );` );

    await db.query(`set @sql = concat("select start_weight, ", "end_weight, ", "locale,", "shipping_speed,", @sql, " from rates where client_id = 1240 group by start_weight, end_weight, locale, shipping_speed, rate, zone");`);
    await db.query('select @sql;');
    await db.query('prepare stmt from @sql;');

    const finalStatement = await db.query(`execute stmt;`);

    const jsonRates = JSON.parse(JSON.stringify(finalStatement));
    
    let domStandard = getLocaleRates('domestic', 'standard', jsonRates);
    let domExpedite = getLocaleRates('domestic', 'expedited', jsonRates);
    let domNextDay = getLocaleRates('domestic', 'nextDay', jsonRates);

    let intEconomy = getLocaleRates('international', 'intlEconomy', jsonRates);
    let intExpedited = getLocaleRates('international', 'intlExpedited', jsonRates);


    //set the sheets
    setDomesticWorksheet('Domestic Standard Rates', domStandard);
    setDomesticWorksheet('Domestic Expedited Rates', domExpedite);
    setDomesticWorksheet('Domestic Next Day Rates', domNextDay);
    setInternationalWorksheet('International Economy Rates', intEconomy);
    setInternationalWorksheet('International expedited Rates', intExpedited);



    workbook.xlsx.writeFile("rates.xlsx")
    .then(() => {
    console.log("file saved!");
    });

    await db.query('deallocate prepare stmt;');

  } catch ( err ) {
    console.log(err);
  } finally {
    await db.close();
  }
}

getRates();

