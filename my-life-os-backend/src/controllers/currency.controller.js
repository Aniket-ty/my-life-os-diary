const currencyService = require('../services/currency.service');

/**
 * List all supported currencies with symbols and metadata
 */
exports.getCurrencies = (req, res) => {
  try {
    const list = currencyService.listCurrencies();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * Get exchange rate between two currencies
 */
exports.getExchangeRate = async (req, res, next) => {
  try {
    const { from = 'USD', to = 'INR' } = req.query;
    const rateData = await currencyService.getRate(from, to);
    res.json(rateData);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

/**
 * Convert an amount from one currency to another
 */
exports.convert = async (req, res, next) => {
  try {
    const { amount, from = 'USD', to = 'INR' } = req.body;
    if (amount == null || isNaN(Number(amount))) {
      return res.status(400).json({ error: 'Valid numeric amount is required' });
    }
    const result = await currencyService.convertAmount(Number(amount), from, to);
    res.json(result);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};
