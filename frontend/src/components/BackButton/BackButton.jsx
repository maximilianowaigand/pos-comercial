import { useNavigate } from "react-router-dom";

export default function BackButton({ to = "/" , label = "⬅ Volver" }) {
  const navigate = useNavigate();

  return (
    <button onClick={() => navigate(to)}>
      {label}
    </button>
  );
}