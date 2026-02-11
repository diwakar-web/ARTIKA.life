import React from 'react';
import './HealthLocker.css';
import DotGrid from "../Components/Backgrounds/DotGrid"
export default function HealthLocker() {
    return (
        <div className="healthlocker-container, page">
            <DotGrid
                dotSize={7}
                gap={15}
                baseColor="#271E37"
                activeColor="#5227FF"
                proximity={120}
                shockRadius={250}
                shockStrength={5}
                resistance={750}
                returnDuration={1.5}
            />
            <div className='content'>
                <h1>Health Locker Page</h1>
            </div>

        </div>
    );
}
