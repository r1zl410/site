import { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, ImageIcon, Music, X } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MUSICAL_KEYS = [
  "C Major", "C Minor", "C# Major", "C# Minor",
  "D Major", "D Minor", "D# Major", "D# Minor",
  "E Major", "E Minor",
  "F Major", "F Minor", "F# Major", "F# Minor",
  "G Major", "G Minor", "G# Major", "G# Minor",
  "A Major", "A Minor", "A# Major", "A# Minor",
  "B Major", "B Minor",
  "Bb Major", "Bb Minor", "Eb Major", "Eb Minor", "Ab Major", "Ab Minor"
];

export default function AdminUpload() {
  const [title, setTitle] = useState("");
  const [bpm, setBpm] = useState("140");
  const [musicalKey, setMusicalKey] = useState("C Minor");
  const [priceMp3, setPriceMp3] = useState("24.99");
  const [priceWav, setPriceWav] = useState("39.99");
  const [priceStems, setPriceStems] = useState("99.99");
  const [coverFile, setCoverFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [untaggedFile, setUntaggedFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  const coverInputRef = useRef(null);
  const audioInputRef = useRef(null);
  const untaggedInputRef = useRef(null);
  const navigate = useNavigate();

  const getAuthHeaders = () => {
    const token = localStorage.getItem("admin_token");
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin/login");
    }
  }, [navigate]);

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setCoverPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAudioChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleUntaggedChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUntaggedFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!coverFile || !audioFile) {
      toast.error("Seleziona sia la cover che il file audio con tag");
      return;
    }
    if (!untaggedFile) {
      toast.error("Carica anche la versione SENZA tag (consegnata dopo il pagamento)");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("bpm", bpm);
      formData.append("key", musicalKey);
      formData.append("price_mp3", priceMp3);
      formData.append("price_wav", priceWav);
      formData.append("price_stems", priceStems);
      formData.append("cover", coverFile);
      formData.append("audio", audioFile);
      formData.append("audio_untagged", untaggedFile);

      await axios.post(`${API}/beats`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Beat caricato con successo!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Errore nel caricamento";
      toast.error(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black" data-testid="admin-upload-page">
      {/* Header */}
      <header className="flex items-center gap-4 px-8 py-6 border-b border-white/10">
        <Link 
          to="/admin" 
          className="p-2 text-white/50 hover:text-white"
          data-testid="back-to-admin-btn"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 
            className="text-xl font-semibold text-white tracking-tight flex items-center gap-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            <Music className="h-5 w-5 text-white" />
            Upload Beat
          </h1>
          <p className="text-sm text-white/50">Aggiungi un nuovo beat al catalogo</p>
        </div>
      </header>

      {/* Form */}
      <main className="max-w-2xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="es. Midnight Dreams"
              required
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30"
              data-testid="beat-title-input"
            />
          </div>

          {/* BPM and Key */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="bpm" className="text-white/70">BPM</Label>
              <Input
                id="bpm"
                type="number"
                min="60"
                max="200"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="beat-bpm-input"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Tonalità (Key)</Label>
              <Select value={musicalKey} onValueChange={setMusicalKey}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-white/10">
                  {MUSICAL_KEYS.map((key) => (
                    <SelectItem key={key} value={key} className="text-white hover:bg-white/10">
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Prices */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price_mp3" className="text-white/70">Prezzo MP3 (€)</Label>
              <Input
                id="price_mp3"
                type="number"
                step="0.01"
                min="0"
                value={priceMp3}
                onChange={(e) => setPriceMp3(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-mp3-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_wav" className="text-white/70">Prezzo WAV (€)</Label>
              <Input
                id="price_wav"
                type="number"
                step="0.01"
                min="0"
                value={priceWav}
                onChange={(e) => setPriceWav(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-wav-input"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_stems" className="text-white/70">Prezzo Stems (€)</Label>
              <Input
                id="price_stems"
                type="number"
                step="0.01"
                min="0"
                value={priceStems}
                onChange={(e) => setPriceStems(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
                data-testid="price-stems-input"
              />
            </div>
          </div>

          {/* Cover Art */}
          <div className="space-y-2">
            <Label className="text-white/70">Cover Art (1:1)</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
              data-testid="cover-file-input"
            />
            
            {coverPreview ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden">
                <img
                  src={coverPreview}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    setCoverFile(null);
                    setCoverPreview(null);
                  }}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80"
                  data-testid="remove-cover-btn"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <Card
                onClick={() => coverInputRef.current?.click()}
                className="border-dashed border-2 border-white/20 bg-transparent cursor-pointer hover:border-white/40"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="h-10 w-10 text-white/30 mb-3" />
                  <p className="text-sm text-white/50">Clicca per caricare la cover</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Audio File (tagged preview) */}
          <div className="space-y-2">
            <Label className="text-white/70">Audio Anteprima — CON TAG (pubblico)</Label>
            <p className="text-xs text-white/40">Questa versione viene riprodotta sul sito da tutti.</p>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
              data-testid="audio-file-input"
            />
            
            {audioFile ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-white/50" />
                    <span className="text-sm text-white truncate max-w-xs">
                      {audioFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAudioFile(null)}
                    className="p-1 text-white/50 hover:text-white"
                    data-testid="remove-audio-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card
                onClick={() => audioInputRef.current?.click()}
                className="border-dashed border-2 border-white/20 bg-transparent cursor-pointer hover:border-white/40"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="h-10 w-10 text-white/30 mb-3" />
                  <p className="text-sm text-white/50">Clicca per caricare l'audio con tag</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Untagged Audio File (paid / delivered after payment) */}
          <div className="space-y-2">
            <Label className="text-white/70">Audio Completo — SENZA TAG (a pagamento)</Label>
            <p className="text-xs text-white/40">Non e' mai pubblico. Consegnato al cliente solo dopo la conferma del pagamento.</p>
            <input
              ref={untaggedInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUntaggedChange}
              className="hidden"
              data-testid="untagged-file-input"
            />

            {untaggedFile ? (
              <Card className="bg-white/5 border-white/10">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Music className="h-5 w-5 text-emerald-400" />
                    <span className="text-sm text-white truncate max-w-xs">
                      {untaggedFile.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUntaggedFile(null)}
                    className="p-1 text-white/50 hover:text-white"
                    data-testid="remove-untagged-btn"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ) : (
              <Card
                onClick={() => untaggedInputRef.current?.click()}
                className="border-dashed border-2 border-emerald-500/30 bg-transparent cursor-pointer hover:border-emerald-500/50"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Music className="h-10 w-10 text-emerald-400/40 mb-3" />
                  <p className="text-sm text-white/50">Clicca per caricare l'audio senza tag</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Link to="/admin" className="flex-1">
              <Button 
                type="button" 
                variant="outline" 
                className="w-full bg-transparent border-white/20 text-white hover:bg-white/10 hover:text-white"
              >
                Annulla
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isUploading || !coverFile || !audioFile || !untaggedFile || !title}
              className="flex-1 gap-2 bg-white text-black hover:bg-white/90 rounded-full"
              data-testid="upload-submit-btn"
            >
              {isUploading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Caricamento...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Carica Beat
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
