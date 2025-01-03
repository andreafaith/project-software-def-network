import logger from './logger.js';

export class MovingAverage {
    constructor(data, windowSize = 24) {
        this.data = data;
        this.windowSize = windowSize;
    }

    calculate() {
        const result = [];
        for (let i = 0; i < this.data.length; i++) {
            const window = this.data.slice(
                Math.max(0, i - this.windowSize + 1),
                i + 1
            );
            const average = window.reduce((sum, val) => sum + val, 0) / window.length;
            result.push(average);
        }
        return result;
    }
}

export class ExponentialSmoothing {
    constructor(data, options = {}) {
        this.data = data;
        this.alpha = options.alpha || 0.2; // Level smoothing
        this.beta = options.beta || 0.1;   // Trend smoothing
        this.gamma = options.gamma || 0.3;  // Seasonal smoothing
        this.seasonalPeriods = options.seasonalPeriods || 24;
        this.confidence = options.confidence || 0.95;
    }

    async train() {
        try {
            // Initialize components
            this.level = this.data[0];
            this.trend = this._initializeTrend();
            this.seasonals = this._initializeSeasonalComponents();
            
            // Train model
            for (let i = 0; i < this.data.length; i++) {
                await this._updateComponents(i);
            }

            // Calculate error metrics
            this.error = this._calculateError();
            
            return {
                level: this.level,
                trend: this.trend,
                seasonals: this.seasonals,
                error: this.error
            };

        } catch (error) {
            logger.error('Error training exponential smoothing model:', error);
            throw error;
        }
    }

    async forecast(horizon) {
        try {
            const forecasts = [];
            let level = this.level;
            let trend = this.trend;

            for (let i = 1; i <= horizon; i++) {
                const seasonalIndex = (this.data.length + i) % this.seasonalPeriods;
                const seasonal = this.seasonals[seasonalIndex];
                
                // Calculate forecast
                const forecast = (level + trend * i) * seasonal;
                
                // Calculate prediction intervals
                const stderr = this._calculateStandardError(i);
                const z = this._getZScore(this.confidence);
                const interval = stderr * z;

                forecasts.push({
                    point: forecast,
                    lower: forecast - interval,
                    upper: forecast + interval,
                    timestamp: this._getForecastTimestamp(i)
                });
            }

            return forecasts;

        } catch (error) {
            logger.error('Error generating forecast:', error);
            throw error;
        }
    }

    _initializeTrend() {
        let sum = 0;
        for (let i = 0; i < Math.min(this.data.length, this.seasonalPeriods); i++) {
            sum += (this.data[i + this.seasonalPeriods] - this.data[i]) / this.seasonalPeriods;
        }
        return sum / this.seasonalPeriods;
    }

    _initializeSeasonalComponents() {
        const seasonals = new Array(this.seasonalPeriods).fill(0);
        const seasonsCount = Math.floor(this.data.length / this.seasonalPeriods);

        // Calculate average for each season
        for (let season = 0; season < this.seasonalPeriods; season++) {
            let sum = 0;
            for (let i = 0; i < seasonsCount; i++) {
                sum += this.data[season + i * this.seasonalPeriods];
            }
            seasonals[season] = sum / seasonsCount;
        }

        // Normalize seasonal components
        const seasonalsSum = seasonals.reduce((a, b) => a + b, 0);
        const normalizer = this.seasonalPeriods / seasonalsSum;
        return seasonals.map(s => s * normalizer);
    }

    async _updateComponents(i) {
        const value = this.data[i];
        const seasonalIndex = i % this.seasonalPeriods;
        const lastSeasonal = this.seasonals[seasonalIndex];
        const lastLevel = this.level;
        const lastTrend = this.trend;

        // Update level
        this.level = this.alpha * (value / lastSeasonal) + 
                     (1 - this.alpha) * (lastLevel + lastTrend);

        // Update trend
        this.trend = this.beta * (this.level - lastLevel) + 
                     (1 - this.beta) * lastTrend;

        // Update seasonal component
        this.seasonals[seasonalIndex] = this.gamma * (value / this.level) + 
                                      (1 - this.gamma) * lastSeasonal;
    }

    _calculateError() {
        let sumSquaredError = 0;
        let sumAbsPercentError = 0;
        let n = 0;

        for (let i = 0; i < this.data.length; i++) {
            const actual = this.data[i];
            const predicted = this._getForecastValue(i);

            if (actual !== 0) {
                sumSquaredError += Math.pow(actual - predicted, 2);
                sumAbsPercentError += Math.abs((actual - predicted) / actual);
                n++;
            }
        }

        return {
            rmse: Math.sqrt(sumSquaredError / n),
            mape: (sumAbsPercentError / n) * 100
        };
    }

    _calculateStandardError(h) {
        // Holt-Winters standard error calculation
        const variances = this.data.map((actual, i) => {
            const predicted = this._getForecastValue(i);
            return Math.pow(actual - predicted, 2);
        });

        const mse = variances.reduce((a, b) => a + b, 0) / variances.length;
        return Math.sqrt(mse * (1 + h * (h + 1) / (2 * this.data.length)));
    }

    _getForecastValue(i) {
        const seasonalIndex = i % this.seasonalPeriods;
        return (this.level + this.trend * i) * this.seasonals[seasonalIndex];
    }

    _getZScore(confidence) {
        // Z-score for common confidence levels
        const zScores = {
            0.99: 2.576,
            0.95: 1.96,
            0.90: 1.645,
            0.85: 1.44
        };
        return zScores[confidence] || 1.96;
    }

    _getForecastTimestamp(i) {
        return new Date(Date.now() + i * 60 * 60 * 1000); // Hourly forecasts
    }
}

export class SeasonalDecomposition {
    constructor(data, period) {
        this.data = data;
        this.period = period;
    }

    decompose() {
        // Implement seasonal decomposition (additive model)
        const trend = this._calculateTrend();
        const seasonal = this._calculateSeasonal(trend);
        const residual = this._calculateResidual(trend, seasonal);

        return {
            trend,
            seasonal,
            residual
        };
    }

    _calculateTrend() {
        const ma = new MovingAverage(this.data, this.period);
        return ma.calculate();
    }

    _calculateSeasonal(trend) {
        const detrended = this.data.map((value, i) => value - trend[i]);
        const seasonal = new Array(this.period).fill(0);
        
        // Calculate average seasonal pattern
        for (let i = 0; i < this.data.length; i++) {
            const seasonIndex = i % this.period;
            seasonal[seasonIndex] += detrended[i] / Math.floor(this.data.length / this.period);
        }

        // Normalize seasonal components
        const seasonalMean = seasonal.reduce((a, b) => a + b, 0) / this.period;
        return seasonal.map(s => s - seasonalMean);
    }

    _calculateResidual(trend, seasonal) {
        return this.data.map((value, i) => 
            value - trend[i] - seasonal[i % this.period]
        );
    }
}

export class TimeSeriesAnalysis {
    static calculateStatistics(data) {
        const values = data.map(d => d.value);
        const n = values.length;

        const mean = values.reduce((a, b) => a + b, 0) / n;
        const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);

        return {
            mean,
            median: this._calculateMedian(values),
            stdDev,
            min: Math.min(...values),
            max: Math.max(...values),
            skewness: this._calculateSkewness(values, mean, stdDev),
            kurtosis: this._calculateKurtosis(values, mean, stdDev)
        };
    }

    static _calculateMedian(values) {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    static _calculateSkewness(values, mean, stdDev) {
        const n = values.length;
        const sum = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 3), 0);
        return (n / ((n - 1) * (n - 2))) * sum;
    }

    static _calculateKurtosis(values, mean, stdDev) {
        const n = values.length;
        const sum = values.reduce((a, b) => a + Math.pow((b - mean) / stdDev, 4), 0);
        return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
               (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    }
}
