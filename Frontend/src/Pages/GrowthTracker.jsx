import React from 'react';
import './GrowthTracker.css';
import DarkVeil from "../Components/Backgrounds/DarkVeil"
export default function GrowthTracker() {
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
                <h1>GrowthTracker</h1>
            </div>
            
        </div>
    );
}
