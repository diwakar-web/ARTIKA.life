import "./Header.css"
import { Link } from "react-router-dom"

export default function Header() {
    return (
        <div className="Header_container">

            <Link to="/" className="type1 list_item">LOGO</Link>

            <Link to="/" className="type2 list_item">Home</Link>

            <div className="nav_item">
                <div className="type2 list_item">Care</div>

                <div className="mega_menu">
                    <div className="mega_card">

                        <Link to="/mb" style={{textDecoration: "none"}}>
                            <h4>MediBot</h4>
                            <p>Ask health questions in any language. Get instant guidance anytime.</p>
                        </Link>

                        <Link to="/dm" style={{textDecoration: "none"}}>
                            <h4>DocMap</h4>
                            <p>Find the nearest doctor instantly using your location or pin code.</p>
                        </Link>

                    </div>
                </div>
            </div>

            <div className="nav_item">
                <div className="type2 list_item">Reminder</div>

                <div className="mega_menu">
                    <div className="mega_card">

                        <Link to="/add" style={{textDecoration: "none"}}>
                            <h4>Add Members</h4>
                            <p>Add family members to manage their health from one place.</p>
                        </Link>

                        <Link to="/user" style={{textDecoration: "none"}}>
                            <h4>User Dashboard</h4>
                            <p>Track, remind and care for your entire family effortlessly.</p>
                        </Link>

                    </div>
                </div>
            </div>

            <div className="nav_item">
                <div className="type2 list_item">Kids</div>

                <div className="mega_menu">
                    <div className="mega_card">

                        <Link to="/vaccine" style={{textDecoration: "none"}}>
                            <h4>Vaccination Tracker</h4>
                            <p>Never miss a vaccine with smart schedules and reminders.</p>
                        </Link>

                        <Link to="/growth" style={{textDecoration: "none"}}>
                            <h4>Growth Tracker</h4>
                            <p>Track height and weight with smart charts.</p>
                        </Link>

                        <Link to="/mp" style={{textDecoration: "none"}}>
                            <h4>MediPlay</h4>
                            <p>Fun educational games supporting healthy habits.</p>
                        </Link>

                    </div>
                </div>
            </div>

            <Link to="/hl" className="type2 list_item">Health Locker</Link>

            <div className="hamburger">☰</div>

            <Link to="/account" className="type1 list_item">Account</Link>

        </div>
    )
}