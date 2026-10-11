import { useNavigate } from "react-router-dom";
import { AuthForm } from "../features/auth/AuthForm";
import { useAuth } from "../features/auth/AuthProvider";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  return (
    <AuthForm
      title="Login"
      submitLabel="Sign in"
      onSubmit={async (email, password) => {
        await login(email, password);
        navigate("/");
      }}
    />
  );
}
