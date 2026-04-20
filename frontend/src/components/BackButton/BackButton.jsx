import { useNavigate } from "react-router-dom";
import styles from "./BackButton.module.css";

export default function BackButton({
  to,
  label = "Volver",
  className = "",
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
      return;
    }

    if (window.history.length > 1) {
      navigate(-1);
      return;
    }

    navigate("/");
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${styles.button} ${className}`.trim()}
    >
      <span className={styles.icon} aria-hidden="true">
        ←
      </span>
      <span>{label}</span>
    </button>
  );
}
