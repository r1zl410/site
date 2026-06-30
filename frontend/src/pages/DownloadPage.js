import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Download, Music, AlertTriangle, CheckCircle } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function DownloadPage() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchInfo = async () => {
    try {
      const res = await axios.get(`${API}/download/${token}/info`);
      setInfo(res.data);
    } catch (error) {
      setInfo({ valid: false, reason: "not_found" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const res = await axios.get(`${API}/download/${token}`, { responseType: "blob" });

      // Derive filename from Content-Disposition if present
      let filename = "beat";
      const cd = res.headers["content-disposition"];
      if (cd) {
        const match = cd.match(/filename="?([^"]+)"?/);
        if (match) filename = match[1];
      }

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // Refresh remaining downloads
      fetchInfo();
    } catch (error) {
      // Reload info to reflect expired/limit reached
      fetchInfo();
    } finally {
      setIsDownloading(false);
    }
  };

  const reasonMessage = (reason) => {
    switch (reason) {
      case "expired":
        return "Questo link di download e' scaduto.";
      case "limit_reached":
        return "Hai raggiunto il numero massimo di download per questo acquisto.";
      default:
        return "Link di download non valido.";
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4" data-testid="download-page">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="text-2xl font-bold text-white tracking-tighter hover:opacity-70"
            style={{ fontFamily: "Outfit, sans-serif" }}
          >
            r1zl410
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        ) : info?.valid ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-emerald-500/20 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-400" />
                </div>
              </div>
              <h1 className="text-xl font-semibold text-white mb-1">{info.beat_title}</h1>
              <p className="text-sm text-white/50 mb-1">Licenza: {info.license_label}</p>
              <p className="text-xs text-white/40 mb-6">
                Download rimanenti: {info.downloads_left}
              </p>

              <Button
                onClick={handleDownload}
                disabled={isDownloading}
                className="w-full gap-2 bg-white text-black hover:bg-white/90 rounded-full"
                data-testid="download-btn"
              >
                {isDownloading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                    Download in corso...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4" />
                    Scarica il file
                  </>
                )}
              </Button>
              <p className="text-xs text-white/30 mt-4 flex items-center justify-center gap-1">
                <Music className="h-3 w-3" />
                File completo senza tag
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-8 text-center">
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle className="h-7 w-7 text-red-400" />
                </div>
              </div>
              <h1 className="text-lg font-semibold text-white mb-2">Download non disponibile</h1>
              <p className="text-sm text-white/50 mb-6">{reasonMessage(info?.reason)}</p>
              <Link to="/beats">
                <Button
                  variant="outline"
                  className="bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white rounded-full"
                >
                  Torna ai beats
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
