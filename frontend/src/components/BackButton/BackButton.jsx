import { useNavigate } from "react-router-dom";

export default function BackButton({ 
  to, 
  label = "Volver",
  className = "" 
}) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/");
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`
        inline-flex items-center gap-2
        px-4 py-2
        bg-gray-100 hover:bg-gray-200
        text-gray-800 font-medium
        rounded-xl
        shadow-sm hover:shadow-md
        transition-all duration-200
        active:scale-95
        ${className}
      `}
    >
      <span className="text-lg">⬅</span>
      {label}
    </button>
  );
}