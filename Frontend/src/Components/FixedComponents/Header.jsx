import "./Header.css"

export default function Header() {
    return (
        <div className="Header_container">

            <div className="type1 list_item">LOGO</div>

          
            <div className="type2 list_item">Home</div>

            
            <div className="nav_item">
                <div className="type2 list_item">Care</div>

                <div className="mega_menu">
                    <div className="mega_card">
                        <h4>MediBot</h4>
                        <p>Ask health questions in any language. Get instant guidance anytime.</p>

                        <h4>DocMap</h4>
                        <p>Find the nearest doctor instantly using your location or pin code.</p>
                    </div>
                </div>
            </div>

            
            <div className="nav_item">
                <div className="type2 list_item">Reminder</div>

                <div className="mega_menu">
                    <div className="mega_card">
                        <h4>Add Members</h4>
                        <p>Add family members to manage their health from one place.</p>

                        <h4>User Dashboard</h4>
                        <p>Track, remind and care for your entire family effortlessly.</p>
                    </div>
                </div>
            </div>

            
            <div className="nav_item">
                <div className="type2 list_item">Kids</div>

                <div className="mega_menu">
                    <div className="mega_card">
                        <h4>Vaccination Tracker</h4>
                        <p>Never miss a vaccine with smart schedules and reminders.</p>

                        <h4>Growth Tracker</h4>
                        <p>Track height and weight with smart charts.</p>

                        <h4>MediPlay</h4>
                        <p>Fun educational games supporting healthy habits.</p>
                    </div>
                </div>
            </div>

            <div className="type2 list_item">Health Locker</div>
            <div className="hamburger">☰</div>
            <div className="type1 list_item">Account</div>

        </div>
    )
}
