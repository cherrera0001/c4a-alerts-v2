import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await login(email, password, twoFactorCode);
      
      // Si el resultado indica que se requiere 2FA
      if (result && result.requires2FA) {
        setRequires2FA(true);
        setUserId(result.userId);
        toast.info("Ingresa tu código de autenticación de dos factores");
      } else {
        toast.success("Inicio de sesión exitoso");
        navigate("/dashboard");
      }
    } catch (error) {
      // Verificar si es error de 2FA requerido
      if (error.code === "2FA_REQUIRED" || (error.response && error.response.data && error.response.data.requires2FA)) {
        setRequires2FA(true);
        setUserId(error.response?.data?.userId || error.userId);
        toast.info("Ingresa tu código de autenticación de dos factores");
      } else if (error.name === "ConnectionError") {
        toast.error(
          error.message || "El servidor no está disponible. Por favor, verifica que el backend esté corriendo.",
          { duration: 5000 }
        );
      } else {
        toast.error(error.message || "Error al iniciar sesión. Por favor, verifica tus credenciales.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md p-8 bg-slate-900 rounded-2xl border border-slate-800">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">
            C4A <span className="text-emerald-400">Alerts</span>
          </h1>
          <p className="text-sm text-slate-400">
            Inicia sesión para acceder al panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-300 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="tu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-300 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required={!requires2FA}
              autoComplete="current-password"
              disabled={requires2FA}
              className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="••••••••"
            />
          </div>

          {requires2FA && (
            <div>
              <label htmlFor="twoFactorCode" className="block text-sm font-medium text-slate-300 mb-2">
                Código de autenticación (2FA)
              </label>
              <input
                id="twoFactorCode"
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                required
                autoComplete="one-time-code"
                inputMode="numeric"
                maxLength={6}
                className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="000000"
              />
              <p className="mt-2 text-xs text-slate-400">
                Ingresa el código de 6 dígitos de tu aplicación de autenticación
              </p>
            </div>
          )}

          {requires2FA && (
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorCode("");
                setUserId(null);
              }}
              className="w-full py-2 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm"
            >
              Volver
            </button>
          )}

          <button
            type="submit"
            disabled={loading || (requires2FA && twoFactorCode.length !== 6)}
            className="w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {loading 
              ? (requires2FA ? "Verificando código..." : "Iniciando sesión...") 
              : (requires2FA ? "Verificar código" : "Iniciar sesión")}
          </button>
        </form>
      </div>
    </div>
  );
}

