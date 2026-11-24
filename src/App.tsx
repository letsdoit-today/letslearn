import type { ComponentType } from 'react';
import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FallingBall from './demos/FallingBall';
import FrictionInclinedPlane from './demos/FrictionInclinedPlane';
import AirWaterRefraction from './demos/AirWaterRefraction';
import ConvexLensSim from './demos/ConvexLensSim';
import ConcaveLensSim from './demos/ConcaveLensSim';
import EyeSim from './demos/EyeSim';
import LeverBalance from './demos/LeverBalance';
import PendulumOscillation from './demos/PendulumOscillation';
import Demos from './lib/Meta';

const demoComponents: Record<string, ComponentType> = {
  'falling-ball': FallingBall,
  'friction-inclined-plane': FrictionInclinedPlane,
  'air-water-refraction': AirWaterRefraction,
  'convex-lens': ConvexLensSim,
  'concave-lens': ConcaveLensSim,
  'eye-simulation': EyeSim,
  'lever-balance': LeverBalance,
  'pendulum-oscillation': PendulumOscillation,
};

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        {Demos.map((demo) => {
          const Component = demoComponents[demo.slug];
          return Component ? (
            <Route key={demo.slug} path={demo.path} element={<Component />} />
          ) : null;
        })}
      </Routes>
    </Layout>
  );
}

export default App;