/**
 * Player Test Suite
 * Mobile-First Fish Game Player/Hook System
 * Test-First Development: Tests written BEFORE implementation
 */

import { Player } from '../../src/game/Player.js';
import { Fish } from '../../src/game/Fish.js';
import { MathUtils } from '../../src/utils/MathUtils.js';

// Mock Canvas API
const mockCanvas = {
  width: 800,
  height: 600,
  getContext: jest.fn(() => ({
    drawImage: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    translate: jest.fn(),
    rotate: jest.fn(),
    scale: jest.fn(),
    clearRect: jest.fn(),
    strokeStyle: '',
    lineWidth: 1,
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    fillStyle: '',
    fillRect: jest.fn()
  }))
};

// Mock Fish
const createMockFish = (x = 100, y = 200) => ({
  x, y,
  width: 32, height: 32,
  isActive: true,
  isCaught: false,
  catch: jest.fn(),
  escape: jest.fn(),
  getBounds: jest.fn(() => ({
    left: x, top: y, right: x + 32, bottom: y + 32,
    x, y, width: 32, height: 32
  })),
  checkCollision: jest.fn(() => false),
  getScore: jest.fn(() => 10),
  destroy: jest.fn()
});

describe('Player', () => {
  let player;
  let mockCanvas2D;

  beforeEach(() => {
    mockCanvas2D = mockCanvas.getContext('2d');
    
    player = new Player({
      x: 400,
      y: 50
    });

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (player) {
      player.destroy();
    }
  });

  describe('Initialization', () => {
    it('should initialize with default properties', () => {
      expect(player.x).toBe(400);
      expect(player.y).toBe(50);
      expect(player.hookX).toBe(400);
      expect(player.hookY).toBe(50);
      expect(player.lineLength).toBe(0);
      expect(player.maxLineLength).toBeGreaterThan(0);
      expect(player.isActive).toBe(true);
      expect(player.isCasting).toBe(false);
      expect(player.isReeling).toBe(false);
    });

    it('should initialize with custom properties', () => {
      const customPlayer = new Player({
        x: 200,
        y: 100,
        maxLineLength: 500,
        castingPower: 8,
        reelingSpeed: 4
      });

      expect(customPlayer.x).toBe(200);
      expect(customPlayer.y).toBe(100);
      expect(customPlayer.maxLineLength).toBe(500);
      expect(customPlayer.castingPower).toBe(8);
      expect(customPlayer.reelingSpeed).toBe(4);
      
      customPlayer.destroy();
    });

    it('should set up hook physics system', () => {
      expect(player.hookVelocity).toEqual({ x: 0, y: 0 });
      expect(player.gravity).toBeGreaterThan(0);
      expect(player.waterResistance).toBeGreaterThan(0);
      expect(player.lineWeight).toBeGreaterThan(0);
    });

    it('should initialize fishing state tracking', () => {
      expect(player.caughtFish).toEqual([]);
      expect(player.totalScore).toBe(0);
      expect(player.fishesCaught).toBe(0);
      expect(player.castCount).toBe(0);
    });
  });

  describe('Casting System', () => {
    it('should start casting when cast method is called', () => {
      const power = 5;
      const angle = Math.PI / 4; // 45 degrees
      
      player.cast(power, angle);
      
      expect(player.isCasting).toBe(true);
      expect(player.castingPower).toBe(power);
      expect(player.castingAngle).toBeCloseTo(angle, 2);
      expect(player.castCount).toBe(1);
    });

    it('should calculate hook velocity based on casting parameters', () => {
      const power = 6;
      const angle = Math.PI / 6; // 30 degrees
      
      player.cast(power, angle);
      
      expect(player.hookVelocity.x).toBeCloseTo(power * Math.cos(angle), 1);
      expect(player.hookVelocity.y).toBeCloseTo(power * Math.sin(angle), 1);
    });

    it('should prevent casting when already casting', () => {
      player.cast(5, 0);
      const initialCastCount = player.castCount;
      
      player.cast(3, Math.PI / 2); // Try to cast again
      
      expect(player.castCount).toBe(initialCastCount); // Should not increment
    });

    it('should prevent casting when reeling', () => {
      player.startReeling();
      
      player.cast(5, 0);
      
      expect(player.isCasting).toBe(false);
      expect(player.castCount).toBe(0);
    });

    it('should handle maximum casting power', () => {
      const maxPower = player.maxCastingPower;
      
      player.cast(maxPower + 5, 0); // Exceed max power
      
      expect(player.castingPower).toBeLessThanOrEqual(maxPower);
    });

    it('should handle casting angle normalization', () => {
      player.cast(5, Math.PI * 3); // More than 2π
      
      expect(player.castingAngle).toBeGreaterThanOrEqual(0);
      expect(player.castingAngle).toBeLessThan(2 * Math.PI);
    });
  });

  describe('Hook Physics', () => {
    beforeEach(() => {
      player.cast(5, Math.PI / 4);
    });

    it('should update hook position based on velocity', () => {
      const initialHookX = player.hookX;
      const initialHookY = player.hookY;
      
      player.update(16.67); // ~60fps frame
      
      expect(player.hookX).not.toBe(initialHookX);
      expect(player.hookY).not.toBe(initialHookY);
    });

    it('should apply gravity to hook velocity', () => {
      const initialVelocityY = player.hookVelocity.y;
      
      player.update(16.67);
      
      expect(player.hookVelocity.y).toBeGreaterThan(initialVelocityY);
    });

    it('should apply water resistance when hook is underwater', () => {
      player.hookY = player.waterLevel + 50; // Underwater
      const initialVelocityX = player.hookVelocity.x;
      
      player.update(16.67);
      
      expect(Math.abs(player.hookVelocity.x)).toBeLessThan(Math.abs(initialVelocityX));
    });

    it('should calculate line length correctly', () => {
      player.hookX = player.x + 100;
      player.hookY = player.y + 100;
      
      player._updateLineLength();
      
      const expectedLength = MathUtils.distance(
        { x: player.x, y: player.y },
        { x: player.hookX, y: player.hookY }
      );
      expect(player.lineLength).toBeCloseTo(expectedLength, 1);
    });

    it('should handle line tension physics', () => {
      // Extend line to near maximum
      player.lineLength = player.maxLineLength - 10;
      
      player.update(16.67);
      
      expect(player.lineTension).toBeGreaterThan(0);
    });

    it('should break line when exceeding maximum length', () => {
      player.lineLength = player.maxLineLength + 50;
      
      player.update(16.67);
      
      expect(player.lineBroken).toBe(true);
      expect(player.isCasting).toBe(false);
    });
  });

  describe('Reeling System', () => {
    beforeEach(() => {
      player.cast(5, Math.PI / 2);
      player.hookY = player.waterLevel + 100; // Hook underwater
    });

    it('should start reeling when startReeling is called', () => {
      player.startReeling();
      
      expect(player.isReeling).toBe(true);
      expect(player.isCasting).toBe(false);
    });

    it('should stop reeling when stopReeling is called', () => {
      player.startReeling();
      player.stopReeling();
      
      expect(player.isReeling).toBe(false);
    });

    it('should pull hook toward player when reeling', () => {
      const initialDistance = MathUtils.distance(
        { x: player.x, y: player.y },
        { x: player.hookX, y: player.hookY }
      );
      
      player.startReeling();
      player.update(16.67);
      
      const finalDistance = MathUtils.distance(
        { x: player.x, y: player.y },
        { x: player.hookX, y: player.hookY }
      );
      
      expect(finalDistance).toBeLessThan(initialDistance);
    });

    it('should apply reeling speed correctly', () => {
      const reelingSpeed = 3;
      player.reelingSpeed = reelingSpeed;
      
      player.startReeling();
      player.update(16.67);
      
      // Hook should move toward player at appropriate speed
      const directionToPlayer = Math.atan2(
        player.y - player.hookY,
        player.x - player.hookX
      );
      const expectedVelocityX = Math.cos(directionToPlayer) * reelingSpeed;
      
      expect(player.hookVelocity.x).toBeCloseTo(expectedVelocityX, 1);
    });

    it('should handle reeling with caught fish resistance', () => {
      const mockFish = createMockFish();
      player.caughtFish.push(mockFish);
      
      const normalReelingSpeed = player.reelingSpeed;
      player.startReeling();
      player.update(16.67);
      
      // Should be slower with fish resistance
      const actualSpeed = MathUtils.magnitude(player.hookVelocity);
      expect(actualSpeed).toBeLessThan(normalReelingSpeed);
    });

    it('should complete reeling when hook reaches player', () => {
      player.hookX = player.x + 5;
      player.hookY = player.y + 5;
      
      player.startReeling();
      player.update(16.67);
      
      expect(player.isReeling).toBe(false);
      expect(player.isCasting).toBe(false);
    });
  });

  describe('Fish Catching', () => {
    let mockFish;

    beforeEach(() => {
      mockFish = createMockFish(player.hookX + 10, player.hookY + 10);
      player.cast(5, Math.PI / 2);
    });

    it('should detect collision with fish', () => {
      mockFish.checkCollision.mockReturnValue(true);
      
      const collision = player.checkFishCollision(mockFish);
      
      expect(collision).toBe(true);
      expect(mockFish.checkCollision).toHaveBeenCalledWith({
        x: player.hookX - player.hookSize / 2,
        y: player.hookY - player.hookSize / 2,
        width: player.hookSize,
        height: player.hookSize
      });
    });

    it('should catch fish when collision occurs', () => {
      mockFish.checkCollision.mockReturnValue(true);
      
      player.catchFish(mockFish);
      
      expect(mockFish.catch).toHaveBeenCalled();
      expect(player.caughtFish).toContain(mockFish);
      expect(player.fishesCaught).toBe(1);
    });

    it('should update score when fish is caught', () => {
      mockFish.getScore.mockReturnValue(25);
      mockFish.checkCollision.mockReturnValue(true);
      
      player.catchFish(mockFish);
      
      expect(player.totalScore).toBe(25);
    });

    it('should handle multiple fish catches', () => {
      const fish1 = createMockFish();
      const fish2 = createMockFish();
      fish1.getScore.mockReturnValue(10);
      fish2.getScore.mockReturnValue(15);
      fish1.checkCollision.mockReturnValue(true);
      fish2.checkCollision.mockReturnValue(true);
      
      player.catchFish(fish1);
      player.catchFish(fish2);
      
      expect(player.caughtFish).toHaveLength(2);
      expect(player.totalScore).toBe(25);
      expect(player.fishesCaught).toBe(2);
    });

    it('should handle fish escape during reeling', () => {
      mockFish.checkCollision.mockReturnValue(true);
      player.catchFish(mockFish);
      
      const escapeChance = 0.1; // 10% chance
      player.handleFishEscape(mockFish, escapeChance);
      
      if (player.caughtFish.length === 0) {
        expect(mockFish.escape).toHaveBeenCalled();
      }
    });

    it('should prevent catching the same fish twice', () => {
      mockFish.checkCollision.mockReturnValue(true);
      
      player.catchFish(mockFish);
      player.catchFish(mockFish); // Try to catch again
      
      expect(player.caughtFish).toHaveLength(1);
      expect(player.fishesCaught).toBe(1);
    });
  });

  describe('Line and Hook Visualization', () => {
    it('should render fishing line from player to hook', () => {
      player.hookX = player.x + 100;
      player.hookY = player.y + 150;
      
      player.render(mockCanvas2D);
      
      expect(mockCanvas2D.beginPath).toHaveBeenCalled();
      expect(mockCanvas2D.moveTo).toHaveBeenCalledWith(player.x, player.y);
      expect(mockCanvas2D.lineTo).toHaveBeenCalledWith(player.hookX, player.hookY);
      expect(mockCanvas2D.stroke).toHaveBeenCalled();
    });

    it('should render hook at correct position', () => {
      player.hookX = 250;
      player.hookY = 300;
      
      player.render(mockCanvas2D);
      
      expect(mockCanvas2D.fillRect).toHaveBeenCalledWith(
        player.hookX - player.hookSize / 2,
        player.hookY - player.hookSize / 2,
        player.hookSize,
        player.hookSize
      );
    });

    it('should change line color based on tension', () => {
      player.lineTension = 0.8; // High tension
      
      player.render(mockCanvas2D);
      
      expect(mockCanvas2D.strokeStyle).toContain('red'); // High tension = red
    });

    it('should not render line when not casting', () => {
      player.isCasting = false;
      player.isReeling = false;
      
      player.render(mockCanvas2D);
      
      expect(mockCanvas2D.moveTo).not.toHaveBeenCalled();
    });

    it('should render underwater effects', () => {
      player.hookY = player.waterLevel + 50; // Underwater
      
      player.render(mockCanvas2D);
      
      // Should apply underwater visual effects
      expect(mockCanvas2D.save).toHaveBeenCalled();
      expect(mockCanvas2D.restore).toHaveBeenCalled();
    });
  });

  describe('Game Mechanics Integration', () => {
    it('should track fishing statistics', () => {
      const stats = player.getStatistics();
      
      expect(stats).toHaveProperty('totalScore');
      expect(stats).toHaveProperty('fishesCaught');
      expect(stats).toHaveProperty('castCount');
      expect(stats).toHaveProperty('accuracy');
      expect(stats).toHaveProperty('averageScore');
    });

    it('should calculate fishing accuracy', () => {
      player.castCount = 10;
      player.fishesCaught = 7;
      
      const stats = player.getStatistics();
      
      expect(stats.accuracy).toBeCloseTo(70, 1);
    });

    it('should handle power-up effects', () => {
      const powerUp = {
        type: 'stronger_line',
        duration: 5000,
        effect: { maxLineLength: player.maxLineLength * 1.5 }
      };
      
      player.applyPowerUp(powerUp);
      
      expect(player.maxLineLength).toBeGreaterThan(300);
      expect(player.activePowerUps).toContain(powerUp);
    });

    it('should expire power-ups after duration', () => {
      const powerUp = {
        type: 'faster_reeling',
        duration: 100,
        effect: { reelingSpeed: player.reelingSpeed * 2 }
      };
      
      player.applyPowerUp(powerUp);
      
      // Fast forward time
      player.update(150);
      
      expect(player.activePowerUps).not.toContain(powerUp);
      expect(player.reelingSpeed).toBe(3); // Back to default
    });

    it('should reset fishing state', () => {
      player.cast(5, 0);
      player.catchFish(createMockFish());
      
      player.reset();
      
      expect(player.isCasting).toBe(false);
      expect(player.isReeling).toBe(false);
      expect(player.caughtFish).toEqual([]);
      expect(player.hookX).toBe(player.x);
      expect(player.hookY).toBe(player.y);
    });
  });

  describe('Mobile Touch Controls Integration', () => {
    it('should handle touch casting gesture', () => {
      const startTouch = { x: player.x, y: player.y };
      const endTouch = { x: player.x + 100, y: player.y + 100 };
      
      player.handleTouchCast(startTouch, endTouch);
      
      expect(player.isCasting).toBe(true);
      expect(player.castingPower).toBeGreaterThan(0);
      expect(player.castingAngle).toBeGreaterThan(0);
    });

    it('should calculate casting power from touch distance', () => {
      const startTouch = { x: 100, y: 100 };
      const endTouch = { x: 200, y: 100 }; // 100px distance
      
      player.handleTouchCast(startTouch, endTouch);
      
      const expectedPower = Math.min(100 / 20, player.maxCastingPower); // Scale factor
      expect(player.castingPower).toBeCloseTo(expectedPower, 1);
    });

    it('should calculate casting angle from touch direction', () => {
      const startTouch = { x: 100, y: 100 };
      const endTouch = { x: 200, y: 200 }; // 45-degree angle
      
      player.handleTouchCast(startTouch, endTouch);
      
      expect(player.castingAngle).toBeCloseTo(Math.PI / 4, 2);
    });

    it('should handle touch reeling', () => {
      player.cast(5, Math.PI / 2);
      
      player.handleTouchReel();
      
      expect(player.isReeling).toBe(true);
    });
  });

  describe('Performance Optimizations', () => {
    it('should implement efficient collision detection', () => {
      const fishes = Array.from({ length: 100 }, (_, i) => 
        createMockFish(i * 10, i * 10)
      );
      
      const startTime = performance.now();
      
      fishes.forEach(fish => player.checkFishCollision(fish));
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(10); // Should be very fast
    });

    it('should update only when necessary', () => {
      const updateSpy = jest.spyOn(player, '_updateHookPhysics');
      
      // Not casting or reeling
      player.isCasting = false;
      player.isReeling = false;
      
      player.update(16.67);
      
      expect(updateSpy).not.toHaveBeenCalled();
      
      updateSpy.mockRestore();
    });

    it('should handle viewport culling for rendering', () => {
      const viewport = { x: 0, y: 0, width: 800, height: 600 };
      
      // Hook outside viewport
      player.hookX = -100;
      player.hookY = -100;
      
      const shouldRender = player.isHookInViewport(viewport);
      
      expect(shouldRender).toBe(false);
    });
  });

  describe('Advanced Fishing Features', () => {
    it('should support different hook types', () => {
      player.setHookType('golden_hook');
      
      expect(player.hookType).toBe('golden_hook');
      expect(player.hookEffectiveness).toBeGreaterThan(1); // Better catch rate
    });

    it('should handle different fishing environments', () => {
      player.setEnvironment('deep_water');
      
      expect(player.environment).toBe('deep_water');
      expect(player.waterResistance).toBeGreaterThan(0.5); // Higher resistance
    });

    it('should implement skill-based mechanics', () => {
      const skill = player.calculateSkill();
      
      expect(skill).toBeGreaterThanOrEqual(0);
      expect(skill).toBeLessThanOrEqual(100);
    });

    it('should handle weather effects', () => {
      player.setWeather('windy');
      
      expect(player.weather).toBe('windy');
      // Wind should affect casting
      const originalCast = player.cast.bind(player);
      player.cast(5, 0);
      
      // Casting should be affected by wind
      expect(player.castingAngle).not.toBe(0);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup resources on destroy', () => {
      const mockFish = createMockFish();
      player.catchFish(mockFish);
      
      player.destroy();
      
      expect(player.caughtFish).toEqual([]);
      expect(player.activePowerUps).toEqual([]);
      expect(player.destroyed).toBe(true);
    });

    it('should prevent operations after destruction', () => {
      player.destroy();
      
      expect(() => player.cast(5, 0)).not.toThrow();
      expect(() => player.update(16.67)).not.toThrow();
      expect(player.isCasting).toBe(false);
    });

    it('should release event listeners', () => {
      const callback = jest.fn();
      player.on('fishCaught', callback);
      
      player.destroy();
      player.emit('fishCaught');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
}); 