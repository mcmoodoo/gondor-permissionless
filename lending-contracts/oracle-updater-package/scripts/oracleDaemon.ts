const price = await this.fetchNoPrice();
const price8 = Math.round(price * 1e8);

// Check if price has changed significantly (more than 0.1%)
const currentPrice = await this.oracle.latestPrice();
const priceDiff = Math.abs(price8 - Number(currentPrice));
const priceChangePercent = (priceDiff / Number(currentPrice)) * 100;

if (priceChangePercent < 0.1) {
  console.log(`⏭️  Price change too small (${priceChangePercent.toFixed(3)}%), skipping update`);
  return;
} 