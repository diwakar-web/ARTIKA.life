import "./MediBot.css";
import Prism from "../Components/Backgrounds/Prism"
export default function MediBot() {
    return (
        <div className="care-container page">
            <Prism
                animationType="rotate"
                timeScale={0.5}
                height={2.5}
                baseWidth={5.5}
                scale={2.5}
                hueShift={0}
                colorFrequency={1}
                noise={0}
                glow={0.5}
            />
            <div className="content">
                <h1>MEDIBOT</h1>
            </div>
        </div>
    );
}