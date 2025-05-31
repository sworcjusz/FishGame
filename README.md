# Tiny Fish Catch - Mobile-First HTML5 Canvas Game

A performant, mobile-first fishing game built with vanilla JavaScript and HTML5 Canvas for integration with WooCommerce/WordPress websites.

## 🎯 Project Overview

**Target:** Fish store website "Ryby u Tadeusza"  
**Primary Users:** Mobile phone users (80%+ traffic expected)  
**Integration:** WordPress/WooCommerce shortcode system  
**Performance Target:** <50KB total, 60fps on mobile, <3s load time

## 🚀 Features

- **Mobile-First Design** - Optimized for touch controls and mobile devices
- **High Performance** - 60fps gameplay on low-end mobile devices
- **WordPress Integration** - Easy shortcode integration `[tiny_fish_catch]`
- **Offline Support** - Service Worker for caching and offline play
- **Accessibility** - Screen reader support and keyboard navigation
- **Test-Driven Development** - Comprehensive test coverage

## 🛠️ Technology Stack

- **Vanilla JavaScript (ES6+)** - No frameworks for maximum performance
- **HTML5 Canvas** - Game rendering
- **CSS3** - Mobile-first responsive design
- **Service Worker** - Offline capability and caching
- **Jest** - Unit testing
- **Puppeteer** - E2E testing and mobile simulation

## 📱 Mobile Optimization

- Touch-optimized controls with 44px minimum touch targets
- One-handed gameplay support
- Portrait and landscape orientation support
- Efficient canvas rendering with object pooling
- Lazy loading and WebP image optimization

## 🎮 Game Mechanics

- Simple tap-to-cast fishing mechanics
- Drag controls for hook movement
- Progressive difficulty with different fish types
- Score tracking and leaderboards
- Sound effects with audio fallbacks

## 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/[username]/FishGame.git
cd FishGame

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## 📁 Project Structure

```
fish-game/
├── src/
│   ├── game/              # Core game classes
│   ├── utils/             # Utility functions
│   ├── ui/                # User interface components
│   └── integration/       # WordPress/WooCommerce integration
├── tests/                 # Test files
├── assets/               # Game assets (images, sounds)
└── dist/                 # Built files for production
```

## 🧪 Testing

- **Unit Tests:** Jest for component testing
- **E2E Tests:** Puppeteer for full game flow testing
- **Performance Tests:** Lighthouse CI integration
- **Mobile Testing:** Device simulation and real device testing

## 📊 Performance Targets

- First Contentful Paint: <1.5s
- Time to Interactive: <3s
- Cumulative Layout Shift: <0.1
- Frame rate: 60fps on mobile
- Bundle size: <50KB total

## 🌐 Browser Support

- **Primary:** Chrome/Safari Mobile (iOS 12+, Android 8+)
- **Secondary:** Desktop Chrome, Firefox, Safari, Edge
- **Fallback:** Graceful degradation for older browsers

## 🔌 WordPress Integration

```php
// Use shortcode in posts/pages
[tiny_fish_catch]

// Or in PHP templates
<?php echo do_shortcode('[tiny_fish_catch]'); ?>
```

## 📄 License

[License details to be added]

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Implement the feature
5. Run tests and ensure they pass
6. Submit a pull request

## 📞 Support

For support and questions, please open an issue on GitHub. 