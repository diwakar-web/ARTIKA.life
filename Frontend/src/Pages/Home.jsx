import React from 'react';
import './Home.css';
import Aurora from "../Components/Backgrounds/Aurora"
import Header from "../Components/FixedComponents/Header"
import CardSwap, { Card } from '../Components/FixedComponents/CardSwap';

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
                <Header />
                <div className='main_section'>
                    <div className='sec1 sec'>

                        <div className='Written'>
                            <p className='para'>
                                AI-POWERED FAMILY HEALTH & CARE PLATFORM
                            </p>
                            <h1 className='Heading'>
                                One Platform for
                                Smarter Everyday
                                Health Management
                            </h1>
                        </div>
                        <div className='Buttons'>
                            <button>Get Started</button>
                            <button>Explore Features</button>



                        </div>

                    </div>



                    <div className='sec2 sec'>
                        <CardSwap
                            cardDistance={60}
                            verticalDistance={70}
                            delay={5000}
                            pauseOnHover={false}>
                            <Card>
                                <h3>💉 Smart Vaccination Tracker</h3>
                                <p>Stay ahead of every immunization milestone with ARTIKA’s intelligent vaccine tracking system. Based on age-specific schedules, it automatically identifies upcoming, due, or missed vaccines and sends timely reminders so nothing slips through. Protect your child with confidence and clarity.
                                    With downloadable vaccination records and simple status indicators, managing preventive care becomes effortless and organized.</p>
                            </Card>
                            <Card>
                                <h3>📊 Intelligent Growth Monitoring</h3>
                                <p>Monitor your child’s development with real-time insights powered by height, weight, BMI, and age-based growth comparisons. ARTIKA analyzes entered data and provides easy-to-understand feedback using healthy growth ranges. 
                                    Track growth velocity, identify trends over time, and stay informed with non-diagnostic yet meaningful indicators designed to support informed parenting.</p>
                            </Card>
                            <Card>
                                <h3>🧠 MediBot – AI Health Assistant</h3>
                                <p>Get instant guidance for everyday health queries through MediBot, your smart AI-powered assistant. Whether it’s symptoms, wellness tips, or general health information, receive quick and structured responses anytime you need them. 
                                    Designed for accessibility and simplicity, MediBot helps reduce confusion while encouraging informed decision-making.</p>
                            </Card>
                            <Card>
                                <h3>🗂️ Secure Health Locker</h3>
                                <p>Keep all medical records organized in one encrypted digital vault. Upload prescriptions, lab reports, and insurance documents securely and access them whenever required. 
                                    With structured categorization and easy retrieval, ARTIKA ensures your important health data is never scattered or misplaced.</p>
                            </Card>
                            <Card>
                                <h3>🚨 Emergency Mode</h3>
                                <p>Be prepared when every second counts. ARTIKA’s Emergency Mode provides instant access to critical support features and nearby medical assistance. 
                                    Quick-response tools and accessible health information help you stay calm and act fast during urgent situations.</p>
                            </Card>
                        </CardSwap>
                    </div>

                </div>
            </div>

        </div>
    );
}

