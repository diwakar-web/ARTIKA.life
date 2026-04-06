import React from 'react';
import './Home.css';
import Aurora from "../Components/Backgrounds/Aurora"
import Header from "../Components/FixedComponents/Header"
import Footer from "../Components/FixedComponents/Footer"
import CardSwap, { Card } from '../Components/FixedComponents/CardSwap';
import SplitText from '../Components/FixedComponents/SplitText';
import CurvedLoop from '../Components/FixedComponents/CurvedLoop';
import ScrollReveal from '../Components/FixedComponents/ScrollReveal';
import ScrollVelocity from '../Components/FixedComponents/ScrollVelocity';
import ChromaGrid from '../Components/FixedComponents/ChromaGrid';
import { useNavigate } from 'react-router-dom';
import diwakar from "../assets/diwakar.png"
import dhruv from "../assets/dhruv.png"
import kavya from "../assets/kavya.png"
import CircularGallery from '../Components/FixedComponents/CircilarGallery';
import TextPressure from '../Components/FixedComponents/TextPressure';

export default function Home() {
    const navigate = useNavigate();
    const handleAnimationComplete = () => {
        console.log('All letters have animated!');
    };

    const handleGetStarted = () => {
        const user = localStorage.getItem("user");
        if (user) {
            navigate("/user");
        } else {
            navigate("/login");
        }
    };
    
    const items = [
        {
            image: diwakar,
            title: "Diwakar Nagar",
            subtitle: "MERN Developer",
            handle: "@diwakar_nagar01",
            borderColor: "#3B82F6",
            gradient: "linear-gradient(145deg, #3B82F6, #000)",
            url: "https://github.com/diwakar-web"
        },
        {
            image: dhruv,
            title: "Dhruv Rai",
            subtitle: "Backend Engineer",
            handle: "@dhruv_rai",
            borderColor: "#10B981",
            gradient: "linear-gradient(180deg, #10B981, #000)",
            url: "https://www.linkedin.com/in/dhruv-rai-2432a421b/"
        },
        {
            image: kavya,
            title: "Kavya Nagotra",
            subtitle: "Data Analyst",
            handle: "@kavya_nagotra",
            borderColor: "#f63b5aff",
            gradient: "linear-gradient(145deg, #f63b64ff, #000)",
            url: "https://www.linkedin.com/in/kavya-nagotra-88a04528b?utm_source=share_via&utm_content=profile&utm_medium=member_android"
        }
    ];

    return (
        <div className="home-containerpage">
            <Aurora
                colorStops={["#7cff67", "#B19EEF", "#5227FF"]}
                blend={0.25}
                amplitude={1.0}
                speed={1}
            />
            <div className="content">
                <Header />
                <div className='main_section'>
                    <div className='sec1 sec'>

                        <div className='Written'>
                            <p className='para'>
                                AI-POWERED FAMILY HEALTH & CARE PLATFORM
                            </p>
                            <h1 className='Heading'>
                                <SplitText
                                    text="One Platform for
                                Smarter Everyday
                                Health Management"
                                    className="text-2xl font-semibold text-center"
                                    delay={50}
                                    duration={1.25}
                                    ease="power3.out"
                                    splitType="chars"
                                    from={{ opacity: 0, y: 40 }}
                                    to={{ opacity: 1, y: 0 }}
                                    threshold={0.1}
                                    rootMargin="-100px"
                                    textAlign="right"
                                    onLetterAnimationComplete={handleAnimationComplete}
                                    showCallback
                                />
                            </h1>
                        </div>
                        <div className='Buttons'>
                            <button onClick={handleGetStarted}>Get Started</button>
                            <button onClick={() => document.getElementById('features').scrollIntoView({ behavior: 'smooth' })}>
                                Explore Features
                            </button>
                        </div>
                    </div>
                    <div className='sec2 sec'>
                        <CardSwap
                            cardDistance={20}
                            verticalDistance={70}
                            delay={5000}
                            pauseOnHover={false}>
                            <Card>
                                <h3 style={{ fontSize: "2em" }}>💉 Smart Vaccination Tracker</h3>
                                <p>Stay ahead of every immunization milestone with ARTIKA’s intelligent vaccine tracking system. Based on age-specific schedules, it automatically identifies upcoming, due, or missed vaccines and sends timely reminders so nothing slips through. Protect your child with confidence and clarity.
                                    With downloadable vaccination records and simple status indicators, managing preventive care becomes effortless and organized.</p>
                            </Card>
                            <Card>
                                <h3 style={{ fontSize: "2em" }}>📊 Intelligent Growth Monitoring</h3>
                                <p>Monitor your child’s development with real-time insights powered by height, weight, BMI, and age-based growth comparisons. ARTIKA analyzes entered data and provides easy-to-understand feedback using healthy growth ranges.
                                    Track growth velocity, identify trends over time, and stay informed with non-diagnostic yet meaningful indicators designed to support informed parenting.</p>
                            </Card>
                            <Card>
                                <h3 style={{ fontSize: "2em" }}>🧠 MediBot – AI Health Assistant</h3>
                                <p>Get instant guidance for everyday health queries through MediBot, your smart AI-powered assistant. Whether it’s symptoms, wellness tips, or general health information, receive quick and structured responses anytime you need them.
                                    Designed for accessibility and simplicity, MediBot helps reduce confusion while encouraging informed decision-making.</p>
                            </Card>
                            <Card>
                                <h3 style={{ fontSize: "2em" }}>🗂️ Secure Health Locker</h3>
                                <p>Keep all medical records organized in one encrypted digital vault. Upload prescriptions, lab reports, and insurance documents securely and access them whenever required.
                                    With structured categorization and easy retrieval, ARTIKA ensures your important health data is never scattered or misplaced.</p>
                            </Card>
                            <Card>
                                <h3 style={{ fontSize: "2em" }}>🚨 Emergency Mode</h3>
                                <p>Be prepared when every second counts. ARTIKA’s Emergency Mode provides instant access to critical support features and nearby medical assistance.
                                    Quick-response tools and accessible health information help you stay calm and act fast during urgent situations.</p>
                            </Card>
                        </CardSwap>
                    </div>

                </div>
                <div className='Numbers_section'>
                    <CurvedLoop
                        marqueeText="ARTIKA.life ✦ ARTIKA.life ✦ ARTIKA.life ✦ ARTIKA.life ✦ ARTIKA.life ✦"
                        speed={2}
                        curveAmount={200}
                        direction="right"
                        interactive
                        className="custom-text-style"
                    />
                </div>
                <div className='numbers'>
                    <ScrollReveal
                        baseOpacity={0.5}
                        enableBlur
                        baseRotation={3}
                        blurStrength={5}>
                        12300000+ families manage doctors, medicines, child care, and emergencies using multiple disconnected tools, leading to 26,00,000+ missed vaccinations and 1,80,00,000+ missed medicine doses every year.
                        With 5,40,00,000+ smartphone users and 80,00,000+ daily health searches, ARTIKA unifies care into one intelligent platform for family health, prevention, and emergency readiness.
                    </ScrollReveal>
                </div>
                <div className='ribbon'>
                    <ScrollVelocity
                        texts={['ARTIKA.life', 'What We Offer!']}
                        velocity={100}
                        className="custom-scroll-text"
                    />
                </div>

                <div className='features' id='features'>
                    <CircularGallery
                        bend={0}
                        borderRadius={0.05}
                        scrollSpeed={2}
                        scrollEase={0.05}
                    />
                </div>


                <div className='teambehind'>
                    <TextPressure
                        text="The Team Behind!"
                        flex
                        alpha={false}
                        stroke={false}
                        width={70}
                        weight
                        italic
                        textColor="#ffffff"
                        strokeColor="#5227FF"
                        minFontSize={50}
                    />
                </div>
                <div className='team'>
                    <ChromaGrid
                        items={items}
                        radius={300}
                        damping={0.45}
                        fadeOut={0.6}
                        ease="power3.out"
                    />


                </div>
                <div className='line'>

                </div>
                <Footer />
                <div className='cpr'>
                    ©2026 artika.life All rights reserved

                </div>
            </div>
        </div>
    );
}

