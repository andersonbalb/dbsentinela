import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, CheckCircle, Smartphone, Monitor } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPage = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full border-border/50">
        <CardHeader className="text-center">
          <img src="/pwa-192x192.png" alt="DB Sentinela" className="w-20 h-20 mx-auto rounded-2xl mb-4" />
          <CardTitle className="text-2xl text-foreground">Instalar DB Sentinela</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isInstalled ? (
            <div className="text-center space-y-4">
              <CheckCircle className="w-16 h-16 text-primary mx-auto" />
              <p className="text-muted-foreground">App já está instalado!</p>
              <Button onClick={() => navigate("/")} className="w-full">Abrir App</Button>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Smartphone className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Acesse como app nativo direto da tela inicial</p>
                </div>
                <div className="flex items-start gap-3">
                  <Monitor className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Funciona offline com dados em cache</p>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <p className="text-sm text-muted-foreground">Receba notificações de alertas críticos</p>
                </div>
              </div>

              {deferredPrompt ? (
                <Button onClick={handleInstall} className="w-full" size="lg">
                  <Download className="w-4 h-4 mr-2" /> Instalar Agora
                </Button>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    <strong>iOS:</strong> Toque em <em>Compartilhar</em> → <em>Adicionar à Tela Inicial</em>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Android:</strong> Menu do navegador → <em>Instalar app</em>
                  </p>
                </div>
              )}

              <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                Continuar no navegador
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default InstallPage;
