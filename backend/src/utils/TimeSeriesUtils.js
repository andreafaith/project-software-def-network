import logger from './logger.js';

class MovingAverage {
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

class ExponentialSmoothing {
    constructor(data, options = {}) {
        this.data = data;
        this.alpha = options.alpha || 0.2; // Level smoothing
        this.beta = options.beta || 0.1;   // Trend smoothing
        this.gamma = options.gamma || 0.3;  // Seasonal smoothing
        this.seasonalPeriods = options.seasonalPeriods || 24;
        this.confidence = options.confidence || 0.95;
        this.trained = false;
    }

    async train() {
        try {
            if (!Array.isArray(this.data) || this.data.length < 2) {
                throw new Error('Insufficient data for model training');
            }

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
            this.trained = true; // Mark model as trained
            
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

    async forecast(horizon = 24) {
        try {
            if (!this.trained || !this.level || !this.trend || !this.seasonals) {
                throw new Error('Model must be trained before forecasting');
            }

            const predictions = [];
            let lastLevel = this.level;
            let lastTrend = this.trend;

            for (let h = 1; h <= horizon; h++) {
                const seasonalIndex = (this.data.length + h - 1) % this.seasonalPeriods;
                const seasonal = this.seasonals[seasonalIndex];
                const forecast = (lastLevel + h * lastTrend) * seasonal;
                
                // Calculate prediction intervals
                const sigma = Math.sqrt(this.error.mse);
                const z = 1.96; // 95% confidence interval
                const interval = z * sigma * Math.sqrt(1 + h / this.data.length);

                predictions.push({
                    value: forecast,
                    confidence: {
                        lower: forecast - interval,
                        upper: forecast + interval
                    }
                });
            }

            return predictions;
        } catch (error) {
            logger.error('Error generating forecast:', error);
            throw error;
        }
    }

    _initializeTrend() {
        const sum = this.data.slice(0, Math.min(this.data.length, this.seasonalPeriods))
            .reduce((acc, val, i) => acc + (val - this.data[0]) / (i + 1), 0);
        return sum / Math.min(this.data.length, this.seasonalPeriods);
    }

    _initializeSeasonalComponents() {
        const seasonals = new Array(this.seasonalPeriods).fill(1);
        const counts = new Array(this.seasonalPeriods).fill(0);
        const trend = this.data.map((_, i) => this.level + i * this.trend);

        // Calculate seasonal indices
        for (let i = 0; i < this.data.length; i++) {
            if (trend[i] !== undefined && trend[i] !== null) {
                const period = i % this.seasonalPeriods;
                seasonals[period] += this.data[i] / trend[i];
                counts[period]++;
            }
        }

        // Average the seasonal indices
        for (let i = 0; i < this.seasonalPeriods; i++) {
            if (counts[i] > 0) {
                seasonals[i] /= counts[i];
            }
        }

        // Normalize seasonal factors
        const seasonalMean = seasonals.reduce((a, b) => a + b) / this.seasonalPeriods;
        const normalizedSeasonal = seasonals.map(s => s / seasonalMean);

        // Replicate seasonal pattern for the entire series
        return this.data.map((_, i) => normalizedSeasonal[i % this.seasonalPeriods]);
    }

    async _updateComponents(i) {
        const y = this.data[i];
        const s = this.seasonals[i % this.seasonalPeriods];

        // Update level
        const newLevel = this.alpha * (y / s) + (1 - this.alpha) * (this.level + this.trend);
        
        // Update trend
        const newTrend = this.beta * (newLevel - this.level) + (1 - this.beta) * this.trend;
        
        // Update seasonal
        const newSeasonal = this.gamma * (y / newLevel) + (1 - this.gamma) * s;

        // Store updated values
        this.level = newLevel;
        this.trend = newTrend;
        this.seasonals[i % this.seasonalPeriods] = newSeasonal;
    }

    _calculateError() {
        let mse = 0;
        let mae = 0;
        let n = 0;

        for (let i = 0; i < this.data.length; i++) {
            const s = this.seasonals[i % this.seasonalPeriods];
            const forecast = this.level * s;
            const error = this.data[i] - forecast;
            
            mse += error * error;
            mae += Math.abs(error);
            n++;
        }

        return {
            mse: mse / n,
            mae: mae / n,
            rmse: Math.sqrt(mse / n)
        };
    }
}

class SeasonalDecomposition {
    constructor(data, period) {
        this.data = data;
        this.period = period;
    }

    decompose() {
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
        // Implement centered moving average
        const ma = new MovingAverage(this.data, this.period);
        return ma.calculate();
    }

    _calculateSeasonal(trend) {
        const seasonal = new Array(this.data.length).fill(0);
        const seasonalPattern = new Array(this.period).fill(0);
        const seasonalCounts = new Array(this.period).fill(0);

        // Calculate detrended series and average by season
        for (let i = 0; i < this.data.length; i++) {
            if (trend[i] !== 0) {
                const period = i % this.period;
                seasonalPattern[period] += this.data[i] / trend[i];
                seasonalCounts[period]++;
            }
        }

        // Calculate average seasonal pattern
        for (let i = 0; i < this.period; i++) {
            if (seasonalCounts[i] > 0) {
                seasonalPattern[i] /= seasonalCounts[i];
            }
        }

        // Normalize seasonal pattern
        const patternMean = seasonalPattern.reduce((a, b) => a + b) / this.period;
        const normalizedPattern = seasonalPattern.map(x => x / patternMean);

        // Apply pattern to the full series
        for (let i = 0; i < this.data.length; i++) {
            seasonal[i] = normalizedPattern[i % this.period];
        }

        return seasonal;
    }

    _calculateResidual(trend, seasonal) {
        return this.data.map((x, i) => x / (trend[i] * seasonal[i]));
    }
}

class TimeSeriesAnalysis {
    static calculateStatistics(data) {
        if (!Array.isArray(data) || data.length === 0) {
            throw new Error('Input must be a non-empty array');
        }

        const n = data.length;
        const mean = data.reduce((a, b) => a + b) / n;
        const variance = data.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
        const stdDev = Math.sqrt(variance);
        const sortedData = [...data].sort((a, b) => a - b);
        const median = this._calculateMedian(sortedData);
        const skewness = this._calculateSkewness(data, mean, stdDev);
        const kurtosis = this._calculateKurtosis(data, mean, stdDev);

        return {
            mean,
            median,
            variance,
            stdDev,
            skewness,
            kurtosis,
            min: sortedData[0],
            max: sortedData[n - 1]
        };
    }

    static _calculateMedian(values) {
        const mid = Math.floor(values.length / 2);
        return values.length % 2 === 0
            ? (values[mid - 1] + values[mid]) / 2
            : values[mid];
    }

    static _calculateSkewness(values, mean, stdDev) {
        const n = values.length;
        const cubedDeviations = values.map(x => Math.pow((x - mean) / stdDev, 3));
        return (n / ((n - 1) * (n - 2))) * cubedDeviations.reduce((a, b) => a + b);
    }

    static _calculateKurtosis(values, mean, stdDev) {
        const n = values.length;
        const fourthMoment = values.map(x => Math.pow((x - mean) / stdDev, 4))
            .reduce((a, b) => a + b) / n;
        return fourthMoment - 3; // Excess kurtosis
    }
}

export {
    MovingAverage,
    ExponentialSmoothing,
    SeasonalDecomposition,
    TimeSeriesAnalysis
};
