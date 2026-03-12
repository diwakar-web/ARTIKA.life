import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import AddMember from './Pages/AddMember';
import DocMap from "./Pages/DocMap"
import MediPlay from './Pages/MediPlay';
import MediBot from "./Pages/MediBot"
import UserDashBoard from './Pages/UserDashBoard';
import VaccineTracker from './Pages/VaccineTracker';
import GrowthTracker from './Pages/GrowthTracker';
import HealthLocker from './Pages/HealthLocker';


function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dm" element={<DocMap />} />
        <Route path="/mb" element={<MediBot />} />
        <Route path="/add" element={<AddMember />} />
        <Route path="/user" element={<UserDashBoard />} />
        <Route path="/vaccine" element={<VaccineTracker />} />
        <Route path="/growth" element={<GrowthTracker />} />
        <Route path="/mp" element={<MediPlay />} />
        <Route path="/hl" element={<HealthLocker />} />
      </Routes>
    </>
  );
}


export default App;
