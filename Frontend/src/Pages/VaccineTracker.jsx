import React from 'react';
import './VaccineTracker.css';
import DarkVeil from "../Components/Backgrounds/DarkVeil"
export default function VaccineTracker() {
    return (
        <div className="reminder-container page">
            <DarkVeil
                hueShift={0}
                noiseIntensity={0}
                scanlineIntensity={0}
                speed={1}
                scanlineFrequency={0}
                warpAmount={0}
            />
            <div className='content'>
                <h1>VaccineTRACKER</h1>
            </div>
            
        </div>
    );
}
