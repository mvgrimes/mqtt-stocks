# mqtt-stock

Simple node.js script to scrape a couple stock prices and publish to MQTT.

Add your MQTT config to .env:

    MQTT='mqtt://username:password@mqtt-hostname'
    TICKERS="SPY,BTC="
