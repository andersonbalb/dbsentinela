import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Database, Lock, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const LoginPage = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (!ok) setError("Credenciais inválidas. Tente novamente.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Background grid effect */}
      <div className="absolute inset-0 opacity-5" style={{
        backgroundImage: `linear-gradient(hsl(175 80% 50% / 0.1) 1px, transparent 1px), linear-gradient(90deg, hsl(175 80% 50% / 0.1) 1px, transparent 1px)`,
        backgroundSize: '60px 60px'
      }} />

      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="glass rounded-lg p-8 neon-border animate-slide-up">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center mb-4 glow-primary">
              <Database className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold neon-text font-mono">DB Sentinela</h1>
            <p className="text-muted-foreground text-sm mt-1">Database Operations Center</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@empresa.com"
                required
                className="bg-secondary border-border focus:border-primary"
              />
            </div>

            <div>
              <label className="text-sm text-muted-foreground mb-1.5 block">Senha</label>
              <div className="relative">
                <Input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-secondary border-border focus:border-primary pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-destructive text-sm animate-slide-up">{error}</p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 glow-primary font-semibold"
            >
              {loading ? (
                <Lock className="w-4 h-4 animate-spin-slow mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              {loading ? "Autenticando..." : "Acessar Painel"}
            </Button>
          </form>

          <p className="text-center text-muted-foreground text-xs mt-6">
            Use qualquer email e senha (mín. 4 caracteres)
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
