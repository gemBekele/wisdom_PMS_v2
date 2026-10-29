import { jest } from '@jest/globals';

// Simulate the nplController mock setup
const mockPrisma = {
  nplSnapshot: { findMany: jest.fn().mockResolvedValue([]) },
};

// Call clearAllMocks like the test does
jest.clearAllMocks();

// Now test: does findMany still return []?
const result = await mockPrisma.nplSnapshot.findMany();
console.log('After clearAllMocks, findMany returns:', result);
console.log('Is array?', Array.isArray(result));
console.log('Length:', result.length);
