import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { ExchangeRate, Currency } from '../types';

const API_URL = 'https://open.er-api.com/v6/latest/USD';

export const currencyService = {
  /**
   * Fetches latest rates from API and caches them in Firestore.
   * Rates are cached daily to avoid excessive API calls.
   */
  async getLatestRates(): Promise<ExchangeRate | null> {
    try {
      const docRef = doc(db, 'exchange_rates', 'USD');
      const snap = await getDoc(docRef);

      if (snap.exists()) {
        const data = snap.data() as ExchangeRate;
        const lastUpdated = data.lastUpdated instanceof Timestamp 
          ? data.lastUpdated.toDate() 
          : new Date(data.lastUpdated);
        
        // If updated within the last 24 hours, return cached
        const oneDayMs = 24 * 60 * 60 * 1000;
        if (Date.now() - lastUpdated.getTime() < oneDayMs) {
          return data;
        }
      }

      // Fetch new rates
      console.log('Fetching fresh exchange rates...');
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('API fetch failed');
      const apiData = await response.json();

      const newRateData: ExchangeRate = {
        id: 'USD',
        base: 'USD',
        rates: {
          USD: 1,
          SAR: apiData.rates.SAR,
          YER: apiData.rates.YER || 250, // Fallback if YER is missing from basic API
        },
        lastUpdated: Timestamp.now(),
      };

      await setDoc(docRef, newRateData);
      return newRateData;
    } catch (error) {
      console.error('Error in currencyService:', error);
      return null;
    }
  },

  /**
   * Helper to convert base amount to local (YER) using provided rate
   */
  convert(amount: number, rate: number): number {
    return amount * rate;
  }
};
