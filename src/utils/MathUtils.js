/**
 * MathUtils - Mathematics Utilities for Mobile Fish Game
 * Optimized for performance and mobile device constraints
 * 
 * Features:
 * - Vector operations (distance, normalize, add, subtract, multiply)
 * - Angle operations (degrees/radians conversion, angle between points)
 * - Collision detection (circles, rectangles, points)
 * - Interpolation and easing functions
 * - Random number generation utilities
 * - Game physics helpers (gravity, friction, velocity)
 * - Performance optimizations for mobile devices
 */

export class MathUtils {
  // ===============================
  // VECTOR OPERATIONS
  // ===============================

  /**
   * Calculate distance between two points
   * @param {Object} point1 - First point with x, y properties
   * @param {Object} point2 - Second point with x, y properties
   * @returns {number} Distance between points
   */
  static distance(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Calculate squared distance (faster, no square root)
   * Use when you only need to compare distances
   * @param {Object} point1 - First point
   * @param {Object} point2 - Second point
   * @returns {number} Squared distance
   */
  static distanceSquared(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return dx * dx + dy * dy;
  }

  /**
   * Normalize vector to unit length
   * @param {Object} vector - Vector with x, y properties
   * @returns {Object} Normalized vector
   */
  static normalize(vector) {
    if (!vector) return { x: 0, y: 0 };
    
    const mag = this.magnitude(vector);
    if (mag === 0) return { x: 0, y: 0 };
    
    return {
      x: vector.x / mag,
      y: vector.y / mag
    };
  }

  /**
   * Calculate vector magnitude (length)
   * @param {Object} vector - Vector with x, y properties
   * @returns {number} Vector magnitude
   */
  static magnitude(vector) {
    if (!vector) return 0;
    return Math.sqrt(vector.x * vector.x + vector.y * vector.y);
  }

  /**
   * Add two vectors
   * @param {Object} vector1 - First vector
   * @param {Object} vector2 - Second vector
   * @returns {Object} Sum vector
   */
  static addVectors(vector1, vector2) {
    if (!vector1 || !vector2) return { x: 0, y: 0 };
    
    return {
      x: vector1.x + vector2.x,
      y: vector1.y + vector2.y
    };
  }

  /**
   * Subtract second vector from first
   * @param {Object} vector1 - First vector
   * @param {Object} vector2 - Second vector
   * @returns {Object} Difference vector
   */
  static subtractVectors(vector1, vector2) {
    if (!vector1 || !vector2) return { x: 0, y: 0 };
    
    return {
      x: vector1.x - vector2.x,
      y: vector1.y - vector2.y
    };
  }

  /**
   * Multiply vector by scalar
   * @param {Object} vector - Vector to multiply
   * @param {number} scalar - Scalar value
   * @returns {Object} Scaled vector
   */
  static multiplyVector(vector, scalar) {
    if (!vector) return { x: 0, y: 0 };
    
    return {
      x: vector.x * scalar,
      y: vector.y * scalar
    };
  }

  // ===============================
  // ANGLE OPERATIONS
  // ===============================

  /**
   * Convert degrees to radians
   * @param {number} degrees - Angle in degrees
   * @returns {number} Angle in radians
   */
  static degreesToRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Convert radians to degrees
   * @param {number} radians - Angle in radians
   * @returns {number} Angle in degrees
   */
  static radiansToDegrees(radians) {
    return radians * (180 / Math.PI);
  }

  /**
   * Calculate angle between two points
   * @param {Object} point1 - First point
   * @param {Object} point2 - Second point
   * @returns {number} Angle in radians
   */
  static angleBetween(point1, point2) {
    if (!point1 || !point2) return 0;
    
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.atan2(dy, dx);
  }

  /**
   * Normalize angle to 0-2π range
   * @param {number} angle - Angle in radians
   * @returns {number} Normalized angle
   */
  static normalizeAngle(angle) {
    while (angle < 0) angle += 2 * Math.PI;
    while (angle >= 2 * Math.PI) angle -= 2 * Math.PI;
    return angle;
  }

  // ===============================
  // COLLISION DETECTION
  // ===============================

  /**
   * Check collision between two circles
   * @param {Object} circle1 - First circle with x, y, radius
   * @param {Object} circle2 - Second circle with x, y, radius
   * @returns {boolean} True if circles collide
   */
  static circleCollision(circle1, circle2) {
    if (!circle1 || !circle2) return false;
    
    const distance = this.distance(circle1, circle2);
    return distance <= (circle1.radius + circle2.radius);
  }

  /**
   * Fast circle collision (using squared distance)
   * @param {Object} circle1 - First circle
   * @param {Object} circle2 - Second circle
   * @returns {boolean} True if circles collide
   */
  static fastCircleCollision(circle1, circle2) {
    if (!circle1 || !circle2) return false;
    
    const distanceSquared = this.distanceSquared(circle1, circle2);
    const radiusSum = circle1.radius + circle2.radius;
    return distanceSquared <= (radiusSum * radiusSum);
  }

  /**
   * Check collision between two rectangles
   * @param {Object} rect1 - First rectangle with x, y, width, height
   * @param {Object} rect2 - Second rectangle with x, y, width, height
   * @returns {boolean} True if rectangles overlap
   */
  static rectangleCollision(rect1, rect2) {
    if (!rect1 || !rect2) return false;
    
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
  }

  /**
   * Check if point is inside circle
   * @param {Object} point - Point with x, y
   * @param {Object} circle - Circle with x, y, radius
   * @returns {boolean} True if point is inside circle
   */
  static pointInCircle(point, circle) {
    if (!point || !circle) return false;
    
    const distance = this.distance(point, circle);
    return distance <= circle.radius;
  }

  /**
   * Check if point is inside rectangle
   * @param {Object} point - Point with x, y
   * @param {Object} rect - Rectangle with x, y, width, height
   * @returns {boolean} True if point is inside rectangle
   */
  static pointInRectangle(point, rect) {
    if (!point || !rect) return false;
    
    return point.x >= rect.x &&
           point.x <= rect.x + rect.width &&
           point.y >= rect.y &&
           point.y <= rect.y + rect.height;
  }

  // ===============================
  // INTERPOLATION AND EASING
  // ===============================

  /**
   * Linear interpolation between two values
   * @param {number} start - Start value
   * @param {number} end - End value
   * @param {number} t - Interpolation factor (0-1)
   * @returns {number} Interpolated value
   */
  static lerp(start, end, t) {
    return start + t * (end - start);
  }

  /**
   * Clamp value to range
   * @param {number} value - Value to clamp
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Clamped value
   */
  static clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  /**
   * Map value from one range to another
   * @param {number} value - Value to map
   * @param {number} fromMin - Source range minimum
   * @param {number} fromMax - Source range maximum
   * @param {number} toMin - Target range minimum
   * @param {number} toMax - Target range maximum
   * @returns {number} Mapped value
   */
  static map(value, fromMin, fromMax, toMin, toMax) {
    const fromRange = fromMax - fromMin;
    const toRange = toMax - toMin;
    const scaledValue = (value - fromMin) / fromRange;
    return toMin + scaledValue * toRange;
  }

  // ===============================
  // RANDOM UTILITIES
  // ===============================

  /**
   * Generate random number in range
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {number} Random number
   */
  static randomRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  /**
   * Generate random integer in range
   * @param {number} min - Minimum value (inclusive)
   * @param {number} max - Maximum value (inclusive)
   * @returns {number} Random integer
   */
  static randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Generate random point inside circle
   * @param {Object} center - Circle center with x, y
   * @param {number} radius - Circle radius
   * @returns {Object} Random point
   */
  static randomPointInCircle(center, radius) {
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.sqrt(Math.random()) * radius;
    
    return {
      x: center.x + Math.cos(angle) * distance,
      y: center.y + Math.sin(angle) * distance
    };
  }

  // ===============================
  // GAME PHYSICS HELPERS
  // ===============================

  /**
   * Calculate velocity from angle and speed
   * @param {number} angle - Direction in radians
   * @param {number} speed - Speed magnitude
   * @returns {Object} Velocity vector
   */
  static velocityFromAngle(angle, speed) {
    return {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    };
  }

  /**
   * Apply gravity to velocity
   * @param {Object} velocity - Current velocity
   * @param {number} gravity - Gravity constant
   * @param {number} deltaTime - Time delta
   * @returns {Object} New velocity with gravity applied
   */
  static applyGravity(velocity, gravity, deltaTime) {
    return {
      x: velocity.x,
      y: velocity.y + gravity * deltaTime
    };
  }

  /**
   * Apply friction to velocity
   * @param {Object} velocity - Current velocity
   * @param {number} friction - Friction coefficient (0-1)
   * @returns {Object} New velocity with friction applied
   */
  static applyFriction(velocity, friction) {
    return {
      x: velocity.x * friction,
      y: velocity.y * friction
    };
  }

  /**
   * Check if point is within bounds
   * @param {Object} point - Point to check
   * @param {Object} bounds - Bounds with x, y, width, height
   * @returns {boolean} True if point is in bounds
   */
  static isInBounds(point, bounds) {
    return this.pointInRectangle(point, bounds);
  }
} 