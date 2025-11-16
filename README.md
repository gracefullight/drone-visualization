# Drone RF Visualization

[![Deploy](https://github.com/gracefullight/drone-visualization/actions/workflows/deploy.yml/badge.svg)](https://github.com/gracefullight/drone-visualization/actions/workflows/deploy.yml)

Interactive 3D visualization of RF (Radio Frequency) signal measurements across high-rise buildings using drone-collected data simulation.

🔗 **Live Demo**: [https://gracefullight.github.io/drone-visualization/](https://gracefullight.github.io/drone-visualization/)

## Features

- **3D City Visualization**: High-rise and low-rise building models with realistic dimensions
- **RF Signal Mapping**: Simulated RF measurement points (RSSI, CQI, RSRP, RSRQ, SNR) across building facades
- **Interactive Controls**: Toggle between different RF metrics and visualizations
- **Real-time Rendering**: Powered by Three.js and React Three Fiber with bloom effects
- **Static Export**: Fully client-side generation for GitHub Pages deployment

## Tech Stack

- **Framework**: Next.js 16 (Static Export)
- **3D Rendering**: Three.js, React Three Fiber, Drei
- **UI**: Tailwind CSS 4, Radix UI, shadcn/ui
- **Styling**: Biome (Linting & Formatting)
- **Deployment**: GitHub Actions → GitHub Pages

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 9+ (recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/gracefullight/drone-visualization.git
cd drone-visualization

# Install dependencies
pnpm install
```

### Development

```bash
# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build

```bash
# Build static export for production
pnpm build

# Preview production build locally
pnpm start
```

### Code Quality

```bash
# Lint with Biome
pnpm lint

# Format with Biome
pnpm format
```

## Project Structure

```plaintext
src/
├── app/                    # Next.js app router
│   ├── layout.tsx          # Root layout
│   └── page.tsx            # Home page (main scene)
├── components/             # React components
│   ├── Building.tsx        # 3D building component
│   ├── Scene.tsx           # Main 3D scene
│   ├── SignalBlobs.tsx     # Volumetric signal visualization
│   ├── SignalPoints.tsx    # Point cloud RF data
│   ├── MetricControls.tsx  # UI controls for metrics
│   └── ui/                 # shadcn/ui components
├── lib/
│   ├── api/                # Data fetching abstraction
│   ├── constants/          # RF metrics constants & utilities
│   └── generators/         # City layout & RF data generators
└── types/                  # TypeScript type definitions
```

## RF Metrics

The simulation generates realistic RF signal values based on height and position:

- **RSSI** (Received Signal Strength Indicator): -120 to -40 dBm
- **CQI** (Channel Quality Indicator): 0 to 15
- **RSRP** (Reference Signal Received Power): -140 to -44 dBm
- **RSRQ** (Reference Signal Received Quality): -20 to -3 dB
- **SNR** (Signal-to-Noise Ratio): -10 to 30 dB

## Deployment

Automatically deployed to GitHub Pages via GitHub Actions on every push to `main`.

The workflow:

1. Installs dependencies with pnpm
2. Builds static export with `output: "export"`
3. Uploads `out/` directory to GitHub Pages
4. Deploys via `actions/deploy-pages@v4`

## License

MIT
