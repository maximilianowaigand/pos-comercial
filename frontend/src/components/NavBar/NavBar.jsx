import { NavLink } from "react-router-dom";
import styles from "./NavBar.module.css";

const links = [
  { to: "/", label: "POS" },
  { to: "/dashboard", label: "Dashboard" },
  { to: "/historial", label: "Historial" },
  { to: "/crear-producto", label: "Crear producto" },
];

export default function NavBar() {
  return (
    <header className={styles.navbar}>
      <div className={styles.brand}>
        <span className={styles.title}>POS Panaderia</span>
        <span className={styles.subtitle}>Gestion de ventas y caja</span>
      </div>

      <nav className={styles.navigation}>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === "/"}
            className={({ isActive }) =>
              `${styles.link} ${isActive ? styles.active : ""}`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
