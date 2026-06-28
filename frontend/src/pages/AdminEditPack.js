import { useState, useRef, useEffect } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Save, ImageIcon, Package } from "lucide-react";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function AdminEditPack() {
  const { packId } = useParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("29.99");
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const coverInputRef = useRef(null);
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

    async function fetchPack() {
      try {
        const response = await axios.get(`${API}/packs/${packId}`);
        const pack = response.data;
        setTitle(pack.title);
        setDescription(pack.description || "");
        setPrice(String(pack.price));
        
        if (pack.cover_url) {
          setCoverPreview(pack.cover_url);
        } else if (pack.cover_path) {
          setCoverPreview(`${API}/files/${pack.cover_path}`);
        }
      } catch (error) {
        toast.error("Pack non trovato");
        navigate("/admin");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPack();
  }, [packId, navigate]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", description);
      formData.append("price", price);
      
      if (coverFile) {
        formData.append("cover", coverFile);
      }

      await axios.put(`${API}/packs/${packId}`, formData, {
        headers: {
          ...getAuthHeaders(),
          "Content-Type": "multipart/form-data"
        }
      });

      toast.success("Pack aggiornato!");
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
    <div className="min-h-screen bg-black" data-testid="admin-edit-pack-page">
      <header className="flex items-center gap-4 px-8 py-6 border-b border-white/10">
        <Link to="/admin" className="p-2 text-white/50 hover:text-white">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
            <Package className="h-5 w-5 text-red-500" />
            Modifica Pack
          </h1>
          <p className="text-sm text-white/50">Aggiorna i dettagli del pack</p>
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

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70">Descrizione / Contenuti</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="es. 50+ Drums, 30+ Melody Loops..."
              rows={4}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-white/30 resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price" className="text-white/70">Prezzo (€)</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
              className="bg-white/5 border-white/10 text-white focus:border-white/30"
            />
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

          <div className="flex gap-4 pt-4">
            <Link to="/admin" className="flex-1">
              <Button type="button" variant="outline" className="w-full bg-transparent border-white/20 text-white hover:bg-white/10">
                Annulla
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isSaving}
              className="flex-1 gap-2 bg-red-500 text-white hover:bg-red-600 rounded-full"
            >
              {isSaving ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
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
