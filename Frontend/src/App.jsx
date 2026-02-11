import { Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import Care from './Pages/Care';
import Reminder from './Pages/Reminder';
import Kids from './Pages/Kids';
import HealthLocker from './Pages/HealthLocker';

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/Care" element={<Care />} />
        <Route path="/Reminder" element={<Reminder />} />
        <Route path="/kids" element={<Kids />} />
        <Route path="/hl" element={<HealthLocker />} />
      </Routes>
    </>
  );
}

export default App;
