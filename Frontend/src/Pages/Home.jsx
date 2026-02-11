import React from 'react';
import './Home.css';
import Aurora from "../Components/Backgrounds/Aurora"

export default function Home() {
    return (
        <div className="home-container page">
            <Aurora
                colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
                blend={0.25}
                amplitude={1.0}
                speed={1}
            />
            <div className="content">
                <h1>HOME PAGE</h1>
            </div>

        </div>
    );
}

