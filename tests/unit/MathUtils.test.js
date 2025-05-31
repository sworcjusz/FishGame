/**
 * MathUtils Test Suite
 * Mobile-First Fish Game Mathematics Utilities
 * Test-First Development: Tests written BEFORE implementation
 */

import { MathUtils } from '../../src/utils/MathUtils.js';

describe('MathUtils', () => {
  describe('Vector Operations', () => {
    it('should calculate distance between two points', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      
      const distance = MathUtils.distance(point1, point2);
      
      expect(distance).toBe(5); // 3-4-5 triangle
    });

    it('should calculate distance with decimal precision', () => {
      const point1 = { x: 1.5, y: 2.5 };
      const point2 = { x: 4.5, y: 6.5 };
      
      const distance = MathUtils.distance(point1, point2);
      
      expect(distance).toBeCloseTo(5, 2);
    });

    it('should calculate distance for same points as zero', () => {
      const point = { x: 100, y: 200 };
      
      const distance = MathUtils.distance(point, point);
      
      expect(distance).toBe(0);
    });

    it('should return 0 distance for null or undefined points', () => {
      expect(MathUtils.distance(null, { x: 1, y: 1 })).toBe(0);
      expect(MathUtils.distance({ x: 1, y: 1 }, null)).toBe(0);
      expect(MathUtils.distance(undefined, undefined)).toBe(0);
    });

    it('should normalize vector to unit length', () => {
      const vector = { x: 3, y: 4 };
      
      const normalized = MathUtils.normalize(vector);
      
      expect(normalized.x).toBeCloseTo(0.6, 2);
      expect(normalized.y).toBeCloseTo(0.8, 2);
      expect(MathUtils.magnitude(normalized)).toBeCloseTo(1, 2);
    });

    it('should handle zero vector normalization', () => {
      const zeroVector = { x: 0, y: 0 };
      
      const normalized = MathUtils.normalize(zeroVector);
      
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    it('should handle null vector normalization', () => {
      const normalized = MathUtils.normalize(null);
      
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
    });

    it('should calculate vector magnitude', () => {
      const vector = { x: 3, y: 4 };
      
      const magnitude = MathUtils.magnitude(vector);
      
      expect(magnitude).toBe(5);
    });

    it('should return 0 magnitude for null vector', () => {
      expect(MathUtils.magnitude(null)).toBe(0);
      expect(MathUtils.magnitude(undefined)).toBe(0);
    });

    it('should add vectors correctly', () => {
      const vector1 = { x: 2, y: 3 };
      const vector2 = { x: 4, y: 1 };
      
      const result = MathUtils.addVectors(vector1, vector2);
      
      expect(result.x).toBe(6);
      expect(result.y).toBe(4);
    });

    it('should handle null vectors in addition', () => {
      const result = MathUtils.addVectors(null, { x: 1, y: 1 });
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should subtract vectors correctly', () => {
      const vector1 = { x: 5, y: 7 };
      const vector2 = { x: 2, y: 3 };
      
      const result = MathUtils.subtractVectors(vector1, vector2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(4);
    });

    it('should handle null vectors in subtraction', () => {
      const result = MathUtils.subtractVectors(null, null);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });

    it('should multiply vector by scalar', () => {
      const vector = { x: 2, y: 3 };
      const scalar = 2.5;
      
      const result = MathUtils.multiplyVector(vector, scalar);
      
      expect(result.x).toBe(5);
      expect(result.y).toBe(7.5);
    });

    it('should handle null vector in multiplication', () => {
      const result = MathUtils.multiplyVector(null, 2);
      expect(result.x).toBe(0);
      expect(result.y).toBe(0);
    });
  });

  describe('Angle Operations', () => {
    it('should convert degrees to radians', () => {
      expect(MathUtils.degreesToRadians(0)).toBe(0);
      expect(MathUtils.degreesToRadians(90)).toBeCloseTo(Math.PI / 2, 5);
      expect(MathUtils.degreesToRadians(180)).toBeCloseTo(Math.PI, 5);
      expect(MathUtils.degreesToRadians(360)).toBeCloseTo(2 * Math.PI, 5);
    });

    it('should convert radians to degrees', () => {
      expect(MathUtils.radiansToDegrees(0)).toBe(0);
      expect(MathUtils.radiansToDegrees(Math.PI / 2)).toBeCloseTo(90, 5);
      expect(MathUtils.radiansToDegrees(Math.PI)).toBeCloseTo(180, 5);
      expect(MathUtils.radiansToDegrees(2 * Math.PI)).toBeCloseTo(360, 5);
    });

    it('should calculate angle between two points', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 1, y: 0 }; // Right
      
      const angle = MathUtils.angleBetween(point1, point2);
      
      expect(angle).toBe(0);
    });

    it('should calculate angle for vertical movement', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 0, y: 1 }; // Up
      
      const angle = MathUtils.angleBetween(point1, point2);
      
      expect(angle).toBeCloseTo(Math.PI / 2, 5);
    });

    it('should handle null points in angle calculation', () => {
      expect(MathUtils.angleBetween(null, { x: 1, y: 1 })).toBe(0);
      expect(MathUtils.angleBetween({ x: 1, y: 1 }, null)).toBe(0);
    });

    it('should normalize angle to 0-2π range', () => {
      expect(MathUtils.normalizeAngle(3 * Math.PI)).toBeCloseTo(Math.PI, 5);
      expect(MathUtils.normalizeAngle(-Math.PI / 2)).toBeCloseTo(3 * Math.PI / 2, 5);
      expect(MathUtils.normalizeAngle(Math.PI / 4)).toBeCloseTo(Math.PI / 4, 5);
    });

    it('should normalize very large negative angles', () => {
      const result = MathUtils.normalizeAngle(-6 * Math.PI);
      expect(result).toBeCloseTo(0, 5);
    });

    it('should normalize very large positive angles', () => {
      const result = MathUtils.normalizeAngle(7 * Math.PI);
      expect(result).toBeCloseTo(Math.PI, 5);
    });
  });

  describe('Collision Detection', () => {
    it('should detect circular collision when objects overlap', () => {
      const circle1 = { x: 0, y: 0, radius: 5 };
      const circle2 = { x: 6, y: 0, radius: 2 };
      
      const collision = MathUtils.circleCollision(circle1, circle2);
      
      expect(collision).toBe(true);
    });

    it('should not detect collision when circles are apart', () => {
      const circle1 = { x: 0, y: 0, radius: 3 };
      const circle2 = { x: 10, y: 0, radius: 2 };
      
      const collision = MathUtils.circleCollision(circle1, circle2);
      
      expect(collision).toBe(false);
    });

    it('should detect collision when circles touch exactly', () => {
      const circle1 = { x: 0, y: 0, radius: 3 };
      const circle2 = { x: 5, y: 0, radius: 2 };
      
      const collision = MathUtils.circleCollision(circle1, circle2);
      
      expect(collision).toBe(true);
    });

    it('should handle null circles in collision detection', () => {
      expect(MathUtils.circleCollision(null, { x: 0, y: 0, radius: 5 })).toBe(false);
      expect(MathUtils.circleCollision({ x: 0, y: 0, radius: 5 }, null)).toBe(false);
      expect(MathUtils.circleCollision(null, null)).toBe(false);
    });

    it('should detect rectangle collision when objects overlap', () => {
      const rect1 = { x: 0, y: 0, width: 10, height: 10 };
      const rect2 = { x: 5, y: 5, width: 10, height: 10 };
      
      const collision = MathUtils.rectangleCollision(rect1, rect2);
      
      expect(collision).toBe(true);
    });

    it('should not detect rectangle collision when apart', () => {
      const rect1 = { x: 0, y: 0, width: 5, height: 5 };
      const rect2 = { x: 10, y: 10, width: 5, height: 5 };
      
      const collision = MathUtils.rectangleCollision(rect1, rect2);
      
      expect(collision).toBe(false);
    });

    it('should handle null rectangles in collision detection', () => {
      expect(MathUtils.rectangleCollision(null, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
      expect(MathUtils.rectangleCollision({ x: 0, y: 0, width: 10, height: 10 }, null)).toBe(false);
    });

    it('should detect point in circle', () => {
      const circle = { x: 0, y: 0, radius: 5 };
      const pointInside = { x: 3, y: 0 };
      const pointOutside = { x: 10, y: 0 };
      
      expect(MathUtils.pointInCircle(pointInside, circle)).toBe(true);
      expect(MathUtils.pointInCircle(pointOutside, circle)).toBe(false);
    });

    it('should handle null inputs in point in circle', () => {
      expect(MathUtils.pointInCircle(null, { x: 0, y: 0, radius: 5 })).toBe(false);
      expect(MathUtils.pointInCircle({ x: 1, y: 1 }, null)).toBe(false);
    });

    it('should detect point in rectangle', () => {
      const rect = { x: 0, y: 0, width: 10, height: 10 };
      const pointInside = { x: 5, y: 5 };
      const pointOutside = { x: 15, y: 15 };
      
      expect(MathUtils.pointInRectangle(pointInside, rect)).toBe(true);
      expect(MathUtils.pointInRectangle(pointOutside, rect)).toBe(false);
    });

    it('should handle null inputs in point in rectangle', () => {
      expect(MathUtils.pointInRectangle(null, { x: 0, y: 0, width: 10, height: 10 })).toBe(false);
      expect(MathUtils.pointInRectangle({ x: 1, y: 1 }, null)).toBe(false);
    });
  });

  describe('Interpolation and Easing', () => {
    it('should perform linear interpolation', () => {
      expect(MathUtils.lerp(0, 10, 0)).toBe(0);
      expect(MathUtils.lerp(0, 10, 1)).toBe(10);
      expect(MathUtils.lerp(0, 10, 0.5)).toBe(5);
      expect(MathUtils.lerp(5, 15, 0.3)).toBe(8);
    });

    it('should clamp values to range', () => {
      expect(MathUtils.clamp(-5, 0, 10)).toBe(0);
      expect(MathUtils.clamp(15, 0, 10)).toBe(10);
      expect(MathUtils.clamp(5, 0, 10)).toBe(5);
    });

    it('should map values from one range to another', () => {
      expect(MathUtils.map(5, 0, 10, 0, 100)).toBe(50);
      expect(MathUtils.map(0, 0, 10, 20, 30)).toBe(20);
      expect(MathUtils.map(10, 0, 10, 20, 30)).toBe(30);
    });
  });

  describe('Random Utilities', () => {
    it('should generate random number in range', () => {
      const min = 5;
      const max = 15;
      
      for (let i = 0; i < 100; i++) {
        const random = MathUtils.randomRange(min, max);
        expect(random).toBeGreaterThanOrEqual(min);
        expect(random).toBeLessThanOrEqual(max);
      }
    });

    it('should generate random integer in range', () => {
      const min = 1;
      const max = 6;
      
      for (let i = 0; i < 100; i++) {
        const random = MathUtils.randomInt(min, max);
        expect(random).toBeGreaterThanOrEqual(min);
        expect(random).toBeLessThanOrEqual(max);
        expect(Number.isInteger(random)).toBe(true);
      }
    });

    it('should generate random point in circle', () => {
      const center = { x: 0, y: 0 };
      const radius = 10;
      
      for (let i = 0; i < 50; i++) {
        const point = MathUtils.randomPointInCircle(center, radius);
        const distance = MathUtils.distance(center, point);
        expect(distance).toBeLessThanOrEqual(radius);
      }
    });
  });

  describe('Game Physics Helpers', () => {
    it('should calculate velocity from direction and speed', () => {
      const direction = Math.PI / 4; // 45 degrees
      const speed = 10;
      
      const velocity = MathUtils.velocityFromAngle(direction, speed);
      
      expect(velocity.x).toBeCloseTo(7.07, 2);
      expect(velocity.y).toBeCloseTo(7.07, 2);
    });

    it('should apply gravity to velocity', () => {
      const velocity = { x: 5, y: 0 };
      const gravity = 9.81;
      const deltaTime = 0.016; // 60 FPS
      
      const newVelocity = MathUtils.applyGravity(velocity, gravity, deltaTime);
      
      expect(newVelocity.x).toBe(5);
      expect(newVelocity.y).toBeCloseTo(gravity * deltaTime, 5);
    });

    it('should apply friction to velocity', () => {
      const velocity = { x: 10, y: 5 };
      const friction = 0.9;
      
      const newVelocity = MathUtils.applyFriction(velocity, friction);
      
      expect(newVelocity.x).toBe(9);
      expect(newVelocity.y).toBe(4.5);
    });

    it('should check if point is in bounds', () => {
      const bounds = { x: 0, y: 0, width: 100, height: 100 };
      const pointInside = { x: 50, y: 50 };
      const pointOutside = { x: 150, y: 50 };
      
      expect(MathUtils.isInBounds(pointInside, bounds)).toBe(true);
      expect(MathUtils.isInBounds(pointOutside, bounds)).toBe(false);
    });
  });

  describe('Performance Optimizations', () => {
    it('should use fast distance squared when possible', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 3, y: 4 };
      
      const distanceSquared = MathUtils.distanceSquared(point1, point2);
      
      expect(distanceSquared).toBe(25); // 5² = 25
    });

    it('should handle null points in distance squared', () => {
      expect(MathUtils.distanceSquared(null, { x: 1, y: 1 })).toBe(0);
      expect(MathUtils.distanceSquared({ x: 1, y: 1 }, null)).toBe(0);
    });

    it('should check collision without square root (optimization)', () => {
      const circle1 = { x: 0, y: 0, radius: 3 };
      const circle2 = { x: 4, y: 0, radius: 2 };
      const maxDistance = 5; // 3 + 2
      
      const collision = MathUtils.fastCircleCollision(circle1, circle2);
      
      expect(collision).toBe(true);
    });

    it('should handle null circles in fast collision', () => {
      expect(MathUtils.fastCircleCollision(null, { x: 0, y: 0, radius: 5 })).toBe(false);
      expect(MathUtils.fastCircleCollision({ x: 0, y: 0, radius: 5 }, null)).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle undefined or null inputs gracefully', () => {
      expect(() => MathUtils.distance(null, { x: 1, y: 1 })).not.toThrow();
      expect(() => MathUtils.normalize(undefined)).not.toThrow();
      expect(() => MathUtils.circleCollision(null, null)).not.toThrow();
    });

    it('should handle very large numbers', () => {
      const largePoint1 = { x: 1e10, y: 1e10 };
      const largePoint2 = { x: 1e10 + 3, y: 1e10 + 4 };
      
      const distance = MathUtils.distance(largePoint1, largePoint2);
      
      expect(distance).toBeCloseTo(5, 1);
    });

    it('should handle very small numbers', () => {
      const smallPoint1 = { x: 1e-10, y: 1e-10 };
      const smallPoint2 = { x: 1e-10 + 3e-10, y: 1e-10 + 4e-10 };
      
      const distance = MathUtils.distance(smallPoint1, smallPoint2);
      
      expect(distance).toBeCloseTo(5e-10, 15);
    });
  });
});

describe('MathUtils Performance', () => {
  it('should perform distance calculations efficiently', () => {
    const point1 = { x: 0, y: 0 };
    const point2 = { x: 100, y: 100 };
    const iterations = 10000;
    
    const startTime = performance.now();
    
    for (let i = 0; i < iterations; i++) {
      MathUtils.distance(point1, point2);
    }
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    // Should complete 10k calculations in under 100ms on modern devices
    expect(duration).toBeLessThan(100);
  });
}); 