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
const mqtt = require('mqtt');
const client = mqtt.connect(process.env.MQTT || 'mqtt://localhost');

/**
 * xxxx
 */

client.on('connect', async () => {
  console.log('Connected to MQTT');
  await getPrice('SPY');
  await getPrice('BTC=');
  process.exit();
});

async function getPrice(stock) {
  let url = URL + stock;
  let html;

  try {
    html = await request(url);
  } catch (err) {
    console.error(`Failed to retrv ${url}: ${err}`);
    return;
  }

  let $ = cheerio.load(html);
  let data = {};
  attribs.forEach(attrib => {
    data[attrib] = $(`#structured-data [itemprop="${attrib}"]`).attr('content');
  });

  console.log(data);
  return publishPrices(stock, data);
}

async function publishPrices(stock, data) {
  let topic = MQTT_TOPIC + '/' + stock;
  let resp;

  console.log(`Publish to ${topic}:`, JSON.stringify(data));
  try {
    resp = await client.publish(topic, JSON.stringify(data));
    return true;
  } catch (err) {
    console.error(`Error publishing to ${topic}: ${err}`);
    return false;
  }
}

/**
 * Want to notify controller that garage is disconnected before shutting down
 */
function handleAppExit(options, err) {
  if (err) {
    console.log(err.stack);
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
