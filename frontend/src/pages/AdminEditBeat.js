import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save, ImageIcon, Music, X } from "lucide-react";

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

export default function AdminEditBeat() {
  const { beatId } = useParams();
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
  const [currentAudio, setCurrentAudio] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
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
      return;
    }

    async function fetchBeat() {
      try {
        const response = await axios.get(`${API}/beats/${beatId}`);
        const beat = response.data;
        setTitle(beat.title);
        setBpm(beat.bpm || "140");
        setMusicalKey(beat.key || "C Minor");
        setPriceMp3(String(beat.price_mp3));
        setPriceWav(String(beat.price_wav));
        setPriceStems(String(beat.price_stems));
        
        if (beat.cover_url) {
          setCoverPreview(beat.cover_url);
        } else if (beat.cover_path) {
          setCoverPreview(`${API}/files/${beat.cover_path}`);
        }
        
        if (beat.audio_path) {
          setCurrentAudio(beat.audio_path);
        }
      } catch (error) {
        toast.error("Beat non trovato");
        navigate("/admin");
      } finally {
        setIsLoading(false);
      }
    }

    fetchBeat();
  }, [beatId, navigate]);

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
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("bpm", bpm);
      formData.append("key", musicalKey);
      formData.append("price_mp3", priceMp3);
      formData.append("price_wav", priceWav);
      formData.append("price_stems", priceStems);
      
      if (coverFile) {
        formData.append("cover", coverFile);
      }
      if (audioFile) {
        formData.append("audio", audioFile);
      }
      if (untaggedFile) {
        formData.append("audio_untagged", untaggedFile);
      }

      await axios.put(`${API}/beats/${beatId}`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Beat aggiornato!");
      navigate("/admin");
    } catch (error) {
      const message = error.response?.data?.detail || "Errore nel salvataggio";
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black" data-testid="admin-edit-beat-page">
      <header className="flex items-center gap-4 px-8 py-6 border-b border-white/10">
        <Link to="/admin" className="p-2 text-white/50 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Music className="h-5 w-5 text-white" />
            Modifica Beat
          </h1>
          <p className="text-sm text-white/50">Aggiorna i dettagli del beat</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-8 py-12">
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/70">Titolo</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white focus:border-white/30"
            />
          </div>

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
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Tonalità</Label>
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

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-white/70">MP3 (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceMp3}
                onChange={(e) => setPriceMp3(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">WAV (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceWav}
                onChange={(e) => setPriceWav(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/70">Stems (€)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={priceStems}
                onChange={(e) => setPriceStems(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white focus:border-white/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Cover Art</Label>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              className="hidden"
            />
            
            {coverPreview ? (
              <div className="relative w-48 h-48 rounded-xl overflow-hidden">
                <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                >
                  <span className="text-white text-sm">Cambia immagine</span>
                </button>
              </div>
            ) : (
              <Card
                onClick={() => coverInputRef.current?.click()}
                className="border-dashed border-2 border-white/20 bg-transparent cursor-pointer hover:border-white/40"
              >
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <ImageIcon className="h-10 w-10 text-white/30 mb-3" />
                  <p className="text-sm text-white/50">Clicca per caricare</p>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Audio Anteprima — CON TAG (pubblico)</Label>
            <input
              ref={audioInputRef}
              type="file"
              accept="audio/*"
              onChange={handleAudioChange}
              className="hidden"
            />
            
            <Card className="bg-white/5 border-white/10">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-white/50" />
                  <span className="text-sm text-white">
                    {audioFile ? audioFile.name : currentAudio ? "Audio attuale" : "Nessun audio"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                  className="bg-transparent border-white/20 text-white hover:bg-white/10"
                >
                  Cambia
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-2">
            <Label className="text-white/70">Audio Completo — SENZA TAG (a pagamento)</Label>
            <p className="text-xs text-white/40">Consegnato al cliente solo dopo la conferma del pagamento. Carica/Sostituisci se necessario.</p>
            <input
              ref={untaggedInputRef}
              type="file"
              accept="audio/*"
              onChange={handleUntaggedChange}
              className="hidden"
            />

            <Card className="bg-white/5 border-white/10">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Music className="h-5 w-5 text-emerald-400" />
                  <span className="text-sm text-white">
                    {untaggedFile ? untaggedFile.name : "Versione senza tag"}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => untaggedInputRef.current?.click()}
                  className="bg-transparent border-emerald-500/30 text-white hover:bg-emerald-500/10"
                >
                  Carica
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="flex gap-4 pt-4">
            <Link to="/admin" className="flex-1">
              <Button type="button" variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10">
                Annulla
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 gap-2 bg-white text-black hover:bg-white/90 rounded-full"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Salva Modifiche
                </>
              )}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
