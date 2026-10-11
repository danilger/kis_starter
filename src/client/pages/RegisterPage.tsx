import { useNavigate } from "react-router-dom";
import { AuthForm } from "../features/auth/AuthForm";
import { useAuth } from "../features/auth/AuthProvider";

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Create account"
      submitLabel="Register"
      onSubmit={async (email, password) => {
        await register(email, password);
        navigate("/");
      }}
    />
  );
}
