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
const tickers = process.env.TICKERS || 'SPY';

/**
 * xxxx
 */

client.on('connect', () => {
  console.log('Connected to MQTT');

  let re = /,\s*/;
  let promises = tickers.split(re).map(ticker => {
    console.log(`  getting ${ticker}`);

    return getPrice(ticker).then(data => publishPrices(ticker, data));
  });

  Promise.all(promises).then(() => {
    console.log('done');
    process.exit();
  });
});

function getPrice(stock) {
  let url = URL + stock;
  console.log(`  requesting ${url}`);

  return request(url)
    .then(html => {
      let $ = cheerio.load(html);
      let data = {};
      attribs.forEach(attrib => {
        data[attrib] = $(`#structured-data [itemprop="${attrib}"]`).attr(
          'content'
        );
      });
      return data;
    })
    .catch(err => {
      console.error(`Failed to retrv ${url}: ${err}`);
      return;
    });
}

function publishPrices(stock, data) {
  let topic = MQTT_TOPIC + '/' + stock;
  let resp;

  console.log(`Publish to ${topic}:`, JSON.stringify(data));
  return client.publish(topic, JSON.stringify(data));
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
