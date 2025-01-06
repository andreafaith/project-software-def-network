import { jest } from '@jest/globals';
import { PredictiveAnalytics } from '../../services/PredictiveAnalytics.js';
import { NetworkMetrics } from '../../models/NetworkMetrics.js';

// Mock NetworkMetrics model
jest.mock('../../models/NetworkMetrics.js', () => ({
  __esModule: true,
  default: {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn()
  }
}));

describe('PredictiveAnalytics Service', () => {
  let predictiveAnalytics;

  beforeEach(() => {
    predictiveAnalytics = new PredictiveAnalytics();
    jest.clearAllMocks();
  });

  describe('analyzeNetworkTrends', () => {
    it('should analyze network trends successfully', async () => {
      const mockMetrics = [
        {
          timestamp: new Date(),
          bandwidth: 100,
          latency: 50,
          packetLoss: 0.1
        }
      ];

      NetworkMetrics.find.mockResolvedValue(mockMetrics);

      const result = await predictiveAnalytics.analyzeNetworkTrends();

      expect(NetworkMetrics.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.trends).toBeDefined();
    });

    it('should handle empty metrics data', async () => {
      NetworkMetrics.find.mockResolvedValue([]);

      const result = await predictiveAnalytics.analyzeNetworkTrends();

      expect(NetworkMetrics.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.trends).toEqual([]);
    });

    it('should handle errors during analysis', async () => {
      NetworkMetrics.find.mockRejectedValue(new Error('Database error'));

      await expect(predictiveAnalytics.analyzeNetworkTrends()).rejects.toThrow('Database error');
    });
  });

  describe('predictFutureMetrics', () => {
    it('should predict future metrics successfully', async () => {
      const mockHistoricalData = [
        {
          timestamp: new Date(),
          bandwidth: 100,
          latency: 50,
          packetLoss: 0.1
        }
      ];

      NetworkMetrics.find.mockResolvedValue(mockHistoricalData);

      const result = await predictiveAnalytics.predictFutureMetrics();

      expect(NetworkMetrics.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.predictions).toBeDefined();
    });

    it('should handle insufficient historical data', async () => {
      NetworkMetrics.find.mockResolvedValue([]);

      const result = await predictiveAnalytics.predictFutureMetrics();

      expect(NetworkMetrics.find).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.predictions).toEqual([]);
    });
  });
});
