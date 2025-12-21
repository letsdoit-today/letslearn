import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import FallingBall from './demos/FallingBall';
import FrictionInclinedPlane from './demos/FrictionInclinedPlane';
import AirWaterRefraction from './demos/AirWaterRefraction';
import ConvexLensSim from './demos/ConvexLensSim';
import ConcaveLensSim from './demos/ConcaveLensSim';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/falling-ball" element={<FallingBall />} />
        <Route path="/friction-inclined-plane" element={<FrictionInclinedPlane />} />
        <Route path="/air-water-refraction" element={<AirWaterRefraction />} />
        <Route path="/convex-lens" element={<ConvexLensSim />} />
        <Route path="/concave-lens" element={<ConcaveLensSim />} />
      </Routes>
    </Layout>
  );
}

export default App;