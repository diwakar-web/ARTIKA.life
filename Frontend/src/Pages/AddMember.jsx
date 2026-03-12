import React from 'react';
import './AddMember.css';
import Orb from "../Components/Backgrounds/Orb"

export default function AddMember() {
    return (
        <div className="container page">
            <Orb
                hoverIntensity={0.1}
                rotateOnHover
                hue={0}
                forceHoverState={false}
                backgroundColor="#000000"
            />
            <div className='content'>
                <h1>AddMember Page</h1>
            </div>
            
        </div>
    );
}
