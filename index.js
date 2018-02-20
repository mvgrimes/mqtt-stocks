// mqtt-stocks
const MQTT_TOPIC = 'hass/stock-price';
const URL = 'https://www.cnbc.com/quotes/?symbol=';
const attribs = [
  'name',
  'url',
  'tickerSymbol',
  'exchange',
  'exchangeTimezone',
  'price',
  'priceChange',
  'priceChangePercent',
  'quoteTime',
  'dataSource',
  'priceCurrency',
];
require('dotenv').config();

var request = require('request-promise-native');
const cheerio = require('cheerio');
const mqtt = require('async-mqtt');
const client = mqtt.connect(process.env.MQTT || 'mqtt://localhost');
const tickers = process.env.TICKERS || 'SPY';

/**
 * xxxx
 */

client.on('connect', getAndPostAll);

function getAndPostAll() {
  console.log('Connected to MQTT');

  let re = /,\s*/;
  let promises = tickers.split(re).map(async ticker => {
    console.log(`Getting ${ticker}`);
    await getAndPost(ticker);
    console.log(`  [${ticker}] done getAndPost`);
  });

  // console.log(promises);

  Promise.all(promises).then(async () => {
    console.log('done');
    await client.end();
    process.exit();
  });
}

async function getAndPost(stock) {
  let url = URL + stock;
  let topic = MQTT_TOPIC + '/' + stock;

  try {
    console.log(`  [${stock}] request ${url}`);
    let html = await request(url);

    console.log(`  [${stock}] parse data`);
    let data = parseHtml(html);

    console.log(`  [${stock}] publish to ${topic}:`, JSON.stringify(data));
    let resp = await client.publish(topic, JSON.stringify(data), {
      retain: true,
    });

    console.log(`  [${stock}] published`);
  } catch (e) {
    console.error(`  [${stock}] error processing: `, e);
  }
}

function parseHtml(html) {
  let $ = cheerio.load(html);
  let data = {};

  attribs.forEach(attrib => {
    data[attrib] = $(`#structured-data [itemprop="${attrib}"]`).attr('content');
  });

  return data;
}

/**
 * Want to notify controller that garage is disconnected before shutting down
 */
function handleAppExit(options, err) {
  if (err) {
    console.error(err.stack);
  }

  if (options.cleanup) {
    // client.publish('garage/connected', 'false')
  }

  if (options.exit) {
    process.exit();
  }
}

/**
 * Handle the different ways an application can shutdown
 */
process.on(
  'exit',
  handleAppExit.bind(null, {
    cleanup: true,
  })
);

process.on(
  'SIGINT',
  handleAppExit.bind(null, {
    exit: true,
  })
);

process.on(
  'uncaughtException',
  handleAppExit.bind(null, {
    exit: true,
  })
);
